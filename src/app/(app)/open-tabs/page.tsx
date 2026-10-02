"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, Plus, Sparkles } from "lucide-react";
import { useDemo } from "@/lib/demo-context";
import { BrandIcon } from "@/components/brand-icons";
import { Button } from "@/components/ui/button";
import { TabBar } from "@/components/app/open-tabs/tab-bar";
import { AppView } from "@/components/app/open-tabs/app-view";
import { AppLauncher } from "@/components/app/open-tabs/app-launcher";
import { UpgradeModal } from "@/components/app/open-tabs/upgrade-modal";
import { AskStackPanel } from "@/components/app/open-tabs/ask-stack-panel";
import { MobileTabSwitcher } from "@/components/app/open-tabs/mobile-tab-switcher";

const signatureApps: Array<"gmail" | "slack" | "notion" | "drive"> = ["gmail", "slack", "notion", "drive"];

export default function OpenTabsPage() {
  const { openTabs, activeTabId, openTabsLimit, canUpgrade, closeTab, cycleTab } = useDemo();
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [askFocusTabId, setAskFocusTabId] = useState<string | null>(null);

  const activeTab = openTabs.find((t) => t.id === activeTabId) ?? null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        setLauncherOpen(true);
      } else if (e.key.toLowerCase() === "w" && activeTabId) {
        e.preventDefault();
        closeTab(activeTabId);
      } else if (e.key === "Tab") {
        e.preventDefault();
        cycleTab(e.shiftKey ? -1 : 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTabId, closeTab, cycleTab]);

  function openAskForTab(tabId: string) {
    setAskFocusTabId(tabId);
    setAskOpen(true);
  }

  return (
    <div className="flex h-full flex-col">
      {openTabs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-2xl font-semibold text-ink">Your work is open.</p>
          <p className="mt-1.5 max-w-sm text-sm text-neutral-500">STACK can connect the context across your tabs.</p>

          <div className="mt-8 flex items-center gap-5">
            {signatureApps.map((app) => (
              <div key={app} className="flex flex-col items-center gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-100 bg-white shadow-sm">
                  <BrandIcon id={app} size={18} />
                </div>
                <ArrowDown size={12} className="text-neutral-300" />
              </div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="-mt-1 flex flex-col items-center gap-2 rounded-2xl bg-blue-soft px-5 py-3"
          >
            <p className="flex items-center gap-1.5 text-sm font-semibold text-blue"><Sparkles size={13} /> STACK AI</p>
          </motion.div>
          <ArrowDown size={12} className="mt-1 text-neutral-300" />
          <p className="mt-1 text-sm font-medium text-ink">One connected answer</p>

          <div className="mt-8 flex items-center gap-3">
            <Button onClick={() => setLauncherOpen(true)}>
              <Plus size={15} /> Open an app
            </Button>
            <Button variant="outline" onClick={() => setAskOpen(true)}>
              <Sparkles size={14} /> Ask STACK
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="hidden lg:block">
            <TabBar onNewTab={() => setLauncherOpen(true)} onAskAboutTab={openAskForTab} />
          </div>
          <div className="lg:hidden">
            <MobileTabSwitcher onNewTab={() => setLauncherOpen(true)} />
          </div>

          <div className="min-h-0 flex-1">
            {activeTab && <AppView key={`${activeTab.id}-${activeTab.refreshKey}`} tab={activeTab} />}
          </div>
        </>
      )}

      <AppLauncher
        open={launcherOpen}
        onClose={() => setLauncherOpen(false)}
        onLimitReached={() => {
          setLauncherOpen(false);
          setUpgradeOpen(true);
        }}
      />
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} used={openTabs.length} limit={openTabsLimit} canUpgrade={canUpgrade} />
      <AskStackPanel
        open={askOpen}
        onOpenChange={(v) => {
          setAskOpen(v);
          if (!v) setAskFocusTabId(null);
        }}
        focusTabId={askFocusTabId}
      />
    </div>
  );
}
