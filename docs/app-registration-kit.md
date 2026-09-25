# App registration kit

Standard values to paste into every provider's "create app" form. Register each app once; then send the client ID and
secret (format at the bottom) and STACK is updated in one pass.

## Values that are the same everywhere

| Field | Value |
|---|---|
| App name | `STACK` |
| Short description | Connects your work apps so you can see what needs your attention and act on it. Read-only by default. |
| Long description | STACK connects the apps where your work happens and turns them into one clear picture: what's happening, what to do first, and what to do next. Read-only by default. Nothing is sent or changed without your approval. |
| Homepage / website URL | `https://www.stackunder.website` |
| Privacy policy URL | `https://www.stackunder.website/privacy` |
| Terms of service URL | `https://www.stackunder.website/terms` |
| Support email | (the address you set in NEXT_PUBLIC_CONTACT_EMAIL) |
| Logo | STACK's logo, square PNG, 512x512 if a provider asks |

## Redirect URLs

Each provider lists allowed redirect URLs. Add the live one for your website. Add the local one too if the provider allows more than one
(GitHub allows only one per app, so make a second GitHub app for the live site).

### GitHub

- Create it here: https://github.com/settings/applications/new
- Redirect URL (live): `https://www.stackunder.website/api/integrations/github/callback`
- Redirect URL (local, optional): `http://localhost:3000/api/integrations/github/callback`
- Permissions to grant (read): Read your notifications; Read repositories you can access; Read your profile
- Steps:
  1. Register a new OAuth application.
  2. Set the Authorization callback URL to the URL below.
  3. Generate a client secret and copy it.
- Copy back: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

### Linear

- Create it here: https://linear.app/settings/api/applications/new
- Redirect URL (live): `https://www.stackunder.website/api/integrations/linear/callback`
- Redirect URL (local, optional): `http://localhost:3000/api/integrations/linear/callback`
- Permissions to grant (read): Read your issues, teams and workflow states
- Steps:
  1. Create an OAuth application.
  2. Callback URL: the URL below.
  3. Copy the Client ID and Client Secret.
- Copy back: `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET`

### Notion

- Create it here: https://www.notion.so/profile/integrations
- Redirect URL (live): `https://www.stackunder.website/api/integrations/notion/callback`
- Redirect URL (local, optional): `http://localhost:3000/api/integrations/notion/callback`
- Permissions to grant (read): Read pages you choose to share
- Steps:
  1. New integration - type Public.
  2. Add the redirect URL below.
  3. Copy the OAuth client ID and secret from the Distribution / Secrets tab.
- Copy back: `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`

### GitLab

- Create it here: https://gitlab.com/-/user_settings/applications
- Redirect URL (live): `https://www.stackunder.website/api/integrations/gitlab/callback`
- Redirect URL (local, optional): `http://localhost:3000/api/integrations/gitlab/callback`
- Permissions to grant (read): Read your to-dos and the projects they belong to
- Steps:
  1. Add new application.
  2. Redirect URI: the URL below. Scope: read_api.
  3. Copy the Application ID and Secret.
- Copy back: `GITLAB_CLIENT_ID`, `GITLAB_CLIENT_SECRET`

### Slack

- Create it here: https://api.slack.com/apps
- Redirect URL (live): `https://www.stackunder.website/api/integrations/slack/callback`
- Redirect URL (local, optional): `http://localhost:3000/api/integrations/slack/callback`
- Permissions to grant (read): Read channels you're in; Read direct messages; Read group messages
- Steps:
  1. Create New App - From scratch.
  2. OAuth & Permissions: add the redirect URL below.
  3. Add these User Token Scopes: channels:history, channels:read, groups:history, groups:read, im:history, im:read, mpim:read.
  4. Basic Information: copy the Client ID and Client Secret.
- Copy back: `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`

### Zoom

- Create it here: https://marketplace.zoom.us/develop/create
- Redirect URL (live): `https://www.stackunder.website/api/integrations/zoom/callback`
- Redirect URL (local, optional): `http://localhost:3000/api/integrations/zoom/callback`
- Permissions to grant (read): Read your scheduled meetings
- Steps:
  1. Create - General app (user-managed OAuth).
  2. Add the redirect URL below.
  3. Scopes: add meeting:read.
  4. Copy the Client ID and Client Secret.
