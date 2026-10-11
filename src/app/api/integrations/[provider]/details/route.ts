import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { RETENTION } from "@/server/sync/orchestrator";

const asMeta = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/**
 * Everything the "Manage connection" panel shows for the caller's own connection: which account, what was granted,
 * recent sync runs and the audit history. Scoped to the signed-in person in their current workspace; never
 * returns tokens.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const userId = session.user.id;
    const row = await db.integration.findUnique({
      where: { workspaceId_userId_provider: { workspaceId, userId, provider } },
      select: { scopes: true, metadata: true, createdAt: true, lastSyncAt: true, lastSyncAttemptAt: true, lastSyncError: true, syncError: true },
    });

    const [jobs, history] = await Promise.all([
      db.syncJob.findMany({
        where: { workspaceId, userId, provider },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { status: true, reason: true, attempts: true, createdAt: true, finishedAt: true, lastError: true },
      }),
      db.auditEvent.findMany({
        where: { workspaceId, userId, target: provider, action: { startsWith: "integration." } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { action: true, createdAt: true, detail: true },
      }),
    ]);

    const meta = asMeta(row?.metadata);
    return NextResponse.json({
      connected: !!row,
      connectedAt: row?.createdAt ?? null,
      account: typeof meta.account === "string" ? meta.account : null,
      method: meta.method === "token" ? "token" : row ? "oauth" : null,
      grantedScopes: row?.scopes ?? [],
      lastSyncAt: row?.lastSyncAt ?? null,
      lastSyncAttemptAt: row?.lastSyncAttemptAt ?? null,
      problem: row?.syncError ?? row?.lastSyncError ?? null,
      jobs,
      history: history.map((h) => ({ action: h.action, at: h.createdAt, detail: asMeta(h.detail) })),
      retention: RETENTION,
    });
  } catch (err) {
    return handleApiError(err, "GET /api/integrations/[provider]/details failed");
  }
}
