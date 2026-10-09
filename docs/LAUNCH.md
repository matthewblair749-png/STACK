# STACK launch guide

Everything needed to run STACK in production, what only the owner can do, and how to recover when
something breaks. Last checked 2026-10-09 against https://www.stackunder.website.

Related: [app-registration-kit.md](app-registration-kit.md) (per-app OAuth setup),
[google-verification.md](google-verification.md) (Google review pack).

---

## 1. Environment variables

Set in **Vercel > Project > Settings > Environment Variables** (Production). `.env.example` lists them all.
A change takes effect on the next deployment.

### Required

| Variable | What it does | If missing |
| --- | --- | --- |
| `DATABASE_URL` | Postgres (Neon pooled URL). | App can't start. |
| `AUTH_SECRET` | Signs sessions. `openssl rand -base64 32` | Sign-in fails. |
| `ENCRYPTION_KEY` | AES-256-GCM key for stored app tokens. 32 bytes base64. **Never change it** once people have connected apps - existing connections become unreadable. | Connecting apps fails. |
| `APP_URL` | Canonical public URL, `https://www.stackunder.website` (no trailing slash). Used by the sitemap, share cards and Stripe return links. OAuth redirects use the address the request arrived on. | Falls back to the request address. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Shown in the footer, Help and legal pages. | Pages say "use the contact option" instead of an address. |
| At least one sign-in provider | `GOOGLE_*`, `MICROSOFT_*`, `APPLE_*`, or `RESEND_API_KEY` + `EMAIL_FROM`. | Nobody can sign in. |

### Optional (each degrades honestly)

| Variable(s) | Without it |
| --- | --- |
| `RESEND_API_KEY`, `EMAIL_FROM` | No email sign-in. In production it also stays off while `EMAIL_FROM` is a `@resend.dev` address. |
| `ANTHROPIC_API_KEY` (+ `ANTHROPIC_MODEL`, default `claude-sonnet-5-5`; `ANTHROPIC_EFFORT`, default `medium`) | AI falls back to the `LLM_*` provider, then to answers built from synced data only - the UI says which. |
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` (+ `LLM_MAX_TOKENS`, default 8192; `LLM_REASONING_EFFORT`) | No fallback model when Claude is unavailable. Any OpenAI-compatible API, e.g. Gemini: `https://generativelanguage.googleapis.com/v1beta/openai`, `gemini-3.8-flash`. |
| `AI_DAILY_LIMIT` | Default 50 full AI answers per person per rolling 24h. |
| `NEXT_PUBLIC_SENTRY_DSN` | No error monitoring; errors only in Vercel logs. |
| `<APP>_CLIENT_ID` / `<APP>_CLIENT_SECRET` (Slack, GitHub, Linear, Figma, Clio, Notion, Dropbox, Box, GitLab, Jira, Asana, HubSpot, Salesforce, QuickBooks, FreshBooks, Shopify), `TRELLO_API_KEY`, `STRIPE_CONNECT_CLIENT_ID`, `MICROSOFT_*`, `GOOGLE_*` | That app shows "Not available yet", or offers its paste-a-token option where one exists. |
| `QUICKBOOKS_SANDBOX=true` | Talks to real QuickBooks companies (correct for production). |
| `STRIPE_*` | Billing is off; the app runs as free early access with no upgrade prompts. |
| `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL` | Calls use public STUN only; a few people on strict corporate networks may fail to connect. |
| `OAUTH_REDIRECT_BASE_<APP>` | Development only (tunnels). Never set in production. |

---

## 2. Database and migrations

**Rules (learned the hard way on 2026-10-06, when the shared database was wiped):**
- Development must use its **own** database. Never put the production URL in `.env.local`.
- Against production, only ever run `prisma migrate deploy` (applies pending migrations, never resets).
- Never run `prisma migrate dev`, `migrate reset`, `db push`, or anything with `--shadow-database-url`
  pointing at a real database. A shadow database is wiped by design.
- Don't re-run `prisma/seed.mjs` after importing app data: it overwrites catalog rows.

