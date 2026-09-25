export type IntegrationCapability =
  | "calendar"
  | "mail"
  | "files"
  | "messages"
  | "search"
  | "issues"
  | "meetings";

export interface ConnectedTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
  metadata?: Record<string, unknown>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  organizer?: string;
  attendees?: string[];
}

export interface MailMessage {
  id: string;
  threadId?: string;
  subject: string;
  from: string;
  fromAddress?: string;
  snippet: string;
  receivedAt: string;
  isUnread?: boolean;
  permalink?: string;
}

export interface ProviderFile {
  id: string;
  name: string;
  url: string;
  modifiedAt: string;
  mimeType?: string;
  ownerName?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet?: string;
}

export interface ConnectField {
  name: string;
  label: string;
  placeholder: string;
  help?: string;
}

/** Extra context from the sign-in round trip: the callback query string, and what the user typed before connecting. */
export interface ConnectContext {
  query: URLSearchParams;
  fields: Record<string, string>;
}

/**
 * A way to connect with an access token the person creates in the app themselves (no developer app of ours
 * needed). Simpler for STACK to offer, a few more steps for the user, and the token never leaves their account
 * settings unless they paste it here.
 */
export interface TokenConnect {
  label: string;
  placeholder: string;
  helpUrl: string;
  steps: string[];
  /** Extra details needed alongside the token (a store address, a team). */
  fields?: ConnectField[];
  /** Checks the token really works and says whose account it is. Throws a readable Error if not. `metadata` is saved with the connection. */
  validate(token: string, fields: Record<string, string>): Promise<{ account?: string; metadata?: Record<string, unknown> }>;
}

export interface IntegrationProvider {
  id: string;
  label: string;
  capabilities: IntegrationCapability[];

  /** Whether this provider has everything it needs to run a real OAuth flow right now. */
  isConfigured(): boolean;

  /** Human-readable env vars (and any other setup) still missing, for UI messaging. */
  missingSetup(): string[];

  /** Optional: connect with an access token the user creates themselves, instead of (or before) OAuth is set up. */
  tokenConnect?: TokenConnect;

  /** Details the user must give before sign-in can start (e.g. a Shopify store address). */
  connectFields?: ConnectField[];

  /** `write: true` additionally asks for permission to send/change things (used only when the user wants that). */
  getAuthUrl(state: string, redirectUri: string, opts?: { write?: boolean; fields?: Record<string, string> }): string;
  exchangeCode(code: string, redirectUri: string, ctx?: ConnectContext): Promise<ConnectedTokens>;
  refreshAccessToken?(refreshToken: string): Promise<ConnectedTokens>;

  search?(tokens: ConnectedTokens, query: string): Promise<SearchResult[]>;
  getCalendarEvents?(tokens: ConnectedTokens): Promise<CalendarEvent[]>;
  getMessages?(tokens: ConnectedTokens): Promise<MailMessage[]>;
  getFiles?(tokens: ConnectedTokens): Promise<ProviderFile[]>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(providerLabel: string, missing: string[]) {
    super(`${providerLabel} is not configured — ${missing.join("; ")}.`);
    this.name = "ProviderNotConfiguredError";
  }
}

/**
 * A provider whose OAuth flow and data methods are not implemented yet. isConfigured()
 * is always false — setting env vars alone wouldn't make this provider work, because the
 * actual token exchange isn't built. This keeps the UI honest ("Needs setup") instead of
 * showing a Connect button that would fail.
 */
export function createUnimplementedProvider(opts: {
  id: string;
  label: string;
  capabilities: IntegrationCapability[];
  envVars: string[];
}): IntegrationProvider {
  const missing = () => [
    `requires ${opts.envVars.join(", ")}`,
    "and this provider's connector is not implemented yet",
  ];
  return {
    id: opts.id,
    label: opts.label,
    capabilities: opts.capabilities,
    isConfigured: () => false,
    missingSetup: missing,
    getAuthUrl: () => {
      throw new ProviderNotConfiguredError(opts.label, missing());
    },
    exchangeCode: async () => {
      throw new ProviderNotConfiguredError(opts.label, missing());
    },
  };
}
