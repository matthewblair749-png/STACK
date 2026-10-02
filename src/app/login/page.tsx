import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { AuthButtons } from "@/components/auth-buttons";
import { configuredAuthProviders } from "@/server/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl: raw } = await searchParams;
  // Only same-site paths: never bounce someone to another domain after signing in.
  const callbackUrl = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/home";
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