**Deploying a release that includes a migration:**
1. Commit the migration in `prisma/migrations/`.
2. Before pushing, apply it to production. In PowerShell, from the project folder:
   `$env:DATABASE_URL = "<production URL>"; npx prisma migrate deploy`
   (The Prisma CLI doesn't read `.env.local`.)
3. Push. Vercel deploys `main` automatically, and CI runs in parallel.
4. `npx prisma migrate status` should report the database is up to date.

Order matters: code that expects new columns crashes (`P2022`) if it ships before the migration.

**Verified 2026-10-08:** all 13 migrations apply cleanly to an empty Postgres, and the result matches
`schema.prisma` exactly (`prisma migrate diff` reports no difference).

**Fresh database (new environment):** `npx prisma migrate deploy`, then `node prisma/seed.mjs` once to load
the app catalog and professions.

---

## 3. OAuth redirect URIs (production)

Register exactly these. Keep the `http://localhost:3000/...` versions as well if you develop locally.

**Sign-in (Auth.js):**
- Google: `https://www.stackunder.website/api/auth/callback/google`
- Microsoft: `https://www.stackunder.website/api/auth/callback/microsoft-entra-id`
- Apple: `https://www.stackunder.website/api/auth/callback/apple` (Apple needs HTTPS; no localhost)

**App connections** - one per app, all of the form
`https://www.stackunder.website/api/integrations/<app>/callback`:

`google` · `microsoft` · `slack` · `github` · `linear` · `figma` · `clio` · `notion` · `dropbox` · `box` ·
`gitlab` · `jira` · `asana` · `hubspot` · `salesforce` · `quickbooks` · `freshbooks` · `shopify` · `stripe`

Google uses the same OAuth client for sign-in and for the Gmail/Calendar/Drive connection, so register both
Google URLs on that one client.

**Providers that need review before strangers can connect** (do these early; reviews take time):
- **Google:** Gmail and Drive read scopes are *restricted* - needs Google OAuth verification plus an annual
  third-party security assessment (CASA). Until then, only test users you add can connect Google.
  See [google-verification.md](google-verification.md).
- **Slack:** enable **Manage Distribution** on the Slack app so workspaces other than yours can install it.
- **Microsoft:** multi-tenant apps should complete **publisher verification**; some organizations require an
  admin to approve any app.
- **QuickBooks (Intuit):** production keys require completing Intuit's production-keys questionnaire.
- **Shopify, HubSpot, Atlassian (Jira), Salesforce:** private/unlisted distribution works for early users;
  app-store listings need each vendor's review. Check each vendor's current rules when you register.

---

## 4. Billing (Stripe) - currently off

### Test mode, end to end
1. Stripe Dashboard (test mode): create products **Solo**, **Team**, **Business** with monthly (and
   optionally yearly) prices.
2. Set in Vercel (Preview or a test deployment): `STRIPE_SECRET_KEY=sk_test_...`,
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`, `STRIPE_PRICE_SOLO`, `STRIPE_PRICE_TEAM`,
   `STRIPE_PRICE_BUSINESS` (+ `_YEARLY` variants).
3. Add a webhook endpoint `https://<deployment>/api/webhooks/stripe` listening to
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
4. Upgrade with card `4242 4242 4242 4242` -> Billing shows the plan, Status Active.
5. Use card `4000 0000 0000 0341` (attaches, then fails) and advance the renewal with a test clock ->
   status PastDue; paid features stay for 7 days, then the workspace drops to Free.
6. Cancel in the customer portal -> Free, Canceled.
7. In Stripe > Webhooks, confirm every delivery returned 200. A 400 means a signing-secret mismatch.

### Switching to live
- Recreate the products and prices in **live** mode (test IDs don't carry over).
- Replace `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and every `STRIPE_PRICE_*` with live values.
- Create the live webhook endpoint at `https://www.stackunder.website/api/webhooks/stripe` with the same four
  events, and set its new `STRIPE_WEBHOOK_SECRET`.
- Update the pricing page and Terms before charging anyone. The "free early access" copy assumes billing is off.

---

## 5. Email sign-in (Resend)

1. resend.com > Domains > Add `stackunder.website` (region us-east-1).
2. Add the records Resend shows at your DNS host (IONOS). Usually:
   - TXT `resend._domainkey` - the DKIM key Resend gives you
   - MX `send` -> `feedback-smtp.us-east-1.amazonses.com` (priority 10)
   - TXT `send` -> `v=spf1 include:amazonses.com ~all`
   Copy the exact values from Resend. Don't change the existing Vercel A/CNAME records.
3. Click **Verify** in Resend; it can take a few minutes to hours.
4. Set `EMAIL_FROM="STACK <login@stackunder.website>"` and `RESEND_API_KEY` in Vercel, then redeploy.
5. Test: request a link from /login. Sign-in emails are limited to 3 per address and 10 per network per
   15 minutes.

---

## 6. Runbook

**A user says an app "needs attention" or sync errors.** Connected Apps shows the reason in plain words.
The raw provider error is in the Vercel function logs (search `sync <app> failed`). Common causes:
revoked access or an expired token (fix: Reconnect); missing permission (reconnect and approve, or ask
their admin); the provider is rate-limiting or down (Sync now later).

**"Your authorization expired" / connection error.** The refresh token was revoked or expired
(`Integration.syncError` is set). Only the user can fix it: Connected Apps > Reconnect. Logs show
`token refresh for <app> failed permanently`.

**A Google API error mentioning SERVICE_DISABLED.** An API is switched off in STACK's Google Cloud project.
Enable the named API (Gmail, Calendar or Drive) in console.cloud.google.com for the project that owns
`GOOGLE_CLIENT_ID`. Users see "a problem on our side".

**Stripe webhook failures.** Stripe > Developers > Webhooks > the endpoint > failed deliveries. A 400 means
the signing secret doesn't match `STRIPE_WEBHOOK_SECRET`. A 500 means the save failed; Stripe retries
automatically for up to 3 days, and you can also **Resend** an event. The handler is idempotent (it upserts
by workspace), so re-sending is safe.

**Production returns P2022 "column does not exist".** Code shipped before its migration. Run
`prisma migrate deploy` against production (section 2), then redeploy.

**AI answers say "from your synced data only".** Either the person hit the daily limit (resets on a rolling
24h basis) or both model providers failed. Check the Anthropic/Gemini/Groq status pages and the logs for
`AI model unavailable`.

**Too many sign-in emails / 429s.** Expected rate limiting (RateLimit table). Counters clear themselves
within the window.

**Restore after data loss.** Neon > project > Branches > main > Restore to a point in time. How far back
depends on your Neon plan's history retention.

**Errors.** With `NEXT_PUBLIC_SENTRY_DSN` set, unexpected errors (500s, crashes) appear in Sentry. Error
pages show users a reference code (`digest`) that matches the server log entry.

---

## 7. Needs you - only the owner can do these (in order)

0. **Google sign-in for everyone.** Sign-in uses the same Google OAuth client as the Gmail/Drive connection. While
   that client's consent screen is in **Testing**, only its listed test users can sign in to STACK at all - and Google
   is the only sign-in option until email sign-in (step 4) is set up. Before launch, either publish the consent screen
   (Google Cloud > Google Auth Platform > Audience > Publish app; sign-in scopes need no review) or create a second
   OAuth client in a separate project used only for sign-in, and set up email sign-in as a second way in.
1. **Separate development from production.** Neon > create a branch named `dev` from `main`, copy its
   connection string, and put it in `.env.local` as `DATABASE_URL`. Production keeps the current database.
   While in Neon, check how many days of history your plan keeps for restores; the free plan's window is short.
2. **Google account security.** Make sure 2-Step Verification is on for the Google account that owns the
   Cloud project (Google set a 2026-10-06 deadline).
3. **Rotate keys** that were handled during development: Anthropic, Groq, Slack and Clio client secrets.
   Generate new ones in each console, update Vercel, redeploy, then revoke the old ones.
4. **Email sign-in:** follow section 5 (Resend domain + IONOS DNS + `EMAIL_FROM`).
5. **Error monitoring:** sentry.io > create a Next.js project > copy the DSN into `NEXT_PUBLIC_SENTRY_DSN`
   in Vercel > redeploy. In the Sentry project, open Settings > Security & Privacy and turn on **Prevent
   Storing of IP Addresses** (the privacy policy promises this).
6. **Groq:** console.groq.com > Settings > Data Controls > enable **Zero Data Retention**.
   **Gemini (if `LLM_*` points at Google):** the key's Google Cloud project must have billing on (AI Studio shows
   "Paid tier"). On the free tier Google may use prompts to improve its products, which breaks the privacy policy's
   no-training promise and Google's API user-data policy for Gmail/Drive data.
7. **Box:** create a Box app (developer.box.com > My Apps > Custom App > User Authentication (OAuth 2.0)),
   redirect URI `https://www.stackunder.website/api/integrations/box/callback`, scope "Read all files and
   folders". Put the real 32-character client ID and the secret in `BOX_CLIENT_ID` / `BOX_CLIENT_SECRET`.
8. **Slack:** api.slack.com/apps > STACK > Manage Distribution > activate public distribution.
9. **Google OAuth verification** for the Gmail/Drive restricted scopes: [google-verification.md](google-verification.md).
10. **Remaining OAuth apps** (Dropbox, Microsoft, Salesforce, QuickBooks, FreshBooks, ...): register each with the
    redirect URI from section 3, following [app-registration-kit.md](app-registration-kit.md).
11. **GitHub:** consider branch protection on `main` that requires the CI check. Vercel deploys every push
    to `main`, including ones that fail CI.
12. **Billing**, only when you decide to charge: section 4.
