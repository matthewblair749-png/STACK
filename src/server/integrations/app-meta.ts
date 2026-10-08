/**
 * Plain-language facts about each real connector, shown before authorization and on the app's detail
 * page. Everything here mirrors what the connector code actually requests and does - if a connector's
 * scopes or actions change, change this file with it. `act` is only what STACK can really do today.
 */
export interface AppMeta {
  /** "STACK can understand ..." */
  understands: string[];
  /** What is read (the permissions requested). */
  read: string[];
  /** Consequential things STACK can do in this app, always after your approval. Empty = read-only. */
  act: string[];
  /** Extra permission needed for `act`, if any. */
  actNote?: string;
  /** What this connection will never do. */
  wont: string[];
  /** Words people search for that should find this app. */
  synonyms: string[];
  /** What connecting unlocks, for the "STACK can now..." moment. */
  unlocks: string[];
}

const READ_ONLY_WONT = ["Change or delete anything in this app", "Send messages on your behalf without your approval"];

export const APP_META: Record<string, AppMeta> = {
  google: {
    understands: ["Gmail messages", "Calendar events", "Drive files"],
    read: ["Read your email", "Read your calendar", "Read your Drive files"],
    act: ["Send email", "Create calendar events"],
    actNote: "Asks for one extra permission the first time you approve one of these.",
    wont: ["Delete email, events or files", "Send anything without your approval"],
    synonyms: ["email", "mail", "gmail", "calendar", "schedule", "meetings", "drive", "files", "docs", "google workspace", "g suite"],
    unlocks: ["Find important emails", "Prepare for meetings", "Build your daily brief"],
  },
  microsoft: {
    understands: ["Outlook mail", "Outlook calendar", "OneDrive files"],
    read: ["Read your email", "Read your calendar", "Read your OneDrive files"],
    act: [],
    wont: READ_ONLY_WONT,
    synonyms: ["email", "mail", "outlook", "office", "microsoft 365", "office 365", "m365", "onedrive", "calendar", "teams"],
    unlocks: ["Find important emails", "Prepare for meetings", "Find your files"],
  },
  slack: {
    understands: ["Channel and direct messages you're part of"],
    read: ["Read channels you're in", "Read direct messages", "Read group messages"],
    act: [],
    wont: READ_ONLY_WONT,
    synonyms: ["chat", "messaging", "messages", "team chat", "communication", "channels", "dm"],
    unlocks: ["Surface conversations waiting on you", "Link discussions to your projects"],
  },
  github: {
    understands: ["Notifications", "Review requests", "Issues and pull requests assigned to you", "Mentions"],
    read: ["Read your notifications", "Read repositories you can access", "Read your profile"],
    act: [],
    wont: ["Change repositories or code", "Delete data", "Comment or merge without your approval"],
    synonyms: ["code", "git", "repositories", "repos", "pull requests", "prs", "issues", "developer", "development", "version control"],
    unlocks: ["See review requests and mentions", "Track work assigned to you"],
  },
  gitlab: {
    understands: ["Your to-dos: review requests, mentions and assignments"],
    read: ["Read your to-dos and the projects they belong to"],
    act: [],
    wont: ["Change repositories or code", "Delete data"],
    synonyms: ["code", "git", "repositories", "merge requests", "issues", "developer", "development", "ci", "version control"],
    unlocks: ["See review requests and mentions", "Track work assigned to you"],
  },
  jira: {
    understands: ["Open issues assigned to you"],
    read: ["Read Jira issues", "Read Jira user info"],
    act: [],
    wont: ["Create, edit or transition issues", "Delete data"],
    synonyms: ["tickets", "issues", "bugs", "sprint", "agile", "atlassian", "project management", "tracker", "development"],
    unlocks: ["See what's assigned to you", "Spot overdue or blocked work"],
  },
  linear: {
    understands: ["Open issues assigned to you"],
    read: ["Read your issues, teams and workflow states"],
    act: [],
    wont: ["Create, edit or close issues", "Delete data"],
    synonyms: ["issues", "tickets", "bugs", "sprint", "cycles", "project management", "tracker", "development"],
    unlocks: ["See what's assigned to you", "Spot high-priority work"],
  },
  asana: {
    understands: ["Incomplete tasks assigned to you, with due dates"],
    read: ["Read your tasks and their projects"],
    act: [],
    wont: ["Create, edit or complete tasks", "Delete data"],
    synonyms: ["tasks", "to-do", "todo", "projects", "project management", "work management", "tracker"],
    unlocks: ["See what's due", "Spot overdue tasks"],
  },
  trello: {
    understands: ["Open cards assigned to you, with due dates"],
    read: ["Read boards and cards you can see"],
    act: [],
    wont: ["Move, edit or archive cards", "Delete data"],
    synonyms: ["kanban", "boards", "cards", "tasks", "to-do", "todo", "project management"],
    unlocks: ["See what's due", "Spot overdue cards"],
  },
  notion: {
    understands: ["Pages and databases you share with STACK"],
    read: ["Read pages you choose to share"],
    act: [],
    wont: ["Edit or delete pages", "See pages you didn't share"],
    synonyms: ["docs", "wiki", "notes", "knowledge base", "documents", "workspace", "pages"],
    unlocks: ["Find documents and notes", "Link docs to your projects"],
  },
  dropbox: {
    understands: ["Your most recently changed files"],
    read: ["Read file names and details (not file contents)"],
    act: [],
    wont: ["Read file contents", "Edit, move or delete files"],
    synonyms: ["files", "storage", "cloud storage", "documents", "sync"],
    unlocks: ["Find files quickly", "Link files to your projects"],
  },
  clio: {
    understands: ["Your open matters and upcoming court dates and deadlines"],
    read: ["Read matters, clients' names and your calendar"],
    act: [],
    wont: ["Edit matters, bill time or contact clients", "Act on your behalf without your approval"],
    synonyms: ["legal", "law", "law firm", "matters", "cases", "attorney", "lawyer", "practice management"],
    unlocks: ["Never miss a court date", "See which matters changed"],
  },
  freshbooks: {
    understands: ["Invoices that are sent but not paid yet, overdue first"],
    read: ["Read your invoices and clients' names"],
    act: [],
    wont: ["Send, edit or delete invoices", "Act on your behalf without your approval"],
    synonyms: ["invoices", "accounting", "bookkeeping", "billing", "payments", "small business", "expenses", "freelance"],
    unlocks: ["See who owes you money", "Catch overdue invoices"],
  },
  box: {
    understands: ["Your most recently changed files"],
    read: ["Read file names and details"],
    act: [],
    wont: ["Edit, move or delete files"],
    synonyms: ["files", "storage", "cloud storage", "documents", "enterprise"],
    unlocks: ["Find files quickly", "Link files to your projects"],
  },
  figma: {
    understands: ["Recently edited files in the team you choose"],
    read: ["Read file names and projects in your team"],
    act: [],
    wont: ["Edit designs", "Delete files"],
    synonyms: ["design", "designs", "prototype", "ui", "ux", "mockups", "creative"],
    unlocks: ["Find design files", "Link designs to your projects"],
  },
  hubspot: {
    understands: ["Recently changed deals"],
    read: ["Read deals and contacts"],
    act: [],
    wont: ["Edit deals or contacts", "Send email from HubSpot"],
    synonyms: ["crm", "sales", "deals", "leads", "contacts", "marketing", "customers", "pipeline"],
    unlocks: ["Track deals that are moving", "Prepare for customer conversations"],
  },
  salesforce: {
    understands: ["Open opportunities you own"],
    read: ["Read opportunities via the Salesforce API"],
    act: [],
    wont: ["Edit records", "Delete data"],
    synonyms: ["crm", "sales", "opportunities", "deals", "leads", "accounts", "customers", "pipeline"],
    unlocks: ["Track your open deals", "Prepare for customer conversations"],
  },
  quickbooks: {
    understands: ["Unpaid and overdue invoices"],
    read: ["Read invoices and customers"],
    act: [],
    wont: ["Create or edit invoices", "Move money"],
    synonyms: ["accounting", "invoices", "bookkeeping", "finance", "payments", "accounts receivable", "taxes", "xero", "netsuite"],
    unlocks: ["See overdue invoices", "Know who owes you"],
  },
  shopify: {
    understands: ["Recent orders and their payment and fulfillment status"],
    read: ["Read orders, customers and products"],
    act: [],
    wont: ["Refund or edit orders", "Change your store"],
    synonyms: ["store", "ecommerce", "e-commerce", "orders", "shop", "retail", "products", "sales"],
    unlocks: ["See orders waiting to ship", "Track store activity"],
  },
  stripe: {
    understands: ["Recent payments and failed charges"],
    read: ["Read payments (read-only access)"],
    act: [],
    wont: ["Refund or charge anyone", "Move money"],
    synonyms: ["payments", "billing", "subscriptions", "revenue", "finance", "checkout", "invoices"],
    unlocks: ["Spot failed payments", "Track revenue activity"],
  },
};

