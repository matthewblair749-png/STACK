import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSessionAndWorkspace } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { memberToPerson } from "@/server/mappers";

export async function GET() {
  try {
    const { session, workspaceId, role } = await requireSessionAndWorkspace();
    const members = await db.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { name: true, email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      people: members.map(memberToPerson),
      // Teammates see each other's name and email (that's how you recognise who you're working with),
      // never anything from their connected apps.
      members: members.map((m) => ({
        userId: m.userId,
        name: m.user.name ?? m.user.email ?? "Unnamed",
        email: m.user.email,
        image: m.user.image,
        role: m.role,
        joinedAt: m.createdAt.toISOString(),
        isYou: m.userId === session.user.id,
      })),
      me: { userId: session.user.id, role },
    });
  } catch (err) {
    return handleApiError(err, "GET /api/workspace/members failed");
  }
}
