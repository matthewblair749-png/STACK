import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";

const EMAIL_PROVIDERS = ["google", "microsoft"];
const PAGE = 40;

/**
 * Cursor-paged browsing of what the user's connected apps have actually synced. Powers Inbox
 * (email), Conversations (chat), Calendar and Files. Always scoped to workspace + user.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  try {
    const { session, workspaceId } = await requireSessionAndWorkspace();
    const sp = req.nextUrl.searchParams;
    const cursor = sp.get("cursor") ?? undefined;
    const q = sp.get("q")?.trim();
    const base = { workspaceId, userId: session.user.id };
    const page = { take: PAGE + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) };

    let items: unknown[] = [];
    if (kind === "messages") {
      const channel = sp.get("channel"); // "email" | "chat"
      const rows = await db.syncedMessage.findMany({
        where: {
          ...base,
          ...(channel === "email" ? { provider: { in: EMAIL_PROVIDERS } } : channel === "chat" ? { provider: { notIn: EMAIL_PROVIDERS } } : {}),
          ...(q ? { OR: [{ subject: { contains: q, mode: "insensitive" } }, { snippet: { contains: q, mode: "insensitive" } }, { fromName: { contains: q, mode: "insensitive" } }, { fromAddress: { contains: q, mode: "insensitive" } }] } : {}),
        },
        orderBy: { receivedAt: "desc" },
        ...page,
      });
      items = rows.map((m) => ({
        id: m.id, provider: m.provider, subject: m.subject, fromName: m.fromName, fromAddress: m.fromAddress,
        snippet: m.snippet, receivedAt: m.receivedAt.toISOString(), isUnread: m.isUnread, permalink: m.permalink,
        threadId: m.threadExternalId,
      }));
    } else if (kind === "events") {
      const from = new Date(sp.get("from") ?? Date.now() - 24 * 60 * 60 * 1000);
      const rows = await db.syncedEvent.findMany({
        where: { ...base, startAt: { gte: from }, ...(q ? { title: { contains: q, mode: "insensitive" } } : {}) },
        orderBy: { startAt: "asc" },
        ...page,
      });
      items = rows.map((e) => ({
        id: e.id, provider: e.provider, title: e.title, startAt: e.startAt.toISOString(), endAt: e.endAt.toISOString(),
        location: e.location, attendees: e.attendees, permalink: e.permalink,
      }));
    } else if (kind === "files") {
      const rows = await db.syncedFile.findMany({
        where: { ...base, ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) },
        orderBy: { modifiedAt: "desc" },
        ...page,
      });
      items = rows.map((f) => ({
        id: f.id, provider: f.provider, name: f.name, mimeType: f.mimeType, webUrl: f.webUrl, ownerName: f.ownerName, modifiedAt: f.modifiedAt.toISOString(),
      }));
    } else {
      return NextResponse.json({ error: "Unknown collection." }, { status: 404 });
    }

    const hasMore = items.length > PAGE;
    const pageItems = hasMore ? items.slice(0, PAGE) : items;
    const last = pageItems[pageItems.length - 1] as { id: string } | undefined;
    return NextResponse.json({ items: pageItems, nextCursor: hasMore ? last?.id : null });
  } catch (err) {
    return handleApiError(err, "GET /api/synced/[kind] failed");
  }
}
