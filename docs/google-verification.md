# Google OAuth verification pack for STACK

Until this is done, Google shows "unverified app" and only the test users you list can connect. Gmail read access is a
**restricted** scope, so Google requires verification **and** an annual third-party security assessment (CASA).
Start now: the review takes weeks.

## 0. What only you can do (needs your Google account and a real domain)

- A real production domain you own (not localhost, not a tunnel). Verify it in Google Search Console with the same Google account that owns the Cloud project.
- In Google Cloud Console > APIs & Services > OAuth consent screen (Google Auth Platform > Branding / Data Access / Verification):
  - App name `STACK`, support email, logo (120x120 PNG).
  - App home page: `https://YOUR-DOMAIN/`
  - Privacy policy: `https://YOUR-DOMAIN/privacy`   (page exists in this repo)
  - Terms of service: `https://YOUR-DOMAIN/terms`   (page exists in this repo)
  - Authorized domains: `YOUR-DOMAIN`
  - Add production redirect URIs to the OAuth client: `https://YOUR-DOMAIN/api/integrations/google/callback` and `https://YOUR-DOMAIN/api/auth/callback/google`
  - Set `NEXT_PUBLIC_CONTACT_EMAIL` in production so the policy pages show a real contact address.
- Publishing status: move from Testing to **In production**, then submit for verification.

## 1. Scopes to request (and only these)

| Scope | Class | Why STACK needs it |
|---|---|---|
| `https://www.googleapis.com/auth/gmail.readonly` | Restricted | Read subject, sender and a short preview of recent inbox messages so STACK can show which emails need attention and link them to projects and tasks. |
| `https://www.googleapis.com/auth/calendar.readonly` | Sensitive | Read upcoming events so STACK can prepare the user for meetings and build a daily brief. |
| `https://www.googleapis.com/auth/drive.readonly` | Restricted | Read names, links and modified times of recently changed files so STACK can find documents related to a project. |
| `https://www.googleapis.com/auth/gmail.send` | Sensitive | Optional. Only when the user approves an email STACK drafted. Requested separately, never by default. |
| `https://www.googleapis.com/auth/calendar.events` | Sensitive | Optional. Only when the user approves a meeting STACK proposed. Requested separately, never by default. |

Consider dropping `drive.readonly` from the first submission if Drive is not essential: fewer restricted scopes means a
faster, cheaper review. STACK reads only file metadata (name, link, modified time, owner), so `drive.metadata.readonly`
is a narrower alternative worth checking against the code in `src/server/integrations/providers/google.ts`.

Google reviews "minimum scope necessary". The code already asks for read scopes by default and write scopes only through
`/api/integrations/google/connect?write=1`.

## 2. Justification text you can paste

**Why does the app need Gmail access?**
STACK is a work-organization app. With the user's permission it reads the subject, sender and a short preview of recent
inbox messages, and shows the user which conversations need attention, linked to their projects and tasks. STACK does not
read attachments, does not delete or modify email, and never sends email without the user reviewing and approving each message.

**Why does the app need Calendar access?**
STACK reads upcoming events so it can prepare the user for meetings and build a daily brief of what is coming up.

**Why does the app need Drive access?**
STACK lists recently changed file names and links so it can help the user find documents related to a project. It does not
read file contents.

**How is the data used and stored?**
Only to show the user their own information inside STACK. Access tokens are encrypted at rest. Data is deleted when the
user disconnects Google. It is not sold, used for advertising, or used to train generalized AI models. Portions of the
user's own data are sent to an AI provider only to answer that user's questions (see the Privacy Policy, "AI processing").

## 3. Limited Use disclosure

The privacy policy includes the required statement and the four Limited Use commitments (Privacy Policy > "Google user data").
Google checks this text exists verbatim, so do not reword the sentence beginning "STACK's use and transfer to any other app...".

## 4. Demo video (required, unlisted YouTube link)

Record about 3 minutes, screen plus voice, showing the production domain in the address bar:
1. Sign in to STACK on the production domain.
2. Integrations > Connect Google. Show the Google consent screen **with the app name and every requested scope visible**.
3. Approve. Show STACK returning to the app and syncing.
4. Show exactly where each scope's data is used: the Inbox page (Gmail), Calendar page (Calendar), Files page (Drive).
5. Show an email STACK drafted, the approval screen, and that nothing sends until you click Send (only if `gmail.send` is requested).
6. Show Disconnect and that the imported data is removed.

## 5. Security assessment (CASA), needed because Gmail and Drive are restricted

- Google will email the requirements after the first review. An authorized assessor tests the app and hosting.
- Have ready: a production deployment, HTTPS everywhere, a way to demonstrate encrypted token storage, and a description of your data flows.
- This step has a fee set by the assessor and repeats every year.

## 5b. Things the code already does that reviewers look for

- Tokens encrypted at rest (AES-256-GCM), never sent to the browser.
- OAuth `state` per request with a short-lived HTTP-only cookie (CSRF protection).
- Read-only by default; write access requested separately.
- Disconnect revokes the token at Google and deletes imported content.
- Audit log of connect and disconnect events, without tokens or content.

## 6. Timeline expectations

Branding and domain checks: days. Restricted-scope review plus security assessment: commonly 4 to 8 weeks or more.
Keep the app in Testing mode with up to 100 test users in the meantime.

## 7. Things to confirm before submitting

- The AI providers you use in production do not train on API data (Anthropic's API does not by default; check any fallback provider's terms). The privacy policy says they do not, so this must stay true.
- Replace localhost/tunnel URLs everywhere with the production domain.
- Have the privacy policy and terms reviewed by a lawyer before launch. They are written to match what STACK does today, not legal advice.
