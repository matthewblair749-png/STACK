"use client";

import { MessageList } from "@/components/app/message-list";

export default function ConversationsPage() {
  return <MessageList group="chat" title="Conversations" subtitle="Chat threads from your connected messaging apps." noun="conversations" />;
}
