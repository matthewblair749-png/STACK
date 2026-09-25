import type { SourceApp } from "./types";

// The real, official URL for each app. Open Tabs opens this in a real
// browser tab so the user signs in on the real site — STACK never sees or
// stores credentials for these apps.
export const appOfficialUrl: Partial<Record<SourceApp, string>> = {
  gmail: "https://mail.google.com",
  outlook: "https://outlook.com",
  slack: "https://slack.com/signin",
  teams: "https://teams.microsoft.com",
  "google-calendar": "https://calendar.google.com",
  "outlook-calendar": "https://outlook.com/calendar",
  drive: "https://drive.google.com",
  dropbox: "https://www.dropbox.com",
  onedrive: "https://onedrive.live.com",
  box: "https://www.box.com",
  notion: "https://www.notion.so",
  zoom: "https://zoom.us",
  github: "https://github.com",
  asana: "https://asana.com",
  trello: "https://trello.com",
  hubspot: "https://www.hubspot.com",
  salesforce: "https://www.salesforce.com",
  shopify: "https://www.shopify.com",
  stripe: "https://dashboard.stripe.com",
  paypal: "https://www.paypal.com",
  quickbooks: "https://quickbooks.intuit.com",
  okta: "https://www.okta.com",
};

export interface OpenableApp {
  id: SourceApp;
  name: string;
  category: "Work" | "Files" | "Calendar" | "Productivity" | "CRM" | "Payments / Finance" | "Identity";
}

// Every app Open Tabs can launch. There is no "connected" state here — opening
// a tab just navigates to the app's real site, where the user signs in
// themselves; STACK never touches those credentials.
export const openableApps: OpenableApp[] = [
  { id: "gmail", name: "Gmail", category: "Work" },
  { id: "outlook", name: "Outlook", category: "Work" },
  { id: "slack", name: "Slack", category: "Work" },
  { id: "teams", name: "Microsoft Teams", category: "Work" },
  { id: "zoom", name: "Zoom", category: "Work" },
  { id: "notion", name: "Notion", category: "Work" },
  { id: "github", name: "GitHub", category: "Work" },
  { id: "drive", name: "Google Drive", category: "Files" },
  { id: "dropbox", name: "Dropbox", category: "Files" },
  { id: "onedrive", name: "OneDrive", category: "Files" },
  { id: "box", name: "Box", category: "Files" },
  { id: "google-calendar", name: "Google Calendar", category: "Calendar" },
  { id: "outlook-calendar", name: "Outlook Calendar", category: "Calendar" },
  { id: "trello", name: "Trello", category: "Productivity" },
  { id: "asana", name: "Asana", category: "Productivity" },
  { id: "hubspot", name: "HubSpot", category: "CRM" },
  { id: "salesforce", name: "Salesforce", category: "CRM" },
  { id: "shopify", name: "Shopify", category: "CRM" },
  { id: "stripe", name: "Stripe", category: "Payments / Finance" },
  { id: "paypal", name: "PayPal", category: "Payments / Finance" },
  { id: "quickbooks", name: "QuickBooks", category: "Payments / Finance" },
  { id: "okta", name: "Okta", category: "Identity" },
];
