import { notFound } from "next/navigation";
import { HomePreview } from "./client";

/** Development-only design preview. Returns 404 in production. */
export default async function HomePreviewPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { mode } = await searchParams;
  return <HomePreview mode={mode === "empty" ? "empty" : "full"} />;
}
