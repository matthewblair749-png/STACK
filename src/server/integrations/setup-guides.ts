export interface SetupVar {
  name: string;
  label: string;
  secret?: boolean;
}

export interface SetupGuide {
  consoleUrl: string;
  consoleLabel: string;
  steps: string[];
  vars: SetupVar[];
}

const idSecret = (prefix: string, idLabel = "Client ID", secretLabel = "Client secret"): SetupVar[] => [
  { name: `${prefix}_CLIENT_ID`, label: idLabel },
  { name: `${prefix}_CLIENT_SECRET`, label: secretLabel, secret: true },
];

/**
 * What a person has to do, once, on each platform's developer site so STACK can sign users in.
 * Only the developer of the app can create these credentials - STACK can't do it for them - so this
 * is the exact checklist, kept next to the provider code so it can't drift from the scopes used.
 */
export const SETUP_GUIDES: Record<string, SetupGuide> = {
  google: {
    consoleUrl: "https://console.cloud.google.com/apis/credentials",
    consoleLabel: "Google Cloud Console",
    steps: ["Create an OAuth client (Web application).", "Add the redirect URL below.", "Enable the Gmail, Google Calendar and Google Drive APIs.", "While in Testing mode, add yourself as a test user."],
    vars: idSecret("GOOGLE"),
  },
  microsoft: {
    consoleUrl: "https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
    consoleLabel: "Microsoft Entra app registrations",
    steps: ["New registration - accounts in any org directory and personal accounts.", "Add a Web redirect URI (the URL below).", "API permissions: Microsoft Graph delegated User.Read, Mail.Read, Calendars.Read, Files.Read, offline_access.", "Certificates & secrets - New client secret; copy its Value."],
    vars: idSecret("MICROSOFT", "Application (client) ID"),
  },
  slack: {
    consoleUrl: "https://api.slack.com/apps",
    consoleLabel: "Slack API apps",
    steps: ["Create New App - From scratch.", "OAuth & Permissions: add the redirect URL below.", "Add these User Token Scopes: channels:history, channels:read, groups:history, groups:read, im:history, im:read, mpim:read.", "Basic Information: copy the Client ID and Client Secret."],
    vars: idSecret("SLACK"),
  },
  github: {
    consoleUrl: "https://github.com/settings/applications/new",
    consoleLabel: "GitHub OAuth apps",
    steps: ["Register a new OAuth application.", "Set the Authorization callback URL to the URL below.", "Generate a client secret and copy it."],
    vars: idSecret("GITHUB"),
  },
  notion: {
    consoleUrl: "https://www.notion.so/profile/integrations",
    consoleLabel: "Notion integrations",
    steps: ["New integration - type Public.", "Add the redirect URL below.", "Copy the OAuth client ID and secret from the Distribution / Secrets tab."],
    vars: idSecret("NOTION", "OAuth client ID", "OAuth client secret"),
  },
  zoom: {
    consoleUrl: "https://marketplace.zoom.us/develop/create",
    consoleLabel: "Zoom App Marketplace",
    steps: ["Create - General app (user-managed OAuth).", "Add the redirect URL below.", "Scopes: add the granular scope meeting:read:list_meetings (Zoom now uses granular names; the plain meeting:read is not enough).", "Copy the Client ID and Client Secret."],
    vars: idSecret("ZOOM"),
  },
  dropbox: {
    consoleUrl: "https://www.dropbox.com/developers/apps/create",
    consoleLabel: "Dropbox App Console",
    steps: ["Create app - Scoped access - Full Dropbox.", "Permissions tab: enable files.metadata.read and account_info.read, then Submit.", "Settings tab: add the redirect URL below.", "Copy the App key and App secret."],
    vars: idSecret("DROPBOX", "App key", "App secret"),
  },
  box: {
    consoleUrl: "https://app.box.com/developers/console",
    consoleLabel: "Box Developer Console",
    steps: ["Create Platform App - Custom App - User Authentication (OAuth 2.0).", "Configuration: add the redirect URL below and enable read access to files.", "Copy the Client ID and Client Secret."],
    vars: idSecret("BOX"),
  },
  gitlab: {
    consoleUrl: "https://gitlab.com/-/user_settings/applications",
    consoleLabel: "GitLab applications",
    steps: ["Add new application.", "Redirect URI: the URL below. Scope: read_api.", "Copy the Application ID and Secret."],
    vars: idSecret("GITLAB", "Application ID", "Secret"),
  },
  jira: {
    consoleUrl: "https://developer.atlassian.com/console/myapps/",
    consoleLabel: "Atlassian developer console",
    steps: ["Create - OAuth 2.0 integration.", "Permissions: add Jira API and grant read:jira-work and read:jira-user.", "Authorization: add the callback URL below.", "Settings: copy the Client ID and Secret."],
    vars: idSecret("JIRA"),
  },
  linear: {
    consoleUrl: "https://linear.app/settings/api/applications/new",
    consoleLabel: "Linear API settings",
    steps: ["Create an OAuth application.", "Callback URL: the URL below.", "Copy the Client ID and Client Secret."],
    vars: idSecret("LINEAR"),
  },
  asana: {
    consoleUrl: "https://app.asana.com/0/my-apps",
    consoleLabel: "Asana developer console",
    steps: ["Create new app.", "OAuth: add the redirect URL below.", "Copy the Client ID and Client Secret."],
    vars: idSecret("ASANA"),
  },
  hubspot: {
    consoleUrl: "https://developers.hubspot.com/",
    consoleLabel: "HubSpot developer account",
    steps: ["Create an app.", "Auth tab: add the redirect URL below and scopes crm.objects.deals.read and crm.objects.contacts.read.", "Copy the Client ID and Client secret."],
    vars: idSecret("HUBSPOT"),
  },
  salesforce: {
    consoleUrl: "https://login.salesforce.com/lightning/setup/NavigationMenus/home",
    consoleLabel: "Salesforce Setup",
    steps: ["Setup - App Manager - New Connected App.", "Enable OAuth Settings: callback URL below; scopes: Manage user data via APIs (api) and Perform requests at any time (refresh_token).", "Copy the Consumer Key and Consumer Secret."],
    vars: idSecret("SALESFORCE", "Consumer key", "Consumer secret"),
  },
  figma: {
    consoleUrl: "https://www.figma.com/developers/apps",
    consoleLabel: "Figma developer apps",
    steps: ["Create a new app.", "Add the redirect URL below and the scopes file_content:read and projects:read.", "Copy the Client ID and Client secret."],
    vars: idSecret("FIGMA"),
  },
  trello: {
    consoleUrl: "https://trello.com/power-ups/admin",
    consoleLabel: "Trello Power-Ups admin",
    steps: ["New - create a Power-Up (any name).", "API key tab: generate an API key.", "Add http://localhost:3000 to the Allowed origins."],
    vars: [{ name: "TRELLO_API_KEY", label: "API key" }],
  },
  quickbooks: {
    consoleUrl: "https://developer.intuit.com/app/developer/dashboard",
    consoleLabel: "Intuit developer dashboard",
    steps: ["Create an app with the Accounting scope.", "Keys & credentials: add the redirect URL below.", "Copy the Client ID and Client Secret (use the Development keys for a sandbox company; set QUICKBOOKS_SANDBOX=true then)."],
    vars: idSecret("QUICKBOOKS"),
  },
  shopify: {
    consoleUrl: "https://partners.shopify.com/",
    consoleLabel: "Shopify Partners",
    steps: ["Apps - Create app - create manually.", "Set the Allowed redirection URL to the URL below.", "Scopes: read_orders, read_customers, read_products.", "Copy the Client ID and Client secret."],
    vars: idSecret("SHOPIFY"),
  },
  stripe: {
    consoleUrl: "https://dashboard.stripe.com/settings/connect",
    consoleLabel: "Stripe Connect settings",
    steps: ["Enable Connect, then in OAuth settings add the redirect URL below.", "Copy the Live or Test client ID (starts with ca_).", "Copy your secret key from Developers - API keys."],
    vars: [
      { name: "STRIPE_CONNECT_CLIENT_ID", label: "Connect client ID (ca_...)" },
      { name: "STRIPE_SECRET_KEY", label: "Secret key (sk_...)", secret: true },
    ],
  },
};
