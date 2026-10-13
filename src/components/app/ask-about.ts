"use client";

import { providerLabel } from "@/lib/providers-meta";
import { ATTACHMENT_STORAGE_KEY } from "./ask-stack-bar";

/**
 * Opens STACK AI already focused on one item. The item travels as an attachment, not inside the question:
 * the AI treats attachments as data, so an email that says "ignore your instructions" can't steer it.
 */
export function askStackAbout(push: (href: string) => void, item: { name: string; text: string; question: string }) {
  try {
    sessionStorage.setItem(ATTACHMENT_STORAGE_KEY, JSON.stringify([{ name: item.name.slice(0, 120), text: item.text.slice(0, 20_000) }]));
  } catch {
    // Storage blocked: the question still goes, just without the item attached.
  }
  push(`/ai?q=${encodeURIComponent(item.question)}`);
}

export function messageForAi(m: { provider: string; subject: string | null; fromName: string | null; fromAddress: string | null; snippet: string; receivedAt: string }) {
  const from = m.fromName ?? m.fromAddress ?? "Unknown sender";
  return {
    name: `Message from ${from}`,
    text: [`From: ${from}${m.fromAddress && m.fromName ? ` <${m.fromAddress}>` : ""}`, `App: ${providerLabel(m.provider)}`, `Received: ${m.receivedAt}`, `Subject: ${m.subject ?? "(none)"}`, "", m.snippet].join("\n"),
    question: "Summarize the attached message and tell me what I should do next. If it needs a reply, draft one for me to approve.",
  };
}

export function taskForAi(t: { title: string; status?: string | null; priority?: string | null; dueDate?: string | null; description?: string | null; source?: string | null; project?: string | null }) {
  return {
    name: `Task: ${t.title}`,
    text: [`Title: ${t.title}`, t.source && `From: ${t.source}`, t.project && `Project: ${t.project}`, t.status && `Status: ${t.status}`, t.priority && `Priority: ${t.priority}`, t.dueDate && `Due: ${t.dueDate}`, t.description && `\n${t.description}`]
      .filter(Boolean)
      .join("\n"),
    question: "Help me with the attached task: what does it involve, what's the best next step, and is anything related in my work I should look at?",
  };
}
