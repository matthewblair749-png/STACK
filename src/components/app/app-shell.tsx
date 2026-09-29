"use client";

import { usePathname } from "next/navigation";
import { DemoProvider } from "@/lib/demo-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileTabBar } from "./mobile-tabbar";
import { CommandPalette } from "./command-palette";
import { ToastProvider } from "./toast";
import { WorkStateProvider } from "./work-state-provider";

const titleMap: Record<string, string> = {
  "/home": "Home",
  "/tasks": "My Work",
  "/projects": "Projects",
  "/inbox": "Inbox",
  "/calendar": "Calendar",
  "/messages": "Conversations",
  "/calls": "Calls",
  "/call": "Call",
  "/updates": "Updates",
  "/files": "Files",
  "/open-tabs": "Open Tabs",
  "/ai": "STACK AI",
  "/automations": "Automations",
  "/integrations": "Connected Apps",
  "/team": "Team",
  "/settings": "Settings",
  "/billing": "Billing",
  "/help": "Help",
};

function titleFor(pathname: string) {
  if (titleMap[pathname]) return titleMap[pathname];
  const base = "/" + pathname.split("/")[1];
  if (titleMap[base]) return titleMap[base];
  return "STACK";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ToastProvider>
      <DemoProvider>
        <WorkStateProvider>
          <a href="#main" className="sr-only z-[200] rounded-lg bg-ink px-4 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
            Skip to content
          </a>
          <div className="flex h-screen overflow-hidden bg-neutral-25">
            <div className="hidden md:block">
              <Sidebar />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar title={titleFor(pathname ?? "/home")} />
              <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto pb-20 outline-none md:pb-0">
                {children}
              </main>
            </div>
          </div>
          <MobileTabBar />
          <CommandPalette />
        </WorkStateProvider>
      </DemoProvider>
    </ToastProvider>
  );
}
