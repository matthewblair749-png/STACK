import type { AppAuthType } from "@prisma/client";

/**
 * The full set of real connection states the UI is allowed to show. Never
 * collapse these into a generic "Connect" — each maps to a genuinely
 * different, honestly-communicated situation.
 */
export type ConnectionStatus =
  | "connected"
  | "error"
  | "available"
  | "needs_setup"
  | "desktop_app"
  | "external_tool"
  | "unavailable";

export function computeConnectionStatus(input: {
  authType: AppAuthType;
  hasOauthProvider: boolean;
  configured: boolean;
  connected: boolean;
  /** True when Integration.syncError is set — a permanent auth failure (revoked/expired grant). */
  hasError?: boolean;
}): ConnectionStatus {
  if (input.connected && input.hasError) return "error";
  if (input.connected) return "connected";
  if (input.authType === "DesktopApp") return "desktop_app";
  if (input.authType === "Unavailable") return "unavailable";
  // Only apps with a real connector are connectable. An ApiKey app without one is a verified key to build on
  // later, so it shows "Coming soon" like any other app STACK can't connect yet.
  const connectable = input.authType === "OAuth2" || input.authType === "ApiKey";
  if (!connectable || !input.hasOauthProvider) return "external_tool";
  return input.configured ? "available" : "needs_setup";
}

export const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected: "Connected",
  error: "Connection error",
  available: "Connect",
  needs_setup: "Needs setup",
  desktop_app: "Desktop app",
  external_tool: "Coming soon",
  unavailable: "Unavailable",
};
