import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { configuredAuthProviders } from "@/server/auth";

export default function ForgotPasswordPage() {
  const emailConfigured = configuredAuthProviders.some((p) => p.id === "resend");

  return (
    <AuthCard
      title="Sign in without a password."
      subtitle="STACK uses Google, Microsoft, or a one-time email link — there's no password to reset."
      footer={<Link href="/login" className="font-medium text-ink underline">Back to log in</Link>}
    >
      <ForgotPasswordForm emailConfigured={emailConfigured} />
    </AuthCard>
  );
}
