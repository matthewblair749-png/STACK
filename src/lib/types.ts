export type Priority = "normal" | "important" | "urgent";

export type SourceApp =
  | "gmail"
  | "outlook"
  | "slack"
  | "teams"
  | "google-calendar"
  | "outlook-calendar"
  | "drive"
  | "dropbox"
  | "onedrive"
  | "box"
  | "notion"
  | "zoom"
  | "github"
  | "asana"
  | "trello"
  | "hubspot"
  | "salesforce"
  | "shopify"
  | "stripe"
  | "paypal"
  | "quickbooks"
  | "okta"
  | "stack";

export interface Person {
  id: string;
  name: string;
  initials: string;
  role: string;
  color: "blue" | "yellow" | "red" | "neutral";
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  done: boolean;
  priority: Priority;
  projectId?: string;
  assigneeId?: string;
  dueDate?: string;
  labels: string[];
  subtasks: Subtask[];
  source: SourceApp;
  createdAt: string;
  status?: "Todo" | "InProgress" | "Blocked" | "Done";
  blockedReason?: string | null;
  waitingOnId?: string | null;
  /** Set for items that live in another app (Asana, Jira, ...). They're shown in My Work but changed in that app. */
  external?: { provider: string; url?: string; container?: string };
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: "blue" | "yellow" | "red";
  progress: number;
  taskCount: number;
  completedCount: number;
  dueDate: string;
  memberIds: string[];
  /** AI-generated summary. Undefined until STACK AI has produced one for this project. */
  aiSummary?: string;
  status: "on-track" | "at-risk" | "behind";
  /** Recent progress snapshots (demo trend data), oldest to newest, ending at `progress`. */
  progressHistory?: number[];
}

export interface Message {
  id: string;
  source: SourceApp;
  from: string;
  subject: string;
  preview: string;
  time: string;
  urgent: boolean;
  unread: boolean;
  bucket: "urgent" | "today" | "this-week" | "later";
}

export interface Meeting {
  id: string;
  title: string;
  time: string;
  durationMin: number;
  source: SourceApp;
  attendees: string[];
  projectId?: string;
  relatedTasks: number;
  link?: string;
}

export interface FileItem {
  id: string;
  name: string;
  kind: "doc" | "sheet" | "slide" | "pdf" | "image" | "folder";
  source: SourceApp;
  owner: string;
  updatedAt: string;
  size: string;
  favorite?: boolean;
}

export interface Integration {
  id: string;
  name: string;
  category: "Work" | "Files" | "Calendar" | "Productivity" | "CRM" | "Payments / Finance" | "Identity";
  description: string;
  connected: boolean;
  lastSynced?: string;
  accent: "blue" | "yellow" | "red" | "neutral";
  /** Whether the provider has real credentials configured server-side. Undefined means "yes" (used by static/demo listings). */
  configured?: boolean;
  /** Human-readable reasons `configured` is false, e.g. missing env vars. */
  missingSetup?: string[];
  /** Developer-side setup checklist for an app that isn't configured yet. */
  setup?: {
    consoleUrl: string;
    consoleLabel: string;
    steps: string[];
    vars: { name: string; label: string; secret?: boolean }[];
    redirectUrl: string;
    /** False on a hosted deploy, where credentials belong in the host's environment settings. */
    canSave: boolean;
  };
  /** Details to ask for before sign-in starts (e.g. a Shopify store address). */
  connectFields?: { name: string; label: string; placeholder: string; help?: string }[];
  /** One of the real connection states from `computeConnectionStatus()`. Undefined for static/demo listings. */
  status?: "connected" | "error" | "available" | "needs_setup" | "desktop_app" | "external_tool" | "unavailable";
  officialWebsite?: string | null;
  brandColor?: string | null;
  logoPath?: string | null;
}

/** A real "what matters" signal computed by the insight engine — never invented client-side. */
export interface Insight {
  id: string;
  level: "Urgent" | "Important" | "Info";
  category: string;
  title: string;
  body?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  status: "Open" | "Dismissed";
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  count: number;
  time: string;
  kind: "task" | "message" | "meeting" | "project" | "mention";
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
}

export interface AutomationStep {
  id: string;
  kind: "trigger" | "ai" | "find" | "action" | "notify";
  label: string;
  detail: string;
}

export interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  runs: number;
  steps: AutomationStep[];
}

export interface OpenTab {
  id: string;
  appId: SourceApp;
  title: string;
  pinned: boolean;
  refreshKey: number;
}

export interface RecentlyClosedTab {
  id: string;
  appId: SourceApp;
  title: string;
  closedAt: number;
}
