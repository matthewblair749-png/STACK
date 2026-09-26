import type { IntegrationCapability, IntegrationProvider, TokenConnect } from "../provider";

/**
 * An app that connects only with a token the user creates in the app - there is no sign-in flow to run,
 * so there is nothing for STACK to register. `isConfigured()` is false on purpose: it means "no developer
 * app of ours", and the connection screen uses `tokenConnect` instead. Data methods are passed in.
 */
export function tokenOnlyProvider(
  opts: {
    id: string;
    label: string;
    capabilities: IntegrationCapability[];
    tokenConnect: TokenConnect;
  } & Pick<IntegrationProvider, "getMessages" | "getCalendarEvents" | "getFiles">,
): IntegrationProvider {
  const { id, label, capabilities, tokenConnect, getMessages, getCalendarEvents, getFiles } = opts;
  const unsupported = () => {
    throw new Error(`${label} connects with your own token, not a sign-in flow.`);
  };
  return {
    id,
    label,
    capabilities,
    isConfigured: () => false,
    missingSetup: () => [`${label} connects with a token you create in ${label}`],
    tokenConnect,
    getAuthUrl: unsupported,
    exchangeCode: async () => unsupported(),
    getMessages,
    getCalendarEvents,
    getFiles,
  };
}

/** "acme", "acme.example.com" or a pasted URL -> a bare host name; anything that isn't a plain public host name is refused. */
export function cleanHost(input: string, mustEndWith: string, example: string): string {
  const host = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[/?#].*$/, "");
  const full = host.includes(".") ? host : `${host}${mustEndWith}`;
  // Only the app's own domain: this value becomes a server-side request, so it must never point anywhere else.
  if (!full.endsWith(mustEndWith) || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(full) || full.length > 100) {
    throw new Error(`Enter your address like ${example}.`);
  }
  return full;
}
