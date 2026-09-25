import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { AuthButtons } from "@/components/auth-buttons";
import { configuredAuthProviders } from "@/server/auth";

export default function SignupPage() {
  const ids = new Set(configuredAuthProviders.map((p) => p.id));

  return (
    <AuthCard
      title="Create your workspace."
      subtitle="Free to start. No credit card required."
      footer={
        <>
          Already have an account? <Link href="/login" className="font-medium text-ink underline">Log in</Link>
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
        callbackUrl="/home"
      />

      <p className="mt-4 text-center text-xs text-neutral-400">
        By continuing you agree to STACK&apos;s Terms and Privacy Policy. Signing in for the first time creates your
        account and workspace automatically — there&apos;s no separate signup step.
      </p>
    </AuthCard>
  );
}
