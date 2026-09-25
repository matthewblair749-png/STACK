import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";

/** Records a security-relevant event. Never pass tokens, secrets or message content in `detail`. Failures are logged, never thrown. */
export async function audit(event: { workspaceId: string; userId?: string; action: string; target?: string; detail?: Record<string, unknown> }) {
  try {
    await db.auditEvent.create({
      data: { workspaceId: event.workspaceId, userId: event.userId, action: event.action, target: event.target, detail: (event.detail ?? undefined) as Prisma.InputJsonValue | undefined },
    });
  } catch (err) {
    console.error("audit write failed", err);
  }
}
