import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSession } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";
import { deleteUserAccount } from "@/server/account";

interface UpdateUserBody {
  name?: string;
  profession?: string;
  referralSource?: string;
}

export async function GET() {
  try {
    const session = await requireSession();
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, image: true, profession: true } });
    const profession = user?.profession ? await db.profession.findUnique({ where: { slug: user.profession }, select: { slug: true, name: true, recommendedAppSlugs: true } }) : null;
    return NextResponse.json({ user, profession });
  } catch (err) {
    return handleApiError(err, "GET /api/user failed");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await req.json()) as UpdateUserBody;

    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.profession !== undefined ? { profession: body.profession || null } : {}),
        ...(body.referralSource !== undefined ? { referralSource: body.referralSource || null } : {}),
      },
      select: { id: true, name: true, email: true, image: true, profession: true, referralSource: true },
    });
    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err, "PATCH /api/user failed");
  }
}

export async function DELETE() {
  try {
    const session = await requireSession();
    await deleteUserAccount(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err, "DELETE /api/user failed");
  }
}
