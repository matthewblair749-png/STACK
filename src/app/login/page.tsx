import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { AuthButtons } from "@/components/auth-buttons";
import { configuredAuthProviders } from "@/server/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const ids = new Set(configuredAuthProviders.map((p) => p.id));

  return (
    <AuthCard
      title="Welcome to STACK."
      subtitle="All your work, together."
      footer={
        <>
          Don&apos;t have an account? <Link href="/signup" className="font-medium text-ink underline">Sign up</Link>
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
        callbackUrl={callbackUrl || "/home"}
      />
    </AuthCard>
  );
}
