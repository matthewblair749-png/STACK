import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireSession } from "@/server/workspace";
import { handleApiError } from "@/server/api-error";

export async function GET() {
  try {
    const session = await requireSession();
    const progress = await db.onboardingProgress.findUnique({ where: { userId: session.user.id } });
    return NextResponse.json({ progress });
  } catch (err) {
    return handleApiError(err, "GET /api/onboarding/progress failed");
  }
}

interface UpdateProgressBody {
  currentStep?: number;
  professionSlug?: string | null;
  selectedAppSlugs?: string[];
  referralSource?: string | null;
  selectedPlan?: string | null;
  billingInterval?: string | null;
  completed?: boolean;
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = (await req.json()) as UpdateProgressBody;

    const data = {
      ...(body.currentStep !== undefined ? { currentStep: body.currentStep } : {}),
      ...(body.professionSlug !== undefined ? { professionSlug: body.professionSlug } : {}),
      ...(body.selectedAppSlugs !== undefined ? { selectedAppSlugs: body.selectedAppSlugs } : {}),
      ...(body.referralSource !== undefined ? { referralSource: body.referralSource } : {}),
      ...(body.selectedPlan !== undefined ? { selectedPlan: body.selectedPlan } : {}),
      ...(body.billingInterval !== undefined ? { billingInterval: body.billingInterval } : {}),
      ...(body.completed !== undefined ? { completed: body.completed } : {}),
    };

    const progress = await db.onboardingProgress.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...data },
      update: data,
    });

    return NextResponse.json({ progress });
  } catch (err) {
    return handleApiError(err, "PATCH /api/onboarding/progress failed");
  }
}
