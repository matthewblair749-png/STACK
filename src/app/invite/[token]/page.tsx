import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { previewInvite } from "@/server/invites";
import { ApiError } from "@/server/api-error";
import { AuthCard } from "@/components/auth-card";
import { JoinButton } from "./join-button";

export const metadata: Metadata = {
  title: "Join a workspace · STACK",
  // The token is in the URL; never pass it to other sites via the Referer header.
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

const CLOSED: Record<string, { title: string; body: string }> = {
  expired: { title: "This invite has expired.", body: "Invite links last 7 days. Ask whoever invited you for a new one." },
  used: { title: "This invite was already used.", body: "Each link works once. Ask whoever invited you for a new one." },
  revoked: { title: "This invite was cancelled.", body: "Ask whoever invited you for a new link." },
  full: { title: "This workspace is full.", body: "It has reached the member limit. Ask an admin to make room." },
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);

  let preview: Awaited<ReturnType<typeof previewInvite>> | null = null;
  try {
    preview = await previewInvite(token, session.user.id);
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
  }

  if (!preview) {
    return (
      <AuthCard title="This invite link isn't valid." subtitle="Check you copied the whole link, or ask for a new one.">
        <Link href="/home" className="block text-center text-sm font-medium text-ink underline">Go to STACK</Link>
      </AuthCard>
    );
  }

  if (preview.status === "already_member") {
    return (
      <AuthCard title={`You're already in ${preview.workspaceName}.`} subtitle="Nothing to do here.">
        <JoinButton token={token} label={`Open ${preview.workspaceName}`} />
      </AuthCard>
    );
  }

  const closed = CLOSED[preview.status];
  if (closed) {
    return (
      <AuthCard title={closed.title} subtitle={closed.body}>
        <Link href="/home" className="block text-center text-sm font-medium text-ink underline">Go to STACK</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={`Join ${preview.workspaceName}`} subtitle={`${preview.invitedBy} invited you to work together on STACK.`}>
      <ul className="space-y-2 text-sm text-neutral-600">
        <li>You&apos;ll join as {preview.role === "Admin" ? "an admin" : "a member"} and see the workspace&apos;s shared tasks and projects.</li>
        <li>Your connected apps, email, messages and AI chats stay private to you. Teammates never see them.</li>
        <li>You keep your own workspace too, and can switch between them from the sidebar.</li>
      </ul>
      <div className="mt-5">
        <JoinButton token={token} label={`Join ${preview.workspaceName}`} />
      </div>
      <p className="mt-3 text-center text-xs text-neutral-400">Signed in as {session.user.email ?? session.user.name}</p>
    </AuthCard>
  );
}
