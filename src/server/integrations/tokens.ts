import { db } from "@/server/db";
import { encrypt, decrypt } from "@/server/crypto";
import { getProvider } from "./registry";
import type { ConnectedTokens } from "./provider";
import { friendlyProviderError } from "./errors";

export class IntegrationAuthError extends Error {}

const asMeta = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined);

/**
 * Loads the caller's Integration row for `providerId`, decrypts its tokens,
 * and refreshes them first if they're expired (or about to be). Both the
 * sync orchestrator and the action executor call this — refresh/persist/
 * error-flip logic lives in exactly one place.
 *
 * On a refresh failure that's clearly a permanent auth failure (revoked or
 * expired grant), this sets Integration.syncError and throws
 * IntegrationAuthError so callers can surface "reconnect" rather than retry.
 * A transient network error is rethrown as-is, without touching syncError.
 */
export async function getFreshTokens(
  workspaceId: string,
  userId: string,
  providerId: string
): Promise<ConnectedTokens> {
  const row = await db.integration.findUnique({
    where: { workspaceId_userId_provider: { workspaceId, userId, provider: providerId } },
  });
  if (!row || !row.accessToken) {
    throw new IntegrationAuthError(`${providerId} is not connected.`);
  }

  const provider = getProvider(providerId);
  const expiringSoon = row.expiresAt ? row.expiresAt.getTime() - Date.now() < 60_000 : false;

  if (expiringSoon && row.refreshToken && provider?.refreshAccessToken) {
    try {
      const refreshed = await provider.refreshAccessToken(decrypt(row.refreshToken));
      await db.integration.update({
        where: { id: row.id },
        data: {
          accessToken: encrypt(refreshed.accessToken),
          ...(refreshed.refreshToken ? { refreshToken: encrypt(refreshed.refreshToken) } : {}),
          expiresAt: refreshed.expiresAt,
          scopes: refreshed.scopes,
          syncError: null,
        },
      });
      // Provider-specific details saved at connect time (a QuickBooks company, a Shopify store) survive a refresh.
      return { ...refreshed, metadata: refreshed.metadata ?? asMeta(row.metadata) };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isPermanent = /\b(400|401)\b/.test(message) || /invalid_grant|invalid_token|revoked/i.test(message);
      if (isPermanent) {
        console.warn(`token refresh for ${providerId} failed permanently:`, message.replace(/\s+/g, " ").slice(0, 500));
        await db.integration.update({ where: { id: row.id }, data: { syncError: friendlyProviderError(provider.label, err) } });
        throw new IntegrationAuthError(message);
      }
      throw err;
    }
  }

  return {
    accessToken: decrypt(row.accessToken),
    refreshToken: row.refreshToken ? decrypt(row.refreshToken) : undefined,
    expiresAt: row.expiresAt ?? undefined,
    scopes: row.scopes,
    metadata: asMeta(row.metadata),
  };
}
