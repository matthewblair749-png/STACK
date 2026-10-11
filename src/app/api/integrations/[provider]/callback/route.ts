import { after, NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { encrypt } from "@/server/crypto";
import { getProvider } from "@/server/integrations/registry";
import { friendlyProviderError } from "@/server/integrations/errors";
import { redirectBase, relayTarget } from "@/server/integrations/redirect";
import { audit } from "@/server/audit";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { oauthCookieName, safeReturnPath, verifyOAuthState } from "@/server/integrations/oauth-state";
import { enqueueSync, processSyncJobs } from "@/server/sync/jobs";

export const maxDuration = 60;

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
    const res = NextResponse.redirect(integrationsUrl);
    // A sign-in state is single-use, whether or not it worked.
    res.cookies.delete(oauthCookieName(provider.id));
    return res;
  };

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieName = oauthCookieName(provider.id);
  const cookieValue = req.cookies.get(cookieName)?.value;

  if (req.nextUrl.searchParams.get("error")) {
    // Never echo the provider's text back: it's raw, and anyone can put anything in this URL.
    const errCode = req.nextUrl.searchParams.get("error");
    const reason = req.nextUrl.searchParams.get("error_description") ?? errCode;
    console.warn(`${provider.label} sign-in returned an error:`, reason?.slice(0, 300));
    if (errCode === "access_denied") return fail(`You cancelled connecting ${provider.label}. Connect again whenever you're ready.`);
    return fail(friendlyProviderError(provider.label, new Error(reason ?? ""), "connect"));
  }
  if (!code) return fail(`${provider.label} sign-in response was invalid. Try connecting again.`);

  // CSRF / mix-up protection: the cookie must be ours (signed), fresh, for this provider, and match the state
  // the provider sent back.
  const check = verifyOAuthState(cookieValue, state, provider.id);
  if (!check.ok) {
    console.warn(`${provider.label} callback rejected: ${check.reason}`);
    return fail(check.reason === "expired" ? `${provider.label} sign-in took too long. Try connecting again.` : `${provider.label} sign-in couldn't be verified. Try connecting again.`);
  }
  const { workspaceId, userId: startedBy, fields, returnTo, codeVerifier } = check.payload;
  const back = safeReturnPath(returnTo);
  if (back) integrationsUrl = new URL(back, req.nextUrl.origin);

  try {
    const { session } = await requireSessionAndWorkspace(workspaceId);
    // A sign-in started by one person can't be completed into someone else's account.
    if (session.user.id !== startedBy) return fail(`${provider.label} sign-in was started by a different account. Try connecting again.`);
    const redirectUri = new URL(`/api/integrations/${provider.id}/callback`, redirectBase(provider.id, req.nextUrl.origin)).toString();
    const tokens = await provider.exchangeCode(code, redirectUri, { query: req.nextUrl.searchParams, fields, codeVerifier });

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
    // The first sync runs in the background, after the person is already back in STACK.
    await enqueueSync(workspaceId, session.user.id, provider.id, "connect");
    const filter = { workspaceId, userId: session.user.id };
    after(() => processSyncJobs({ budgetMs: 45_000, filter }).catch((e) => console.error("initial sync failed", e)));
    integrationsUrl.searchParams.set("connected", provider.id);
    const response = NextResponse.redirect(integrationsUrl);
    response.cookies.delete(cookieName);
    return response;
  } catch (err) {
    console.error(`${provider.label} OAuth callback failed`, err);
    return fail(friendlyProviderError(provider.label, err, "connect"));
  }
}
