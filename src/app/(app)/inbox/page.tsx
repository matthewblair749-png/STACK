"use client";

import { MessageList } from "@/components/app/message-list";

export default function InboxPage() {
  return <MessageList channel="email" title="Inbox" subtitle="Email from your connected accounts, newest first." noun="emails" />;
}
