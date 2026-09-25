# Deploying STACK to https://stackunder.website

The project is already linked to a Vercel project (`stack-app`, see `.vercel/project.json`). `next build` passes.

## 1. Point the domain at Vercel

1. Vercel dashboard > project `stack-app` > Settings > Domains > Add `stackunder.website`, then add `www.stackunder.website`
   and set it to redirect to the apex.
2. Vercel shows the exact DNS records for your project. Use what it shows. Typically:
   - `A`      `@`    `76.76.21.21`
   - `CNAME`  `www`  `cname.vercel-dns.com`
3. Porkbun > Domain Management > stackunder.website > DNS Records:
   - Delete the default parking records (an `ALIAS`/`CNAME` pointing at `pixie.porkbun.com` and the `*` wildcard CNAME).
   - Add the records from step 2.
4. Wait a few minutes. Vercel shows a green check and issues the HTTPS certificate itself.

## 2. Production environment variables (Vercel > Settings > Environment Variables, Production)

Copy these from your `.env.local`, except where the value is given here:

| Name | Value |
|---|---|
| `APP_URL` | `https://stackunder.website` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | the support address you want shown in the privacy policy |
| `DATABASE_URL` | a **separate production database** (see the note below) |
| `AUTH_SECRET` | generate a new one for production |
| `ENCRYPTION_KEY` | generate a new one for production (32 bytes, base64). Never reuse the dev key. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | from Google Cloud |
| `RESEND_API_KEY`, `EMAIL_FROM` | `EMAIL_FROM` must use a domain verified in Resend (verify `stackunder.website` there) |
| `ANTHROPIC_API_KEY`, `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | your AI keys (use fresh keys, not the ones shared in chat) |
| Other apps' `*_CLIENT_ID` / `*_CLIENT_SECRET` | only for the apps you have set up |

Do NOT set `OAUTH_REDIRECT_BASE_ZOOM` in production. It was only for the local tunnel.

Note: production and local should not share one database. Users' synced data and encrypted tokens live there. Create a
second Neon database/branch for production, set its `DATABASE_URL` in Vercel, and run the migrations against it:
`npx prisma migrate deploy` with that `DATABASE_URL` in your shell.

## 3. Update every provider's redirect URLs (add, keep the localhost ones for development)

| App | Redirect URL |
|---|---|
| Google (integrations) | `https://stackunder.website/api/integrations/google/callback` |
| Google (sign-in) | `https://stackunder.website/api/auth/callback/google` |
| Slack | `https://stackunder.website/api/integrations/slack/callback` |
| Zoom | `https://stackunder.website/api/integrations/zoom/callback` (and add it to the OAuth allow list) |
| GitHub | `https://stackunder.website/api/integrations/github/callback` |
| Any other app | `https://stackunder.website/api/integrations/<app>/callback` |

Google: also add `stackunder.website` under Authorized domains, and set Home/Privacy/Terms to
`https://stackunder.website`, `/privacy`, `/terms`.

## 4. Prove you own the domain to Google

1. https://search.google.com/search-console > Add property > **Domain** > `stackunder.website`.
2. It gives you a TXT record. Add it in Porkbun DNS (Type `TXT`, Host blank/`@`, Answer = the value).
3. Click Verify (can take a few minutes). Use the SAME Google account that owns the Cloud project.

## 5. Deploy

- No git repo yet. Either connect the project to GitHub in Vercel, or run `vercel --prod` from this folder.
- After deploy, open https://stackunder.website/privacy and /terms while signed out. Both must load.

Then follow `docs/google-verification.md`.
