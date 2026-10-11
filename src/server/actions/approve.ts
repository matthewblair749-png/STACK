import type { PendingAction, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { executePendingAction } from "./execute";
import { ActionError } from "./errors";
import { describeAction, validateActionPayload } from "./types";

/** An identical action approved this recently is almost certainly a repeat, so it needs an explicit "do it again". */
export const DUPLICATE_WINDOW_MS = 10 * 60_000;

/** Key order doesn't matter when comparing two payloads. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export type ApproveResult =
  | { status: 200; body: { action: PendingAction } }
  | { status: 400 | 404 | 409 | 502; body: { error?: string; action?: PendingAction; duplicateOf?: string; needsConfirmation?: boolean; uncertain?: boolean } };

/**
 * Approves and runs one proposed action for its owner:
 * 1. an edited payload is validated before anything is stored;
 * 2. an identical action approved in the last few minutes needs `confirmDuplicate` (double-send protection);
 * 3. the row is claimed atomically (Pending -> Approved), so two clicks can never both run it;
 * 4. it becomes Executed only after the app confirms. A failure that certainly changed nothing returns it to
 *    Pending (fix and approve again); one that might have gone through is final (Failed) and says to check the app.
 * Every outcome is audited (kind and result ids only - never message contents).
 */
export async function approvePendingAction(opts: { actionId: string; workspaceId: string; userId: string; payload?: unknown; confirmDuplicate?: boolean }): Promise<ApproveResult> {
  const existing = await db.pendingAction.findUnique({ where: { id: opts.actionId } });
  if (!existing || existing.workspaceId !== opts.workspaceId || existing.userId !== opts.userId) {
    return { status: 404, body: { error: "Action not found." } };
  }
  if (existing.status !== "Pending") return { status: 409, body: { error: "This action was already handled.", action: existing } };

  let payload = existing.payload;
  if (opts.payload !== undefined) {
    try {
      payload = validateActionPayload(existing.kind, opts.payload) as unknown as Prisma.JsonValue;
    } catch (err) {
      return { status: 400, body: { error: err instanceof Error ? err.message : "Those details aren't valid." } };
    }
  }

  if (!opts.confirmDuplicate) {
    const recent = await db.pendingAction.findMany({
      where: { workspaceId: opts.workspaceId, userId: opts.userId, kind: existing.kind, id: { not: existing.id }, status: { in: ["Approved", "Executed"] }, updatedAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) } },
      select: { id: true, payload: true },
    });
    const same = recent.find((r) => canonicalJson(r.payload) === canonicalJson(payload));
    if (same) {
      return {
        status: 409,
        body: { error: `You already approved this exact action a few minutes ago (${describeAction(existing.kind, payload as Record<string, unknown>)}). Do it again?`, duplicateOf: same.id, needsConfirmation: true },
      };
    }
  }

  // The edit and the claim are one atomic step, and only while the action is still Pending.
  const claim = await db.pendingAction.updateMany({
    where: { id: existing.id, status: "Pending" },
    data: { status: "Approved", ...(opts.payload !== undefined ? { payload: payload as Prisma.InputJsonValue } : {}) },
  });
  if (claim.count !== 1) return { status: 409, body: { error: "This action was already handled." } };
  await audit({ workspaceId: opts.workspaceId, userId: opts.userId, action: "action.approved", target: existing.id, detail: { kind: existing.kind, edited: opts.payload !== undefined } });

  const claimed = await db.pendingAction.findUniqueOrThrow({ where: { id: existing.id } });
  try {
    const resultMetadata = await executePendingAction(claimed);
    const action = await db.pendingAction.update({ where: { id: existing.id }, data: { status: "Executed", resultMetadata: resultMetadata as Prisma.InputJsonValue, errorMessage: null } });
    await audit({ workspaceId: opts.workspaceId, userId: opts.userId, action: "action.executed", target: existing.id, detail: { kind: existing.kind, result: resultMetadata } });
    return { status: 200, body: { action } };
  } catch (err) {
    // Anything not explicitly marked otherwise failed before a write was sent (tokens, permissions, STACK's own data).
    const uncertain = err instanceof ActionError && err.certainty === "unknown";
    const message = err instanceof ActionError ? err.message : `${err instanceof Error ? err.message : "Something went wrong."}${/nothing was/i.test(String(err)) ? "" : " Nothing was changed."}`;
    // Definitely not done: back to Pending with the reason, so it can be fixed and approved again. Possibly done:
    // final (Failed), so it can't be blindly retried into a double send.
    const action = await db.pendingAction.update({ where: { id: existing.id }, data: { status: uncertain ? "Failed" : "Pending", errorMessage: message } });
    await audit({ workspaceId: opts.workspaceId, userId: opts.userId, action: "action.failed", target: existing.id, detail: { kind: existing.kind, uncertain } });
    return { status: 502, body: { action, uncertain } };
  }
}
