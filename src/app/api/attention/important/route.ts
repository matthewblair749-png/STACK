import { NextRequest, NextResponse } from "next/server";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { importantMessages } from "@/server/attention";
import { isInboxGroupId } from "@/lib/data-groups";

/** The few messages in one Inbox tab that most likely need the person, each with the reasons why. */
export async function GET(req: NextRequest) {
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const group = req.nextUrl.searchParams.get("group");
    if (!isInboxGroupId(group)) return NextResponse.json({ error: "Unknown group." }, { status: 400 });
    return NextResponse.json({ items: await importantMessages(workspaceId, session.user.id, [group], 5) });
  } catch (err) {
    return handleApiError(err, "GET /api/attention/important failed");
  }
}
