"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { BrandIcon } from "@/components/brand-icons";
import { Button } from "@/components/ui/button";
import { appOfficialUrl } from "@/lib/open-tabs-data";
import type { OpenTab } from "@/lib/types";

export function AppView({ tab }: { tab: OpenTab }) {
  // Keyed by tab id + refreshKey from the caller, so switching or
  // refreshing a tab remounts this with a fresh "loading" state instead
  // of resetting it from inside an effect.
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    const id = setTimeout(() => setStatus("ready"), 400);
    return () => clearTimeout(id);
  }, []);

  const url = appOfficialUrl[tab.appId];

  if (status === "loading") return <LoadingState tab={tab} />;

  function reopen() {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2">
        <div className="flex items-center gap-2">
          <BrandIcon id={tab.appId} size={14} />
          <p className="text-xs font-medium text-neutral-500">{tab.title}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-50">
          <BrandIcon id={tab.appId} size={24} />
        </div>
        <p className="text-base font-semibold text-ink">{tab.title} opened in a new tab</p>
        <p className="max-w-sm text-sm text-neutral-500">
          STACK keeps this tab here so you can find your way back — the app itself is running in your browser.
        </p>
        {url && (
          <Button variant="outline" size="sm" className="mt-2" onClick={reopen}>
            <ExternalLink size={14} /> Open {tab.title} again
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function LoadingState({ tab }: { tab: OpenTab }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-50">
        <BrandIcon id={tab.appId} size={22} />
      </div>
      <p className="text-sm font-medium text-ink">{tab.title}</p>
      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
        <motion.span
          className="h-1.5 w-1.5 rounded-full bg-neutral-300"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        Connecting...
      </div>
    </div>
  );
}
