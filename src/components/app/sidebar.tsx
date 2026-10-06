"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home, CheckSquare, FolderKanban, Inbox, Calendar, Files, MessageSquare, Bell, Sparkles,
  AppWindow, Users, Plug, Settings, HelpCircle, ChevronsUpDown, PanelLeft, Check, LogOut, Plus, Video,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import { IntegrationLogo } from "@/components/brand-icons";
import { useDemo } from "@/lib/demo-context";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { useWorkState } from "./work-state-provider";
import { useToast } from "./toast";

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
  badge?: number;
  badgeAccent?: "red" | "neutral";
}

const mainNav: NavItem[] = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "My Work", href: "/tasks", icon: CheckSquare },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Files", href: "/files", icon: Files },
  { label: "Conversations", href: "/messages", icon: MessageSquare },
  { label: "Calls", href: "/calls", icon: Video },
  { label: "Updates", href: "/updates", icon: Bell },
  { label: "AI", href: "/ai", icon: Sparkles },
];

const moreNav: NavItem[] = [
  { label: "Open Tabs", href: "/open-tabs", icon: AppWindow },
  { label: "Team", href: "/team", icon: Users },
  { label: "Connected Apps", href: "/integrations", icon: Plug },
];

interface WorkspaceRow {
  id: string;
  name: string;
  active: boolean;
}
interface ConnectedApp {
  id: string;
  name: string;
  logoPath?: string | null;
  status?: string;
  connected: boolean;
}

function NavRow({ item, active, collapsed, onNavigate }: { item: NavItem; active: boolean; collapsed: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className="relative block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
    >
      <div
        className={cn(
          "relative mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
          collapsed && "justify-center px-0",
          active ? "text-ink" : "text-neutral-500 hover:bg-neutral-50 hover:text-ink",
        )}
      >
        {active && <motion.div layoutId="sidebar-active" className="absolute inset-0 rounded-xl bg-neutral-100" transition={{ duration: 0.2 }} />}
        <Icon size={17} className="relative z-10 shrink-0" strokeWidth={2} />
        {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
        {!!item.badge && !collapsed && (
          <span className={cn("relative z-10 ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold", item.badgeAccent === "neutral" ? "bg-neutral-100 text-neutral-500" : "bg-red text-white")}>
            {item.badge}
          </span>
        )}
        {!!item.badge && collapsed && <span className={cn("absolute right-2 top-1.5 z-10 h-1.5 w-1.5 rounded-full", item.badgeAccent === "neutral" ? "bg-neutral-400" : "bg-red")} />}
      </div>
    </Link>
  );
}

function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  return <p className={cn("px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400", collapsed && "sr-only")}>{children}</p>;
}