const TOKEN_WONT = ["Create, edit or delete anything in this app", "Act on your behalf without your approval"];
Object.assign(APP_META, {
  clickup: { understands: ["Open tasks assigned to you, with due dates"], read: ["Read your tasks and their lists"], act: [], wont: TOKEN_WONT, synonyms: ["tasks", "project management", "todo", "sprints", "tracker"], unlocks: ["See what's due", "Spot overdue tasks"] },
  monday: { understands: ["Recently updated items on your boards"], read: ["Read your boards and items"], act: [], wont: TOKEN_WONT, synonyms: ["boards", "project management", "tasks", "work management", "tracker", "monday.com"], unlocks: ["See what changed on your boards", "Keep projects in view"] },
  calendly: { understands: ["Meetings people have booked with you"], read: ["Read your scheduled meetings"], act: [], wont: TOKEN_WONT, synonyms: ["scheduling", "meetings", "bookings", "appointments", "calendar"], unlocks: ["Prepare for booked meetings", "See bookings on your calendar"] },
  zendesk: { understands: ["Open support tickets assigned to you"], read: ["Read tickets assigned to you"], act: [], wont: TOKEN_WONT, synonyms: ["support", "tickets", "helpdesk", "customer service", "customers"], unlocks: ["Spot urgent tickets", "Know which customers are waiting"] },
  intercom: { understands: ["Your recent customer conversations"], read: ["Read conversations (read-only token)"], act: [], wont: TOKEN_WONT, synonyms: ["support", "customer chat", "messaging", "customers", "inbox"], unlocks: ["Surface unread customer conversations", "Know who needs a reply"] },
  vercel: { understands: ["Your recent deployments, including failures"], read: ["Read deployments and projects"], act: [], wont: TOKEN_WONT, synonyms: ["hosting", "deployments", "deploy", "developer", "frontend", "web"], unlocks: ["Catch failed deployments", "Link deploys to your work"] },
  mailchimp: { understands: ["Your recent campaigns: drafts, scheduled and sent"], read: ["Read campaigns and their summary stats"], act: [], wont: TOKEN_WONT, synonyms: ["email marketing", "newsletter", "campaigns", "marketing", "audience"], unlocks: ["See what's scheduled or unsent", "Track campaign results"] },
  greenhouse: { understands: ["Candidates with recent activity"], read: ["Read candidates, applications and jobs"], act: [], wont: TOKEN_WONT, synonyms: ["recruiting", "hiring", "candidates", "ats", "applicants", "hr"], unlocks: ["See who moved in your pipeline", "Prepare for interviews"] },
  lever: { understands: ["Active candidates and their stage"], read: ["Read opportunities (candidates)"], act: [], wont: TOKEN_WONT, synonyms: ["recruiting", "hiring", "candidates", "ats", "applicants", "hr"], unlocks: ["See who moved in your pipeline", "Prepare for interviews"] },
  gorgias: { understands: ["Open support tickets, unread first"], read: ["Read tickets and customers"], act: [], wont: TOKEN_WONT, synonyms: ["support", "helpdesk", "tickets", "customer service", "ecommerce", "shopify"], unlocks: ["Spot unread customer tickets", "Know who's waiting"] },
  shipstation: { understands: ["Orders waiting to ship"], read: ["Read orders and stores"], act: [], wont: TOKEN_WONT, synonyms: ["shipping", "orders", "fulfillment", "ecommerce", "logistics", "packages"], unlocks: ["Catch orders sitting unshipped", "Keep fulfillment moving"] },
  bamboohr: { understands: ["Time-off requests waiting for approval"], read: ["Read time-off requests (admins and managers)"], act: [], wont: TOKEN_WONT, synonyms: ["hr", "human resources", "time off", "pto", "leave", "employees", "people"], unlocks: ["Approve time off on time", "See who's out"] },
  shippo: { understands: ["Orders that haven't shipped yet"], read: ["Read orders"], act: [], wont: TOKEN_WONT, synonyms: ["shipping", "labels", "orders", "fulfillment", "logistics", "packages"], unlocks: ["Catch unshipped orders", "Keep fulfillment moving"] },
  cin7: { understands: ["Open sales orders in Cin7 Core"], read: ["Read sales orders"], act: [], wont: TOKEN_WONT, synonyms: ["inventory", "orders", "stock", "warehouse", "wholesale", "dear systems"], unlocks: ["See orders still open", "Keep stock and sales aligned"] },
  benchling: { understands: ["Recently edited lab notebook entries you can see"], read: ["Read notebook entries (your own permissions)"], act: [], wont: TOKEN_WONT, synonyms: ["lab", "notebook", "research", "science", "eln", "biotech", "experiments"], unlocks: ["See what changed in the lab", "Keep experiments in view"] },
  servicenow: { understands: ["Active incidents, most recently updated first"], read: ["Read incidents (read-only user recommended)"], act: [], wont: TOKEN_WONT, synonyms: ["it", "itsm", "incidents", "tickets", "helpdesk", "service desk"], unlocks: ["Spot urgent incidents", "Know who is waiting on IT"] },  netlify: { understands: ["The latest deploy of each of your sites"], read: ["Read your sites and deploys"], act: [], wont: TOKEN_WONT, synonyms: ["hosting", "deployments", "deploy", "developer", "web", "static sites"], unlocks: ["Catch failed deploys", "Link deploys to your work"] },
});

