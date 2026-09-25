/** Shapes returned by GET /api/apps (the catalog joined with the caller's real connection state). */
export type Health = "connected" | "pending" | "needs_attention" | "expired";
export type AppStatus = "connected" | "error" | "available" | "needs_setup" | "desktop_app" | "external_tool" | "unavailable";

export interface CatalogApp {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  officialWebsite?: string | null;
  brandColor?: string | null;
  logoPath?: string | null;
  hasRealLogo: boolean;
  authType: "OAuth2" | "DesktopApp" | "ExternalTool" | "Unavailable";
  isUniversal: boolean;
  oauthProviderId: string | null;
  status: AppStatus;
  supported: boolean;
  configured: boolean;
  connected: boolean;
  missingSetup: string[];
  connectFields?: { name: string; label: string; placeholder: string; help?: string }[];
  setup?: {
    consoleUrl: string;
    consoleLabel: string;
    steps: string[];
    vars: { name: string; label: string; secret?: boolean }[];
    redirectUrl: string;
    canSave: boolean;
  };
  health: Health | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  account?: string;
  counts: { messages: number; events: number; files: number } | null;
  meta: { understands: string[]; read: string[]; act: string[]; actNote?: string; wont: string[]; unlocks: string[] } | null;
  recommended: boolean;
}

export interface CatalogResponse {
  apps: CatalogApp[];
  recommended: string[];
  profession: { slug: string; name: string } | null;
  summary: { connected: number; needsAttention: number; available: number; comingSoon: number; total: number };
}

export type QueueState = "waiting" | "connecting" | "syncing" | "done" | "failed" | "skipped";
export interface QueueItem {
  provider: string;
  name: string;
  state: QueueState;
  detail?: string;
}

/** What one real sync of one app returned. */
export interface SyncOutcome {
  provider: string;
  messages?: number;
  events?: number;
  files?: number;
  error?: string;
}

export const QUEUE_KEY = "stack-connect-queue";
export const REVEAL_KEY = "stack-reveal-pending";

export function healthLabel(app: CatalogApp, syncing: boolean): { text: string; tone: "ok" | "warn" | "bad" | "info" | "muted" } {
  if (!app.connected) return { text: "Not connected", tone: "muted" };
  if (syncing) return { text: "Syncing", tone: "info" };
  switch (app.health) {
    case "expired":
      return { text: "Connection expired", tone: "bad" };
    case "needs_attention":
      return { text: "Needs attention", tone: "warn" };
    case "pending":
      return { text: "Waiting for first sync", tone: "info" };
    default:
      return { text: "Connected", tone: "ok" };
  }
}

export function healthMessage(app: CatalogApp): string | null {
  if (app.health === "expired") return "Your authorization expired. Reconnect to continue syncing.";
  if (app.health === "needs_attention") return app.lastSyncError ?? "The last sync didn't complete.";
  return null;
}
