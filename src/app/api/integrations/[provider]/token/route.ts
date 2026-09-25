import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { encrypt } from "@/server/crypto";
import { getProvider } from "@/server/integrations/registry";
import { requireSessionAndWorkspace, UnauthorizedError, ForbiddenError } from "@/server/workspace";
import { audit } from "@/server/audit";

/**
 * Connects an app with an access token the user created in that app. The token is checked against the app
 * first (so a wrong paste is caught immediately), then stored encrypted like any other connection. It is never
 * logged and never returned to the browser.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: id } = await params;
  const provider = getProvider(id);
  if (!provider?.tokenConnect) return NextResponse.json({ error: "This app can't be connected with a token." }, { status: 400 });

  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const body = (await req.json().catch(() => ({}))) as { token?: unknown; fields?: Record<string, unknown> };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (token.length < 20 || token.length > 600 || /\s/.test(token)) {
      return NextResponse.json({ error: "That doesn't look like a valid token. Copy it again without spaces." }, { status: 400 });
    }

    const fields: Record<string, string> = {};
    for (const f of provider.tokenConnect.fields ?? []) {
      const v = typeof body.fields?.[f.name] === "string" ? (body.fields[f.name] as string).trim() : "";
      if (!v) return NextResponse.json({ error: `${f.label} is required.` }, { status: 400 });
      fields[f.name] = v.slice(0, 300);
    }

    let account: string | undefined;
    let extra: Record<string, unknown> = {};
    try {
      const result = await provider.tokenConnect.validate(token, fields);
      account = result.account;
      extra = result.metadata ?? {};
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      // A readable message thrown on purpose (e.g. an invalid store address) is shown as-is.
      if (err instanceof Error && !/\b\d{3}\b/.test(raw) && raw.length < 160) return NextResponse.json({ error: raw }, { status: 400 });
      const status = raw.match(/\b(\d{3})\b/)?.[1];
      const reason = status === "401" || status === "403" ? "the app rejected it. Check it was copied fully and hasn't expired." : "it couldn't be checked. Try again in a moment.";
      return NextResponse.json({ error: `That token didn't work: ${reason}` }, { status: 400 });
    }

    const metadata = { ...extra, account, method: "token" } as Prisma.InputJsonValue;
    await db.integration.upsert({
      where: { workspaceId_userId_provider: { workspaceId, userId: session.user.id, provider: id } },
      create: { workspaceId, userId: session.user.id, provider: id, accessToken: encrypt(token), refreshToken: null, expiresAt: null, scopes: [], metadata },
      update: { accessToken: encrypt(token), refreshToken: null, expiresAt: null, metadata, syncError: null, lastSyncError: null },
    });
    await audit({ workspaceId, userId: session.user.id, action: "integration.connected", target: id, detail: { method: "token" } });

    return NextResponse.json({ ok: true, account });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error("POST /api/integrations/[provider]/token failed");
    return NextResponse.json({ error: "Couldn't save the connection. Try again." }, { status: 500 });
  }
}
