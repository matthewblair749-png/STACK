import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { AuthButtons } from "@/components/auth-buttons";
import { configuredAuthProviders } from "@/server/auth";
import { safeCallbackUrl } from "@/lib/safe-callback";
import { signInErrorMessage } from "@/lib/auth-errors";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl: raw, error } = await searchParams;
  const errorMessage = signInErrorMessage(error);
  const callbackUrl = safeCallbackUrl(raw);
  const isInvite = callbackUrl.startsWith("/invite/");
  const ids = new Set(configuredAuthProviders.map((p) => p.id));

  return (
    <AuthCard
      title={isInvite ? "You've been invited to STACK." : "Welcome to STACK."}
      subtitle={isInvite ? "Sign in or create a free account to join your team's workspace." : "All your work, together."}
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href={callbackUrl === "/home" ? "/signup" : `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-medium text-ink underline">Sign up</Link>
        </>
      }
    >
      {errorMessage && (
        <p role="alert" className="mb-4 rounded-xl bg-red-soft px-3 py-2.5 text-sm text-red">
          {errorMessage}
        </p>
      )}
      <AuthButtons
        configured={{
          google: ids.has("google"),
          microsoft: ids.has("microsoft-entra-id"),
          apple: ids.has("apple"),
          email: ids.has("resend"),
        }}
        callbackUrl={callbackUrl}
      />
    </AuthCard>
  );
}
