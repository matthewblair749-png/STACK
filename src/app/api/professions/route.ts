import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { handleApiError } from "@/server/api-error";

// Public, read-only reference data — no session data leaks, safe to serve to
// any signed-in request without a workspace check.
export async function GET() {
  try {
    const professions = await db.profession.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ professions });
  } catch (err) {
    return handleApiError(err, "GET /api/professions failed");
  }
}
