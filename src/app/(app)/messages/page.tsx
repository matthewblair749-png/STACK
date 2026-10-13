import { redirect } from "next/navigation";

/** Conversations is now the Chat tab of the Inbox; old links land there (a search, ?q=, carries over). */
export default async function ConversationsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  redirect(q ? `/inbox?group=chat&q=${encodeURIComponent(q)}` : "/inbox?group=chat");
}
