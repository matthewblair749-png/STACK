"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Link2, Loader2, LogOut, Plus, X } from "lucide-react";
import { useDemo } from "@/lib/demo-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/app/toast";

type Role = "Owner" | "Admin" | "Member";
interface Member { userId: string; name: string; email: string | null; role: Role; joinedAt: string; isYou: boolean }
interface Invite { id: string; role: Role; createdAt: string; expiresAt: string; createdBy: string }

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Try again.");
  return data;
}

const initials = (name: string) => name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

export default function TeamPage() {
  const { projects, workspace } = useDemo();
  const toast = useToast();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [me, setMe] = useState<{ userId: string; role: Role } | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<"Member" | "Admin">("Member");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const canManage = me?.role === "Owner" || me?.role === "Admin";
  const isOwner = me?.role === "Owner";

  const load = useCallback(async () => {
    try {
      const [m, i] = await Promise.all([
        call<{ members: Member[]; me: { userId: string; role: Role } }>("/api/workspace/members"),
        call<{ invites: Invite[] }>("/api/workspace/invites"),
      ]);
      setMembers(m.members);
      setMe(m.me);
      setInvites(i.invites);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't load your team.");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  async function createLink() {
    setBusy("invite");
    try {
      const res = await call<{ url: string }>("/api/workspace/invites", { method: "POST", body: JSON.stringify({ role: inviteRole }) });
      setLink(res.url);
      setCopied(false);
      await load();
    } catch (e) {
      toast({ title: "Couldn't create invite", description: e instanceof Error ? e.message : undefined, tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      toast({ title: "Couldn't copy", description: "Select the link and copy it manually.", tone: "error" });
    }
  }

  async function act(key: string, url: string, init: RequestInit, success: string) {
    setBusy(key);
    try {
      await call(url, init);
      toast({ title: success, tone: "success" });
      setConfirming(null);
      await load();
    } catch (e) {
      toast({ title: "That didn't work", description: e instanceof Error ? e.message : undefined, tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function leave() {
    setBusy("leave");
    try {
      await call("/api/workspace/leave", { method: "POST" });
      try {
        sessionStorage.clear();
      } catch {
        // Nothing cached to clear.
      }
      // Full navigation so nothing cached from the workspace you just left is shown.
      window.location.assign(new URL("/home", window.location.origin).toString());
    } catch (e) {
      toast({ title: "Couldn't leave", description: e instanceof Error ? e.message : undefined, tone: "error" });
      setBusy(null);
    }
  }

  const name = workspace?.name ?? "your workspace";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-500">
          {members ? `${members.length} member${members.length === 1 ? "" : "s"} in ${name}.` : `Loading ${name}...`}
        </p>
        {canManage && (
          <Button size="sm" onClick={() => { setInviteOpen((o) => !o); setLink(null); }}>
            {inviteOpen ? <X size={14} /> : <Plus size={14} />} {inviteOpen ? "Close" : "Invite people"}
          </Button>
        )}
      </div>

      {loadError && (
        <Card className="mt-5 text-sm text-red">
          {loadError} <button className="ml-2 underline" onClick={() => queueMicrotask(load)}>Retry</button>
        </Card>
      )}

      {inviteOpen && canManage && (
        <Card className="mt-5">
          <h2 className="text-sm font-semibold text-ink">Invite someone to {name}</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Create a link and send it however you like. Each link works once and expires in 7 days. People you invite
            share tasks and projects - their connected apps and messages stay private to them.
          </p>
          {!link ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <label className="text-sm text-neutral-600" htmlFor="invite-role">Join as</label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "Member" | "Admin")}
                className="h-8 rounded-lg border border-neutral-200 bg-paper px-2 text-sm text-ink"
              >
                <option value="Member">Member</option>
                {isOwner && <option value="Admin">Admin (can invite and remove members)</option>}
              </select>
              <Button size="sm" onClick={createLink} disabled={busy === "invite"}>
                {busy === "invite" ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Create invite link
              </Button>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={link}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Invite link"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-neutral-25 px-3 font-mono text-xs text-ink"
                />
                <Button size="sm" onClick={copyLink}>
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                This link is shown once. Anyone who has it can join as {inviteRole === "Admin" ? "an admin" : "a member"} until it&apos;s used or revoked.
                <button className="ml-2 font-medium text-ink underline" onClick={() => setLink(null)}>Create another</button>
              </p>
            </div>
          )}
        </Card>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members?.map((m) => {
          const projectCount = projects.filter((proj) => proj.memberIds.includes(m.userId)).length;
          const removable = !m.isYou && m.role !== "Owner" && (isOwner || (canManage && m.role === "Member"));
          return (
            <Card key={m.userId} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-600">{initials(m.name)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {m.name} {m.isYou && <span className="ml-1 rounded-full bg-blue-soft px-1.5 py-0.5 text-[10px] font-semibold text-blue">You</span>}
                  </p>
                  {m.email && m.email !== m.name && <p className="truncate text-xs text-neutral-400">{m.email}</p>}
                  <p className="text-xs text-neutral-400">
                    {m.role} · {projectCount} project{projectCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              {(removable || (isOwner && m.role !== "Owner")) && (
                <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
                  {isOwner && m.role !== "Owner" && (
                    <select
                      aria-label={`Role for ${m.name}`}
                      value={m.role}
                      disabled={busy === `role-${m.userId}`}
                      onChange={(e) => act(`role-${m.userId}`, `/api/workspace/members/${m.userId}`, { method: "PATCH", body: JSON.stringify({ role: e.target.value }) }, `${m.name} is now ${e.target.value === "Admin" ? "an admin" : "a member"}`)}
                      className="h-7 rounded-md border border-neutral-200 bg-paper px-1.5 text-xs text-ink"
                    >
                      <option value="Member">Member</option>
                      <option value="Admin">Admin</option>
                    </select>
                  )}
                  {removable &&
                    (confirming === m.userId ? (
                      <span className="flex items-center gap-2 text-xs">
                        <button
                          className="rounded-md bg-red px-2 py-1 font-medium text-white disabled:opacity-50"
                          disabled={busy === `remove-${m.userId}`}
                          onClick={() => act(`remove-${m.userId}`, `/api/workspace/members/${m.userId}`, { method: "DELETE" }, `${m.name} was removed`)}
                        >
                          {busy === `remove-${m.userId}` ? "Removing..." : "Remove"}
                        </button>
                        <button className="text-neutral-500 underline" onClick={() => setConfirming(null)}>Cancel</button>
                      </span>
                    ) : (
                      <button className="ml-auto text-xs text-neutral-500 hover:text-red" onClick={() => setConfirming(m.userId)}>Remove</button>
                    ))}
                </div>
              )}
              {confirming === m.userId && (
                <p className="text-xs text-neutral-500">Their app connections and synced data in this workspace are deleted. Tasks they created stay; their assignments are cleared.</p>
              )}
            </Card>
          );
        })}
        {!members && !loadError && <p className="col-span-full py-8 text-center text-sm text-neutral-400">Loading team...</p>}
      </div>

      {members && members.length === 1 && canManage && !inviteOpen && (
        <p className="mt-4 text-sm text-neutral-500">
          It&apos;s just you so far. <button className="font-medium text-ink underline" onClick={() => setInviteOpen(true)}>Invite a teammate</button> to share tasks and projects.
        </p>
      )}

      {canManage && invites.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-ink">Pending invites</h2>
          <div className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-100">
            {invites.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="text-neutral-600">
                  {i.role} invite from {i.createdBy} · expires in {daysLeft(i.expiresAt)} day{daysLeft(i.expiresAt) === 1 ? "" : "s"}
                </span>
                <button
                  className="text-xs text-neutral-500 hover:text-red disabled:opacity-50"
                  disabled={busy === `revoke-${i.id}`}
                  onClick={() => act(`revoke-${i.id}`, `/api/workspace/invites/${i.id}`, { method: "DELETE" }, "Invite revoked")}
                >
                  {busy === `revoke-${i.id}` ? "Revoking..." : "Revoke"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {me && me.role !== "Owner" && (
        <section className="mt-10 rounded-xl border border-neutral-100 p-4">
          <h2 className="text-sm font-semibold text-ink">Leave {name}</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Your app connections, synced email, messages, files and AI chats in this workspace are deleted. Shared tasks
            and projects stay with the team. You keep your own workspace.
          </p>
          {confirming === "leave" ? (
            <div className="mt-3 flex items-center gap-3 text-sm">
              <button className="rounded-lg bg-red px-3 py-1.5 font-medium text-white disabled:opacity-50" disabled={busy === "leave"} onClick={leave}>
                {busy === "leave" ? "Leaving..." : `Yes, leave ${name}`}
              </button>
              <button className="text-neutral-500 underline" onClick={() => setConfirming(null)}>Cancel</button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setConfirming("leave")}>
              <LogOut size={14} /> Leave workspace
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
