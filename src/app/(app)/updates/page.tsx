"use client";

import { useState } from "react";
import { MessageList } from "@/components/app/message-list";
import { GROUP_BY_ID, UPDATE_GROUPS, type DataGroupId } from "@/lib/data-groups";
import { providerLabel } from "@/lib/providers-meta";
import { cn } from "@/lib/utils";

export default function UpdatesPage() {
  const [group, setGroup] = useState<DataGroupId>(UPDATE_GROUPS[0].id);
  const active = GROUP_BY_ID[group];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-neutral-100 bg-white">
        <div role="tablist" aria-label="Update groups" className="no-scrollbar mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 sm:px-8">
          {UPDATE_GROUPS.map((g) => (
            <button
              key={g.id}
              role="tab"
              aria-selected={g.id === group}
              onClick={() => setGroup(g.id)}
              className={cn("shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium", g.id === group ? "border-ink text-ink" : "border-transparent text-neutral-400 hover:text-ink")}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <MessageList
          key={group}
          group={group}
          title={active.label}
          subtitle={`${active.blurb} From ${active.providers.map(providerLabel).join(", ")}.`}
          noun={active.noun}
        />
      </div>
    </div>
  );
}
