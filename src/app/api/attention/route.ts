import { NextRequest, NextResponse } from "next/server";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { attentionCounts } from "@/server/attention";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * What needs the signed-in person: important Inbox items (per tab) and tasks due by the end of their day.
 * `dayEnd` is the end of today in the person's own time zone, sent by the browser; anything implausible
 * falls back to 24 hours from now.
 */
export async function GET(req: NextRequest) {
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const asked = Date.parse(req.nextUrl.searchParams.get("dayEnd") ?? "");
    const now = Date.now();
    const dayEnd = new Date(Number.isFinite(asked) && asked > now - DAY_MS && asked < now + 2 * DAY_MS ? asked : now + DAY_MS);
    return NextResponse.json(await attentionCounts(workspaceId, session.user.id, dayEnd));
  } catch (err) {
    return handleApiError(err, "GET /api/attention failed");
  }
}
