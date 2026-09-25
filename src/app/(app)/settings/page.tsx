"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { CreditCard } from "lucide-react";
import { Card, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MemoryPanel } from "@/components/app/memory-panel";
import { useDemo } from "@/lib/demo-context";
import { cn } from "@/lib/utils";

const tabs = ["Profile", "Workspace", "Memory", "Notifications", "Security", "Billing"] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Profile");
  const { data: session, update: updateSession } = useSession();
  const { workspace, setWorkspace } = useDemo();

  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const name = nameOverride ?? session?.user?.name ?? "";
  const [nameStatus, setNameStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [workspaceNameOverride, setWorkspaceNameOverride] = useState<string | null>(null);
  const workspaceName = workspaceNameOverride ?? workspace?.name ?? "";
  const [workspaceStatus, setWorkspaceStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function saveName() {
    if (!name.trim()) return;
    setNameStatus("saving");
    try {
      const res = await fetch("/api/user", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
      if (!res.ok) throw new Error();
      await updateSession({ name: name.trim() });
      setNameStatus("saved");
    } catch {
      setNameStatus("error");
    }
  }

  async function saveWorkspaceName() {
    if (!workspaceName.trim() || !workspace) return;
    setWorkspaceStatus("saving");
    try {
      const res = await fetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: workspaceName.trim() }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setWorkspace(body.workspace);
      setWorkspaceStatus("saved");
    } catch {
      setWorkspaceStatus("error");
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await fetch("/api/user", { method: "DELETE" });
      await signOut({ callbackUrl: "/" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <div className="flex gap-1 overflow-x-auto border-b border-neutral-100">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-medium",
              tab === t ? "border-ink text-ink" : "border-transparent text-neutral-400 hover:text-ink",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-5">
        {tab === "Profile" && (
          <>
            <Card>
              <SectionLabel>Profile</SectionLabel>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-soft text-lg font-semibold text-blue">
                  {(session?.user?.name ?? session?.user?.email ?? "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{session?.user?.name ?? "Unnamed"}</p>
                  <p className="text-sm text-neutral-400">{session?.user?.email}</p>
                </div>
              </div>
              <div className="mt-5">
                <p className="mb-1 text-xs text-neutral-500">Full name</p>
                <input
                  value={name}
                  onChange={(e) => { setNameOverride(e.target.value); setNameStatus("idle"); }}
                  className="w-full max-w-sm rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-ink"
                />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button size="sm" onClick={saveName} disabled={nameStatus === "saving"}>
                  {nameStatus === "saving" ? "Saving..." : "Save changes"}
                </Button>
                {nameStatus === "saved" && <span className="text-xs text-blue">Saved.</span>}
                {nameStatus === "error" && <span className="text-xs text-red">Couldn&apos;t save. Try again.</span>}
              </div>
            </Card>

            <Card>
              <SectionLabel>Account</SectionLabel>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-neutral-100 px-4 py-3">
                <span className="text-sm text-ink">Signed in as {session?.user?.email}</span>
                <Button size="sm" variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>Log out</Button>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-red/20 bg-red-soft/40 px-4 py-3">
                <div>
                  <span className="text-sm text-ink">Delete account</span>
                  <p className="text-xs text-neutral-500">Permanently deletes your account and any workspace you own.</p>
                </div>
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    <Button size="sm" onClick={deleteAccount} disabled={deleting} className="bg-red hover:bg-red/90">
                      {deleting ? "Deleting..." : "Confirm delete"}
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setConfirmDelete(true)}>Delete</Button>
                )}
              </div>
            </Card>
          </>
        )}

        {tab === "Workspace" && (
          <Card>
            <SectionLabel>Workspace</SectionLabel>
            <div className="mt-4 space-y-3">
              <div>
                <p className="mb-1 text-xs text-neutral-500">Workspace name</p>
                <input
                  value={workspaceName}
                  onChange={(e) => { setWorkspaceNameOverride(e.target.value); setWorkspaceStatus("idle"); }}
                  className="w-full max-w-sm rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-ink"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={saveWorkspaceName} disabled={workspaceStatus === "saving"}>
                  {workspaceStatus === "saving" ? "Saving..." : "Save changes"}
                </Button>
                {workspaceStatus === "saved" && <span className="text-xs text-blue">Saved.</span>}
                {workspaceStatus === "error" && <span className="text-xs text-red">Couldn&apos;t save. Try again.</span>}
              </div>
            </div>
          </Card>
        )}

        {tab === "Memory" && <MemoryPanel />}

        {tab === "Notifications" && (
          <Card>
            <SectionLabel>Notification preferences</SectionLabel>
            <p className="mt-3 text-sm text-neutral-500">
              Notification delivery isn&apos;t wired up yet — this is on the roadmap for a future update.
            </p>
          </Card>
        )}

        {tab === "Security" && (
          <Card>
            <SectionLabel>Security</SectionLabel>
            <p className="mt-3 text-sm text-neutral-500">
              STACK uses passwordless sign-in (Google, Microsoft, or an email link) — there&apos;s no password to
              manage. Two-factor authentication and SSO controls are on the roadmap for a future update.
            </p>
          </Card>
        )}

        {tab === "Billing" && (
          <Card>
            <div className="flex items-center gap-2 text-neutral-500">
              <CreditCard size={16} />
              <SectionLabel>Billing</SectionLabel>
            </div>
            <p className="mt-3 text-sm text-neutral-600">Manage your plan, seats, and invoices.</p>
            <Link href="/billing"><Button size="sm" className="mt-4">Go to billing</Button></Link>
          </Card>
        )}
      </div>
    </div>
  );
}
