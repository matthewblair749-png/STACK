"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm({ emailConfigured }: { emailConfigured: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  if (!emailConfigured) {
    return (
      <div className="rounded-xl border border-yellow/40 bg-yellow/10 p-4 text-sm text-ink">
        Email sign-in isn&apos;t configured yet. Set <code className="font-mono text-xs">RESEND_API_KEY</code> and{" "}
        <code className="font-mono text-xs">EMAIL_FROM</code> to enable password-free sign-in links.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const res = await signIn("resend", { email, redirect: false, callbackUrl: "/home" });
    setStatus(res?.error ? "error" : "sent");
  }

  if (status === "sent") {
    return (
      <p className="text-center text-sm text-neutral-600">
        Check <span className="font-medium text-ink">{email}</span> for a sign-in link. STACK has no passwords to
        reset — the link signs you straight in.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-ink"
      />
      <Button type="submit" className="w-full justify-center" disabled={status === "sending"}>
        {status === "sending" ? "Sending..." : "Send sign-in link"}
      </Button>
      {status === "error" && <p className="text-center text-xs text-red">Couldn&apos;t send the link. Try again.</p>}
    </form>
  );
}
