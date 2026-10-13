import { redirect } from "next/navigation";
import { inboxHref, isInboxGroupId } from "@/lib/data-groups";

/** Updates are now tabs of the Inbox; old links (including ?group=...) land on the matching tab. */
export default async function UpdatesPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const { group } = await searchParams;
  redirect(isInboxGroupId(group) ? inboxHref(group) : "/inbox");
}
