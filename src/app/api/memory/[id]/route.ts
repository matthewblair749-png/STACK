import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { IGNORE_PREFIX } from "@/server/work/memory";

/** Forget a remembered fact. It is also marked ignored so the next sync doesn't re-add it. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const item = await db.memoryItem.findUnique({ where: { id } });
    if (!item || item.workspaceId !== workspaceId || item.userId !== session.user.id || item.key.startsWith(IGNORE_PREFIX)) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    await db.memoryItem.delete({ where: { id } });
    await db.memoryItem.upsert({
      where: { workspaceId_userId_key: { workspaceId, userId: session.user.id, key: `${IGNORE_PREFIX}${item.key}` } },
      create: { workspaceId, userId: session.user.id, key: `${IGNORE_PREFIX}${item.key}`, value: true },
      update: { value: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/memory/[id] failed");
  }
}