export function Sidebar({ onNavigate, expanded = false }: { onNavigate?: () => void; expanded?: boolean }) {
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [userCollapsed, setUserCollapsed] = useState(false);
  const collapsed = !expanded && (userCollapsed || !isDesktop);
  const { openTabs } = useDemo();
  const { state } = useWorkState();
  const toast = useToast();
  const { data: session } = useSession();
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([]);
  const [apps, setApps] = useState<ConnectedApp[] | null>(null);
  const [wsOpen, setWsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/workspaces")
      .then((r) => (r.ok ? r.json() : { workspaces: [] }))
      .then((b) => !cancelled && setWorkspaces(b.workspaces))
      .catch(() => {});
    fetch("/api/integrations")
      .then((r) => (r.ok ? r.json() : { integrations: [] }))
      .then((b) => !cancelled && setApps(b.integrations))
      .catch(() => !cancelled && setApps([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const userName = session?.user?.name ?? session?.user?.email ?? "Account";
  const active = workspaces.find((w) => w.active);
  const workspaceName = active?.name ?? "Workspace";
  const connected = (apps ?? []).filter((a) => a.connected);
  const unread = state?.understand.counts.importantMessages ?? 0;

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(href + "/");
  }

  async function switchWorkspace(id: string) {
    setWsOpen(false);
    if (active?.id === id) return;
    const res = await fetch("/api/workspaces/active", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: id }) });
    if (res.ok) {
      try {
        sessionStorage.clear();
      } catch {
        // Nothing cached to clear.
      }
      // Full navigation so every cached view of the previous workspace is discarded.
      window.location.assign(new URL("/home", window.location.origin).toString());
    } else {
      toast({ title: "Couldn't switch workspace", tone: "error" });
    }
  }

  return (
    <motion.aside
      aria-label="Primary"
      animate={{ width: collapsed ? 72 : 244 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex h-full flex-col overflow-hidden border-r border-neutral-100 bg-white"
    >
      <div className={cn("flex shrink-0 items-center pt-6", collapsed ? "flex-col gap-3 px-0" : "justify-between px-5")}>
        <Link href="/home" onClick={onNavigate} aria-label="STACK home">
          {collapsed ? <LogoMark size={22} /> : <Logo size={24} />}
        </Link>
        {isDesktop && (
          <button
            onClick={() => setUserCollapsed((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-ink"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft size={15} />
          </button>
        )}
      </div>

      <nav aria-label="Main" className="mt-5 flex-1 overflow-y-auto px-3 pb-3">
        {mainNav.map((item) => (
          <NavRow key={item.href} item={item.href === "/inbox" ? { ...item, badge: unread || undefined } : item} active={isActive(item.href)} collapsed={collapsed} onNavigate={onNavigate} />
        ))}

        <SectionLabel collapsed={collapsed}>Workspaces</SectionLabel>
        <div className="relative">
          <button
            onClick={() => setWsOpen((v) => !v)}
            aria-expanded={wsOpen}
            aria-haspopup="listbox"
            title={collapsed ? workspaceName : undefined}
            className={cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-neutral-50", collapsed && "justify-center px-0")}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink text-[11px] font-semibold text-white">{workspaceName.charAt(0).toUpperCase()}</span>
            {!collapsed && (
              <>
                <span className="flex-1 truncate text-sm font-medium text-ink">{workspaceName}</span>
                <ChevronsUpDown size={13} className="text-neutral-400" />
              </>
            )}
          </button>
          <AnimatePresence>
            {wsOpen && (
              <motion.ul
                role="listbox"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className={cn("absolute z-30 mt-1 w-56 rounded-xl border border-neutral-200 bg-white p-1 shadow-xl", collapsed ? "left-full top-0 ml-2" : "left-0")}
              >
                {workspaces.map((w) => (
                  <li key={w.id} role="option" aria-selected={w.active}>
                    <button onClick={() => switchWorkspace(w.id)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-neutral-50">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-ink text-[10px] font-semibold text-white">{w.name.charAt(0).toUpperCase()}</span>
                      <span className="flex-1 truncate text-ink">{w.name}</span>
                      {w.active && <Check size={14} className="text-blue" />}
                    </button>
                  </li>
                ))}
                {workspaces.length === 0 && <li className="px-2.5 py-2 text-xs text-neutral-400">No workspaces found.</li>}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        <SectionLabel collapsed={collapsed}>Connected</SectionLabel>
        {apps === null ? (
          <div className={cn("flex gap-1.5 px-3", collapsed && "flex-col items-center px-0")} aria-hidden>
            {[0, 1, 2].map((i) => <span key={i} className="h-8 w-8 animate-pulse rounded-lg bg-neutral-100" />)}
          </div>
        ) : connected.length === 0 ? (
          <Link href="/integrations" onClick={onNavigate} title="Connect an app" className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50 hover:text-ink", collapsed && "justify-center px-0")}>
            <Plus size={16} className="shrink-0" />
            {!collapsed && <span>Connect your first app</span>}
          </Link>
        ) : (
          <ul className={cn("flex flex-wrap gap-1.5 px-3", collapsed && "flex-col items-center px-0")} aria-label="Connected apps">
            {connected.slice(0, collapsed ? 5 : 12).map((a) => (
              <li key={a.id}>
                <Link href="/integrations" onClick={onNavigate} title={`${a.name}${a.status === "error" ? " - connection needs attention" : ""}`} className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-100 bg-white hover:border-neutral-300">
                  <IntegrationLogo app={a.id} name={a.name} size="sm" logoPath={a.logoPath} />
                  {a.status === "error" && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red ring-2 ring-white" />}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/integrations" onClick={onNavigate} title="Manage connected apps" aria-label="Manage connected apps" className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-neutral-200 text-neutral-400 hover:border-neutral-400 hover:text-ink">
                <Plus size={14} />
              </Link>
            </li>
          </ul>
        )}

        <SectionLabel collapsed={collapsed}>More</SectionLabel>
        {moreNav.map((item) => (
          <NavRow key={item.href} item={item.href === "/open-tabs" ? { ...item, badge: openTabs.length || undefined, badgeAccent: "neutral" } : item} active={isActive(item.href)} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="relative border-t border-neutral-100 p-3">
        <NavRow item={{ label: "Help", href: "/help", icon: HelpCircle }} active={isActive("/help")} collapsed={collapsed} onNavigate={onNavigate} />
        <NavRow item={{ label: "Settings", href: "/settings", icon: Settings }} active={isActive("/settings")} collapsed={collapsed} onNavigate={onNavigate} />
        <button
          onClick={() => setProfileOpen((v) => !v)}
          aria-expanded={profileOpen}
          className={cn("mt-1 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-neutral-50", collapsed && "justify-center px-0")}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-soft text-xs font-semibold text-blue">{userName.charAt(0).toUpperCase()}</span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{userName}</span>
              <span className="block truncate text-xs text-neutral-400">{workspaceName}</span>
            </span>
          )}
        </button>
        <AnimatePresence>
          {profileOpen && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.12 }} className={cn("absolute bottom-full z-30 mb-1 w-52 rounded-xl border border-neutral-200 bg-white p-1 shadow-xl", collapsed ? "left-full ml-2" : "left-3")}>
              <Link href="/settings" onClick={() => { setProfileOpen(false); onNavigate?.(); }} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink hover:bg-neutral-50"><Settings size={14} /> Account settings</Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-red hover:bg-red-soft"><LogOut size={14} /> Sign out</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}