- Copy back: `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`

### Box

- Create it here: https://app.box.com/developers/console
- Redirect URL (live): `https://www.stackunder.website/api/integrations/box/callback`
- Redirect URL (local, optional): `http://localhost:3000/api/integrations/box/callback`
- Permissions to grant (read): Read file names and details
- Steps:
  1. Create Platform App - Custom App - User Authentication (OAuth 2.0).
  2. Configuration: add the redirect URL below and enable read access to files.
  3. Copy the Client ID and Client Secret.
- Copy back: `BOX_CLIENT_ID`, `BOX_CLIENT_SECRET`

### Dropbox

- Create it here: https://www.dropbox.com/developers/apps/create
- Redirect URL (live): `https://www.stackunder.website/api/integrations/dropbox/callback`
- Redirect URL (local, optional): `http://localhost:3000/api/integrations/dropbox/callback`
- Permissions to grant (read): Read file names and details (not file contents)
- Steps:
  1. Create app - Scoped access - Full Dropbox.
  2. Permissions tab: enable files.metadata.read and account_info.read, then Submit.
  3. Settings tab: add the redirect URL below.
  4. Copy the App key and App secret.
- Copy back: `DROPBOX_CLIENT_ID`, `DROPBOX_CLIENT_SECRET`

### Asana

- Create it here: https://app.asana.com/0/my-apps
- Redirect URL (live): `https://www.stackunder.website/api/integrations/asana/callback`
- Redirect URL (local, optional): `http://localhost:3000/api/integrations/asana/callback`
- Permissions to grant (read): Read your tasks and their projects
- Steps:
  1. Create new app.
  2. OAuth: add the redirect URL below.
  3. Copy the Client ID and Client Secret.
- Copy back: `ASANA_CLIENT_ID`, `ASANA_CLIENT_SECRET`

### Figma

- Create it here: https://www.figma.com/developers/apps
- Redirect URL (live): `https://www.stackunder.website/api/integrations/figma/callback`
- Redirect URL (local, optional): `http://localhost:3000/api/integrations/figma/callback`
- Permissions to grant (read): Read file names and projects in your team
- Steps:
  1. Create a new app.
  2. Add the redirect URL below and the scopes file_content:read and projects:read.
  3. Copy the Client ID and Client secret.
- Copy back: `FIGMA_CLIENT_ID`, `FIGMA_CLIENT_SECRET`

### HubSpot

- Create it here: https://developers.hubspot.com/
- Redirect URL (live): `https://www.stackunder.website/api/integrations/hubspot/callback`
- Redirect URL (local, optional): `http://localhost:3000/api/integrations/hubspot/callback`
- Permissions to grant (read): Read deals and contacts
- Steps:
  1. Create an app.
  2. Auth tab: add the redirect URL below and scopes crm.objects.deals.read and crm.objects.contacts.read.
  3. Copy the Client ID and Client secret.
- Copy back: `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`

### Microsoft (Outlook, Calendar, OneDrive)

- Create it here: https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
- Redirect URL (live): `https://www.stackunder.website/api/integrations/microsoft/callback`
- Redirect URL (local, optional): `http://localhost:3000/api/integrations/microsoft/callback`
- Permissions to grant (read): Read your email; Read your calendar; Read your OneDrive files
- Steps:
  1. New registration - accounts in any org directory and personal accounts.
  2. Add a Web redirect URI (the URL below).
  3. API permissions: Microsoft Graph delegated User.Read, Mail.Read, Calendars.Read, Files.Read, offline_access.
  4. Certificates & secrets - New client secret; copy its Value.
