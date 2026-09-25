import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { encrypt } from "@/server/crypto";
import { getProvider } from "@/server/integrations/registry";
import { redirectBase, relayTarget } from "@/server/integrations/redirect";
import { audit } from "@/server/audit";
import { requireSessionAndWorkspace } from "@/server/workspace";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerId } = await params;
  // Arrived on a provider-required public address (e.g. a tunnel)? Bounce to the app address, where the session cookies are.
  const relay = relayTarget(providerId, req.headers);
  if (relay) return NextResponse.redirect(`${relay}${req.nextUrl.pathname}${req.nextUrl.search}`);

  let integrationsUrl = new URL("/integrations", req.nextUrl.origin);

  const provider = getProvider(providerId);
  if (!provider) {
    integrationsUrl.searchParams.set("error", `Unknown integration "${providerId}".`);
    return NextResponse.redirect(integrationsUrl);
  }

  const fail = (message: string) => {
    integrationsUrl.searchParams.set("error", message);
    return NextResponse.redirect(integrationsUrl);
  };

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieName = `stack_oauth_state_${provider.id}`;
  const cookieValue = req.cookies.get(cookieName)?.value;

  if (req.nextUrl.searchParams.get("error")) {
    const reason = req.nextUrl.searchParams.get("error_description") ?? req.nextUrl.searchParams.get("error");
    return fail(`${provider.label} sign-in didn't complete${reason ? `: ${reason}` : ""}.`);
  }
  if (!code || !state || !cookieValue) {
    return fail(`${provider.label} sign-in response was invalid. Try connecting again.`);
  }

  const [expectedState, workspaceId, encodedFields, encodedReturn] = cookieValue.split(":");
  try {
    const back = encodedReturn ? Buffer.from(encodedReturn, "base64url").toString() : "";
    // Re-validated here: the cookie is ours, but a landing path must never be an outside address.
    if (/^\/[a-z0-9\-_/]*$/i.test(back) && !back.startsWith("//")) integrationsUrl = new URL(back, req.nextUrl.origin);
  } catch {
    // Keep the default landing page.
  }
  let fields: Record<string, string> = {};
  try {
    if (encodedFields) fields = JSON.parse(Buffer.from(encodedFields, "base64url").toString());
  } catch {
    fields = {};
  }
  if (state !== expectedState || !workspaceId) {
    return fail(`${provider.label} sign-in couldn't be verified. Try connecting again.`);
  }

  try {
    const { session } = await requireSessionAndWorkspace(workspaceId);
    const redirectUri = new URL(`/api/integrations/${provider.id}/callback`, redirectBase(provider.id, req.nextUrl.origin)).toString();
    const tokens = await provider.exchangeCode(code, redirectUri, { query: req.nextUrl.searchParams, fields });

    await db.integration.upsert({
      where: {
        workspaceId_userId_provider: { workspaceId, userId: session.user.id, provider: provider.id },
      },
      create: {
        workspaceId,
        userId: session.user.id,
        provider: provider.id,
        accessToken: encrypt(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        expiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        metadata: (tokens.metadata ?? {}) as Prisma.InputJsonValue,
      },
      update: {
        accessToken: encrypt(tokens.accessToken),
        ...(tokens.refreshToken ? { refreshToken: encrypt(tokens.refreshToken) } : {}),
        expiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        ...(tokens.metadata ? { metadata: tokens.metadata as Prisma.InputJsonValue } : {}),
        syncError: null,
      },
    });

    await audit({ workspaceId, userId: session.user.id, action: "integration.connected", target: provider.id, detail: { scopes: tokens.scopes } });
    integrationsUrl.searchParams.set("connected", provider.id);
    const response = NextResponse.redirect(integrationsUrl);
    response.cookies.delete(cookieName);
    return response;
  } catch (err) {
    console.error(`${provider.label} OAuth callback failed`, err);
    const detail = err instanceof Error ? err.message.replace(/\s+/g, " ").slice(0, 160) : "";
    return fail(`Connecting ${provider.label} failed${detail ? `: ${detail}` : ". Try again."}`);
  }
}
