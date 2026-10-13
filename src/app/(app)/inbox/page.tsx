"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageList } from "@/components/app/message-list";
import { GROUP_BY_ID, INBOX_GROUPS, inboxHref, isInboxGroupId, type DataGroupId } from "@/lib/data-groups";
import { providerLabel } from "@/lib/providers-meta";
import { badgeLabel, useAttention } from "@/lib/use-attention";
import { cn } from "@/lib/utils";

/** Shown before anything is connected, so the Inbox still says what it holds. */
const DEFAULT_TABS: DataGroupId[] = ["email", "chat"];

/**
 * One Inbox for everything that comes in: email, chat, and updates from every other connected app, one tab
 * per kind. Only tabs for apps the person has connected are shown, each with how many items need them.
 */
function InboxTabs() {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("group");
  const initialQuery = params.get("q")?.slice(0, 200) ?? "";
  const attention = useAttention();
  const connected = attention?.groups.map((g) => g.id) ?? [];
  const order = INBOX_GROUPS.map((g) => g.id);
  // A tab someone linked to stays visible even if that app isn't connected yet.
  const tabs = [...new Set([...(connected.length ? connected : DEFAULT_TABS), ...(isInboxGroupId(requested) ? [requested] : [])])].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const group: DataGroupId = isInboxGroupId(requested) ? requested : tabs[0];
  const active = GROUP_BY_ID[group];
  const counts = new Map(attention?.groups.map((g) => [g.id, g.count]));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-neutral-100 bg-white">
        <div role="tablist" aria-label="Inbox" className="no-scrollbar mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 sm:px-8">
          {tabs.map((id) => {
            const g = GROUP_BY_ID[id];
            const count = badgeLabel(counts.get(id));
            return (
              <button
                key={id}
                role="tab"
                aria-selected={id === group}
                onClick={() => router.replace(inboxHref(id), { scroll: false })}
                className={cn("flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium", id === group ? "border-ink text-ink" : "border-transparent text-neutral-400 hover:text-ink")}
              >
                {g.label}
                {count && <span className="rounded-full bg-red px-1.5 text-[11px] font-semibold leading-[18px] text-white" aria-label={`${count} need you`}>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <MessageList
          key={group}
          group={group}
          title={active.label}
          subtitle={group === "email" || group === "chat" ? active.blurb : `${active.blurb} From ${active.providers.map(providerLabel).join(", ")}.`}
          noun={active.noun}
          initialQuery={initialQuery}
        />
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-neutral-400">Loading...</div>}>
      <InboxTabs />
    </Suspense>
  );
}
