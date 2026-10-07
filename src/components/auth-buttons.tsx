"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleIcon, MicrosoftIcon, AppleIcon } from "@/components/oauth-icons";

export type ConfiguredAuthProviders = {
  google: boolean;
  microsoft: boolean;
  apple: boolean;
  email: boolean;
};

export function AuthButtons({
  configured,
  callbackUrl = "/home",
}: {
  configured: ConfiguredAuthProviders;
  callbackUrl?: string;
}) {
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error" | "limited">("idle");
  const [oauthPending, setOauthPending] = useState<string | null>(null);

  const noneConfigured = !configured.google && !configured.microsoft && !configured.apple && !configured.email;

  if (noneConfigured) {
    return (
      <div className="rounded-xl border border-yellow/40 bg-yellow/10 p-4 text-sm text-ink">
        Sign-in isn&apos;t configured yet. Set <code className="font-mono text-xs">GOOGLE_CLIENT_ID</code> /{" "}
        <code className="font-mono text-xs">GOOGLE_CLIENT_SECRET</code>,{" "}
        <code className="font-mono text-xs">MICROSOFT_CLIENT_ID</code> /{" "}
        <code className="font-mono text-xs">MICROSOFT_CLIENT_SECRET</code>,{" "}
        <code className="font-mono text-xs">APPLE_CLIENT_ID</code> / <code className="font-mono text-xs">APPLE_TEAM_ID</code> /{" "}
        <code className="font-mono text-xs">APPLE_KEY_ID</code> / <code className="font-mono text-xs">APPLE_PRIVATE_KEY</code>, or{" "}
        <code className="font-mono text-xs">RESEND_API_KEY</code> /{" "}
        <code className="font-mono text-xs">EMAIL_FROM</code> in your environment to enable it.
      </div>
    );
  }

  async function handleOAuth(provider: "google" | "microsoft-entra-id" | "apple") {
    setOauthPending(provider);
    await signIn(provider, { callbackUrl });
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const res = await signIn("resend", { email, redirect: false, callbackUrl });
    setStatus(res?.error === "RateLimited" ? "limited" : res?.error ? "error" : "sent");
  }

  return (
    <div className="space-y-2.5">
      <Button
        variant="outline"
        className="w-full justify-center"
        disabled={!configured.google || oauthPending !== null}
        title={configured.google ? undefined : "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google sign-in"}
        onClick={() => handleOAuth("google")}
      >
        <GoogleIcon /> {configured.google ? "Continue with Google" : "Google — needs setup"}
      </Button>
      <Button
        variant="outline"
        className="w-full justify-center"
        disabled={!configured.microsoft || oauthPending !== null}
        title={
          configured.microsoft
            ? undefined
            : "Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to enable Microsoft sign-in"
        }
        onClick={() => handleOAuth("microsoft-entra-id")}
      >
        <MicrosoftIcon /> {configured.microsoft ? "Continue with Microsoft" : "Microsoft — needs setup"}
      </Button>
      <Button
        variant="outline"
        className="w-full justify-center"
        disabled={!configured.apple || oauthPending !== null}
        title={
          configured.apple
            ? undefined
            : "Set APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY to enable Apple sign-in"
        }
        onClick={() => handleOAuth("apple")}
      >
        <AppleIcon /> {configured.apple ? "Continue with Apple" : "Apple — needs setup"}
      </Button>
      <Button
        variant="outline"
        className="w-full justify-center"
        disabled={!configured.email}
        title={configured.email ? undefined : "Set RESEND_API_KEY and EMAIL_FROM to enable email sign-in"}
        onClick={() => setShowEmail((v) => !v)}
      >
        <Mail size={16} /> {configured.email ? "Continue with email" : "Email — needs setup"}
      </Button>

      {showEmail && configured.email && (
        status === "sent" ? (
          <p className="pt-2 text-center text-sm text-neutral-600">
            Check <span className="font-medium text-ink">{email}</span> for a sign-in link.
          </p>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-2.5 pt-1">
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
            {status === "limited" && (
              <p className="text-center text-xs text-red">Too many sign-in links were requested. Wait 15 minutes, then try again.</p>
            )}
            {status === "error" && (
              <p className="text-center text-xs text-red">Couldn&apos;t send the link. Try again.</p>
            )}
          </form>
        )
      )}
    </div>
  );
}
