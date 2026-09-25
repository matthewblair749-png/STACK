"use client";

import { useState } from "react";
import { Reorder } from "framer-motion";
import { Plus, History } from "lucide-react";
import { useDemo } from "@/lib/demo-context";
import { appOfficialUrl } from "@/lib/open-tabs-data";
import { cn } from "@/lib/utils";
import { TabItem } from "./tab-item";
import { TabContextMenu } from "./tab-context-menu";

export function TabBar({
  onNewTab,
  onAskAboutTab,
}: {
  onNewTab: () => void;
  onAskAboutTab: (tabId: string) => void;
}) {
  const {
    openTabs, activeTabId, setActiveTab, closeTab, closeOtherTabs, closeTabsToRight,
    pinTab, unpinTab, renameTab, refreshTab, reopenClosed, recentlyClosed, openTabsLimit, reorderGroup,
  } = useDemo();

  const [menu, setMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const pinned = openTabs.filter((t) => t.pinned);
  const normal = openTabs.filter((t) => !t.pinned);
  const menuTab = openTabs.find((t) => t.id === menu?.tabId);

  return (
    <div className="flex h-14 shrink-0 items-center gap-1.5 border-b border-neutral-100 bg-neutral-25 px-3">
      <button
        onClick={onNewTab}
        aria-label="New Open Tab"
        title="New Open Tab (⌘T)"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
      >
        <Plus size={16} />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {pinned.length > 0 && (
          <>
            <Reorder.Group
              as="div"
              axis="x"
              values={pinned}
              onReorder={(order) => reorderGroup(order, "pinned")}
              className="flex items-center gap-1"
            >
              {pinned.map((tab) => (
                <TabItem
                  key={tab.id}
                  tab={tab}
                  active={tab.id === activeTabId}
                  isRenaming={renamingId === tab.id}
                  onActivate={() => setActiveTab(tab.id)}
                  onClose={() => closeTab(tab.id)}
                  onContextMenu={(e) => setMenu({ tabId: tab.id, x: e.clientX, y: e.clientY })}
                  onRenameSubmit={(title) => {
                    renameTab(tab.id, title);
                    setRenamingId(null);
                  }}
                />
              ))}
            </Reorder.Group>
            {normal.length > 0 && <span className="h-5 w-px shrink-0 bg-neutral-200" />}
          </>
        )}

        <Reorder.Group
          as="div"
          axis="x"
          values={normal}
          onReorder={(order) => reorderGroup(order, "normal")}
          className="flex items-center gap-1"
        >
          {normal.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              active={tab.id === activeTabId}
              isRenaming={renamingId === tab.id}
              onActivate={() => setActiveTab(tab.id)}
              onClose={() => closeTab(tab.id)}
              onContextMenu={(e) => setMenu({ tabId: tab.id, x: e.clientX, y: e.clientY })}
              onRenameSubmit={(title) => {
                renameTab(tab.id, title);
                setRenamingId(null);
              }}
            />
          ))}
        </Reorder.Group>
      </div>

      <span className="shrink-0 text-xs font-medium tabular-nums text-neutral-400">
        {openTabs.length} / {openTabsLimit} Open Tabs
      </span>

      <div className="relative shrink-0">
        <button
          onClick={() => setHistoryOpen((v) => !v)}
          aria-label="Recently closed"
          title="Recently closed"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-ink"
        >
          <History size={15} />
        </button>
        {historyOpen && (
          <div
            onMouseLeave={() => setHistoryOpen(false)}
            className="absolute right-0 top-9 z-40 w-56 overflow-hidden rounded-xl border border-neutral-100 bg-white p-1.5 shadow-xl"
          >
            <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Recently closed</p>
            {recentlyClosed.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-neutral-400">Nothing closed recently.</p>
            ) : (
              recentlyClosed.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => {
                    reopenClosed(entry);
                    setHistoryOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink hover:bg-neutral-50"
                >
                  {entry.title}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <button
        onClick={onNewTab}
        className={cn(
          "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-ink",
        )}
      >
        <Plus size={14} /> Open
      </button>

      {menu && menuTab && (
        <TabContextMenu
          x={menu.x}
          y={menu.y}
          pinned={menuTab.pinned}
          onClose={() => setMenu(null)}
          onCloseTab={() => closeTab(menuTab.id)}
          onCloseOthers={() => closeOtherTabs(menuTab.id)}
          onCloseToRight={() => closeTabsToRight(menuTab.id)}
          onTogglePin={() => (menuTab.pinned ? unpinTab(menuTab.id) : pinTab(menuTab.id))}
          onRename={() => setRenamingId(menuTab.id)}
          onRefresh={() => refreshTab(menuTab.id)}
          onOpenExternally={() => {
            const url = appOfficialUrl[menuTab.appId];
            if (url) window.open(url, "_blank", "noopener,noreferrer");
          }}
          onAskStack={() => onAskAboutTab(menuTab.id)}
        />
      )}
    </div>
  );
}
