/** Which part of STACK each connected app's data belongs in. Shared by the API (filtering) and the UI (tabs). */
export type DataGroupId = "email" | "chat" | "work" | "support" | "customers" | "money" | "orders" | "dev" | "people" | "other";

export interface DataGroup {
  id: DataGroupId;
  label: string;
  /** What the person will find here. */
  blurb: string;
  noun: string;
  providers: string[];
}

export const DATA_GROUPS: DataGroup[] = [
  { id: "email", label: "Email", blurb: "Email from your connected accounts, newest first.", noun: "emails", providers: ["google", "microsoft"] },
  { id: "chat", label: "Conversations", blurb: "Chat threads from your connected messaging apps.", noun: "conversations", providers: ["slack"] },
  { id: "work", label: "Tasks & issues", blurb: "Tasks, cards and issues assigned to you, and code reviews waiting on you.", noun: "tasks and issues", providers: ["asana", "jira", "linear", "trello", "clickup", "monday", "github", "gitlab", "canvas"] },
  { id: "support", label: "Support", blurb: "Customer tickets and conversations that need a reply.", noun: "support items", providers: ["zendesk", "intercom", "gorgias", "servicenow"] },
  { id: "customers", label: "Customers & sales", blurb: "Deals, opportunities and marketing campaigns.", noun: "deals and campaigns", providers: ["hubspot", "salesforce", "mailchimp"] },
  { id: "money", label: "Money", blurb: "Payments, failed charges and unpaid invoices.", noun: "payments and invoices", providers: ["stripe", "quickbooks", "freshbooks"] },
  { id: "orders", label: "Orders & shipping", blurb: "Orders waiting to ship and their status.", noun: "orders", providers: ["shopify", "shipstation", "shippo", "cin7"] },
  { id: "dev", label: "Deploys", blurb: "Recent deployments, including failed ones.", noun: "deploys", providers: ["vercel", "netlify"] },
  { id: "people", label: "People & hiring", blurb: "Candidates in your pipeline and time-off requests.", noun: "candidates and requests", providers: ["greenhouse", "lever", "bamboohr"] },
  { id: "other", label: "Other updates", blurb: "Activity from other connected apps.", noun: "updates", providers: ["benchling", "clio"] },
];

export const GROUP_BY_ID = Object.fromEntries(DATA_GROUPS.map((g) => [g.id, g])) as Record<DataGroupId, DataGroup>;

export function isDataGroupId(id: string | null | undefined): id is DataGroupId {
  return !!id && id in GROUP_BY_ID;
}

/** The groups that appear in the Updates tab (email, chat and tasks have their own tabs). */
export const UPDATE_GROUPS = DATA_GROUPS.filter((g) => g.id !== "email" && g.id !== "chat" && g.id !== "work");

// Calendar and Files aren't DATA_GROUPS (those pages show every connected provider generically,
// unfiltered) - but a person connecting one of these still deserves to be told where to look.
const CALENDAR_PROVIDERS = new Set(["google", "microsoft", "calendly", "clio"]);
const FILE_PROVIDERS = new Set(["google", "microsoft", "notion", "dropbox", "box", "figma"]);

export interface Destination {
  label: string;
  href: string;
}

/** Every tab a connected app's real data will actually show up in - used so the connect screen and
 * the app's detail view can honestly say where to look, instead of a vague "unlocks" blurb. */
export function destinationsFor(providerId: string): Destination[] {
  const out: Destination[] = [];
  if (GROUP_BY_ID.email.providers.includes(providerId)) out.push({ label: "Inbox", href: "/inbox" });
  if (GROUP_BY_ID.chat.providers.includes(providerId)) out.push({ label: "Conversations", href: "/messages" });
  if (GROUP_BY_ID.work.providers.includes(providerId)) out.push({ label: "My Work", href: "/tasks" });
  for (const g of UPDATE_GROUPS) {
    if (g.providers.includes(providerId)) out.push({ label: `Updates - ${g.label}`, href: `/updates?group=${g.id}` });
  }
  if (CALENDAR_PROVIDERS.has(providerId)) out.push({ label: "Calendar", href: "/calendar" });
  if (FILE_PROVIDERS.has(providerId)) out.push({ label: "Files", href: "/files" });
  return out;
}
