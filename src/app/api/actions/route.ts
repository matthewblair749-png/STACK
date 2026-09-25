import { NextRequest, NextResponse } from "next/server";
import type { PendingActionKind } from "@prisma/client";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { validateActionPayload } from "@/server/actions/types";

const VALID_KINDS: PendingActionKind[] = ["CreateTask", "SendEmail", "SendSlackMessage", "UpdateProjectStatus", "UpdateTask", "CreateCalendarEvent"];

export async function GET() {
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const actions = await db.pendingAction.findMany({
      where: { workspaceId, userId: session.user.id, status: "Pending" },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ actions });
  } catch (err) {
    return handleApiError(err, "GET /api/actions failed");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const body = (await req.json()) as { kind?: string; payload?: unknown };

    if (!body.kind || !VALID_KINDS.includes(body.kind as PendingActionKind)) {
      return NextResponse.json({ error: `Unknown action kind "${body.kind}".` }, { status: 400 });
    }
    const kind = body.kind as PendingActionKind;
    const payload = validateActionPayload(kind, body.payload);

    const action = await db.pendingAction.create({
      data: { workspaceId, userId: session.user.id, kind, payload: payload as object },
    });
    return NextResponse.json({ action });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Invalid payload")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return handleApiError(err, "POST /api/actions failed");
  }
}