- Copy back: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`

### Jira (Atlassian)

- Create it here: https://developer.atlassian.com/console/myapps/
- Redirect URL (live): `https://www.stackunder.website/api/integrations/jira/callback`
- Redirect URL (local, optional): `http://localhost:3000/api/integrations/jira/callback`
- Permissions to grant (read): Read Jira issues; Read Jira user info
- Steps:
  1. Create - OAuth 2.0 integration.
  2. Permissions: add Jira API and grant read:jira-work and read:jira-user.
  3. Authorization: add the callback URL below.
  4. Settings: copy the Client ID and Secret.
- Copy back: `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`

### Trello

- Create it here: https://trello.com/power-ups/admin
- Permissions to grant (read): Read boards and cards you can see
- Steps:
  1. New - create a Power-Up (any name).
  2. API key tab: generate an API key.
  3. Add http://localhost:3000 to the Allowed origins.
- Copy back: `TRELLO_API_KEY`

### Salesforce

- Create it here: https://login.salesforce.com/lightning/setup/NavigationMenus/home
- Redirect URL (live): `https://www.stackunder.website/api/integrations/salesforce/callback`
- Redirect URL (local, optional): `http://localhost:3000/api/integrations/salesforce/callback`
- Permissions to grant (read): Read opportunities via the Salesforce API
- Steps:
  1. Setup - App Manager - New Connected App.
  2. Enable OAuth Settings: callback URL below; scopes: Manage user data via APIs (api) and Perform requests at any time (refresh_token).
  3. Copy the Consumer Key and Consumer Secret.
- Copy back: `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`

### QuickBooks

- Create it here: https://developer.intuit.com/app/developer/dashboard
- Redirect URL (live): `https://www.stackunder.website/api/integrations/quickbooks/callback`
- Redirect URL (local, optional): `http://localhost:3000/api/integrations/quickbooks/callback`
- Permissions to grant (read): Read invoices and customers
- Steps:
  1. Create an app with the Accounting scope.
  2. Keys & credentials: add the redirect URL below.
  3. Copy the Client ID and Client Secret (use the Development keys for a sandbox company; set QUICKBOOKS_SANDBOX=true then).
- Copy back: `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`

### Shopify

- Create it here: https://partners.shopify.com/
- Redirect URL (live): `https://www.stackunder.website/api/integrations/shopify/callback`
- Redirect URL (local, optional): `http://localhost:3000/api/integrations/shopify/callback`
- Permissions to grant (read): Read orders, customers and products
- Steps:
  1. Apps - Create app - create manually.
  2. Set the Allowed redirection URL to the URL below.
  3. Scopes: read_orders, read_customers, read_products.
  4. Copy the Client ID and Client secret.
- Copy back: `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`

### Stripe

- Create it here: https://dashboard.stripe.com/settings/connect
- Redirect URL (live): `https://www.stackunder.website/api/integrations/stripe/callback`
- Redirect URL (local, optional): `http://localhost:3000/api/integrations/stripe/callback`
- Permissions to grant (read): Read payments (read-only access)
- Steps:
  1. Enable Connect, then in OAuth settings add the redirect URL below.
  2. Copy the Live or Test client ID (starts with ca_).
  3. Copy your secret key from Developers - API keys.
- Copy back: `STRIPE_CONNECT_CLIENT_ID`, `STRIPE_SECRET_KEY`

### Google (Gmail, Calendar, Drive)

- Create it here: https://console.cloud.google.com/apis/credentials
- Redirect URL (live): `https://www.stackunder.website/api/integrations/google/callback` and `https://www.stackunder.website/api/auth/callback/google`
- Redirect URL (local, optional): `http://localhost:3000/api/integrations/google/callback`
- Permissions to grant (read): Read your email; Read your calendar; Read your Drive files
- Steps:
  1. Create an OAuth client (Web application).
  2. Add the redirect URL below.
  3. Enable the Gmail, Google Calendar and Google Drive APIs.
  4. While in Testing mode, add yourself as a test user.
- Copy back: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## When you have credentials

Send them in one message in this format (one per line). They are saved to `.env.local` and Vercel, then the site is redeployed:

```
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
LINEAR_CLIENT_ID=...
LINEAR_CLIENT_SECRET=...
```

Create a fresh secret for anything you paste in chat, and delete the old one once you've confirmed the connection works.
