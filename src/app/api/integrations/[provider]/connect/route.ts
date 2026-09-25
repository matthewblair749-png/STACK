import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/server/integrations/registry";
import { redirectBase } from "@/server/integrations/redirect";
import { requireSessionAndWorkspace, UnauthorizedError, ForbiddenError } from "@/server/workspace";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerId } = await params;
  const integrationsUrl = new URL("/integrations", req.nextUrl.origin);

  try {
    const { workspaceId } = await requireSessionAndWorkspace();

    const provider = getProvider(providerId);
    if (!provider) {
      integrationsUrl.searchParams.set("error", `Unknown integration "${providerId}".`);
      return NextResponse.redirect(integrationsUrl);
    }
    if (!provider.isConfigured()) {
      integrationsUrl.searchParams.set("error", `${provider.label}: ${provider.missingSetup().join("; ")}`);
      return NextResponse.redirect(integrationsUrl);
    }

    // Anything the provider needs before sign-in (e.g. a Shopify store address) rides along in the state cookie.
    const fields: Record<string, string> = {};
    for (const f of provider.connectFields ?? []) {
      const value = req.nextUrl.searchParams.get(f.name)?.trim();
      if (!value) {
        integrationsUrl.searchParams.set("error", `${provider.label}: ${f.label} is required.`);
        return NextResponse.redirect(integrationsUrl);
      }
      fields[f.name] = value;
    }

    // Where to land after authorizing (e.g. back in onboarding). Same-site paths only, so this can't be used to redirect elsewhere.
    const wanted = req.nextUrl.searchParams.get("returnTo") ?? "";
    const returnTo = /^\/[a-z0-9\-_/]*$/i.test(wanted) && !wanted.startsWith("//") ? wanted : "";

    const state = randomBytes(16).toString("hex");
    const redirectUri = new URL(`/api/integrations/${provider.id}/callback`, redirectBase(provider.id, req.nextUrl.origin)).toString();
    const authUrl = provider.getAuthUrl(state, redirectUri, { write: req.nextUrl.searchParams.get("write") === "1", fields });

    const res = NextResponse.redirect(authUrl);
    res.cookies.set(`stack_oauth_state_${provider.id}`, `${state}:${workspaceId}:${Buffer.from(JSON.stringify(fields)).toString("base64url")}:${Buffer.from(returnTo).toString("base64url")}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    return res;
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      const loginUrl = new URL("/login", req.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", "/integrations");
      return NextResponse.redirect(loginUrl);
    }
    if (err instanceof ForbiddenError) {
      integrationsUrl.searchParams.set("error", err.message);
      return NextResponse.redirect(integrationsUrl);
    }
    integrationsUrl.searchParams.set("error", err instanceof Error ? err.message.slice(0, 200) : "Couldn't start sign-in.");
    return NextResponse.redirect(integrationsUrl);
  }
}
