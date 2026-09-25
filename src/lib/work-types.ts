/** Shapes shared by the work-state engine (server) and the dashboard / brief (client). */

export interface WorkAction {
  label: string;
  /** Runs this as a real STACK AI command. */
  command?: string;
  /** Opens a real link (an in-app route or the source item in its app). */
  href?: string;
  /** Handled by the page itself (e.g. open the new-task form). */
  intent?: "new-task" | "review-approvals";
  hint?: string;
}

export interface SourceRef {
  type: "Task" | "Project" | "SyncedMessage" | "SyncedEvent" | "SyncedFile";
  id: string;
  label: string;
  href?: string;
}

export interface PriorityItem {
  id: string;
  kind: "task" | "message" | "event" | "waiting";
  title: string;
  /** Concrete signals that produced this priority - every one is derived from real data. */
  why: string[];
  nextStep: string;
  score: number;
  due?: string;
  actions: WorkAction[];
  refs: SourceRef[];
}

export interface ProjectPulse {
  id: string;
  name: string;
  status: "OnTrack" | "AtRisk" | "Behind" | "Completed";
  completed: number;
  total: number;
  blocked: number;
  waiting: number;
  deadline?: string;
  recommendation?: string;
}

export interface WaitingItem {
  id: string;
  title: string;
  who?: string;
  since?: string;
  href?: string;
}

export interface WorkState {
  generatedAt: string;
  /** False when no connected app has synced content yet - the UI should say so honestly. */
  hasSyncedContent: boolean;
  connectedProviders: string[];
  /** Most recent successful sync across connected apps; the client re-syncs when this is stale. */
  lastSyncAt?: string;
  understand: {
    overview: string;
    counts: { importantMessages: number; upcomingMeetings: number; projectsNeedingAttention: number; openTasks: number };
    importantMessages: { id: string; from: string; subject: string; receivedAt: string; href?: string }[];
    upcomingMeetings: { id: string; title: string; startAt: string; href?: string }[];
    projectChanges: { id: string; name: string; status: string; updatedAt: string }[];
    /** Per-project summaries of what actually happened, with the apps they came from. */
    digests: ProjectDigest[];
  };
  priorities: PriorityItem[];
  act: WorkAction[];
  moveForward: {
    deadlines: { id: string; title: string; due: string; kind: "task" | "project" }[];
    projects: ProjectPulse[];
    waitingOnMe: WaitingItem[];
    waitingOnOthers: WaitingItem[];
    nextSteps: { id: string; title: string; body?: string }[];
    upNext: UpNextItem[];
    atRisk: { id: string; name: string; reason: string }[];
    nextBestAction: { title: string; why?: string; action?: WorkAction } | null;
  };
}

export interface ProjectDigest {
  projectId: string;
  name: string;
  items: string[];
  sources: { appId: string; label: string }[];
  href: string;
}

export interface UpNextItem {
  id: string;
  title: string;
  at: string;
  kind: "meeting" | "deadline" | "milestone";
  appId?: string;
  href?: string;
}

export interface ProjectCard {
  id: string;
  name: string;
  description: string;
  status: "OnTrack" | "AtRisk" | "Behind" | "Completed";
  health: "healthy" | "watch" | "at_risk";
  progress: number;
  deadline?: string;
  summary: string;
  people: { id: string; name: string }[];
  counts: { tasks: number; open: number; messages: number; files: number; meetings: number };
  blockers: number;
  blockerReason?: string;
  nextAction?: string;
}

export interface DailyBrief {
  greeting: string;
  counts: { priorities: number; meetingsToPrepare: number; projectsAtRisk: number; peopleWaiting: number; dueThisWeek: number };
  plan: { headline: string; reason: string; action?: WorkAction } | null;
  hasAnything: boolean;
}

export interface AiFinding {
  title: string;
  detail: string;
  /** Only ever set to a real item from the user's synced data / STACK rows. */
  source?: { label: string; href?: string };
}

/** A work-connected answer: what was found, why it matters, what to do next. */
export interface StructuredAnswer {
  headline: string;
  findings: AiFinding[];
  nextStep?: string;
  actions: { label: string; href: string }[];
}
export type SearchResultType = "task" | "project" | "person" | "email" | "message" | "file" | "meeting" | "company" | "app";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  /** Provider / app id whose real logo should be shown (e.g. "google", "slack"). */
  appId?: string;
  href?: string;
  external?: boolean;
}

export interface SearchResponse {
  query: string;
  /** Present when the query reads like a question - STACK can answer it from the user's data. */
  ask?: string;
  results: SearchResult[];
}