const DEFAULT_META: AppMeta = {
  understands: ["Information you authorize"],
  read: ["Read the data you authorize"],
  act: [],
  wont: READ_ONLY_WONT,
  synonyms: [],
  unlocks: ["Bring this app's activity into your work context"],
};

export const appMeta = (providerId: string | null | undefined): AppMeta => (providerId && APP_META[providerId]) || DEFAULT_META;

/** Extra search terms: a query for "pharmacy" or "accounting" should find apps by what they're for, not just their name. */
export const CATEGORY_SYNONYMS: Record<string, string[]> = {
  email: ["gmail", "outlook", "mail", "microsoft 365", "google workspace"],
  mail: ["gmail", "outlook", "email"],
  accounting: ["quickbooks", "xero", "netsuite", "bookkeeping", "invoices", "finance"],
  bookkeeping: ["quickbooks", "xero", "accounting"],
  pharmacy: ["pioneerrx", "primerx", "qs/1", "pharmacy", "prescription", "dispensing"],
  chat: ["slack", "teams", "messaging", "discord"],
  code: ["github", "gitlab", "git", "bitbucket", "repositories"],
  developer: ["github", "gitlab", "jira", "linear"],
  tasks: ["asana", "jira", "linear", "trello", "todo", "monday"],
  crm: ["hubspot", "salesforce", "customers", "sales"],
  files: ["drive", "dropbox", "box", "onedrive", "storage"],
  calendar: ["google calendar", "outlook", "schedule", "meetings"],
  meetings: ["zoom", "calendar", "teams", "meet"],
  payments: ["stripe", "quickbooks", "paypal", "billing"],
  design: ["figma", "sketch", "canva", "adobe"],
  docs: ["notion", "drive", "confluence", "documents"],
};
