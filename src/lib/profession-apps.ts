// Professions and their recommended apps now live in the database (App and
// Profession models, seeded via prisma/seed.mjs) and are served through
// /api/professions and /api/apps — not hardcoded here. This file only keeps
// the fixed "How did you hear about us?" options, which aren't data the
// product needs to edit without a deploy.

export interface ReferralSource {
  id: string;
  label: string;
}

export const referralSources: ReferralSource[] = [
  { id: "google", label: "Google" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "instagram", label: "Instagram" },
  { id: "x", label: "X" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "reddit", label: "Reddit" },
  { id: "friend-or-coworker", label: "Friend or coworker" },
  { id: "company", label: "My company" },
  { id: "advertisement", label: "Advertisement" },
  { id: "other", label: "Other" },
];
