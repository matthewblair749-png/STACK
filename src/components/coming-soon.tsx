import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { AuthCard } from "@/components/auth-card";
import { LAUNCH_MONTH } from "@/lib/launch";

/** What /login, /signup and the app show until STACK opens. */
export function ComingSoon() {
  return (
    <AuthCard title={`STACK opens in ${LAUNCH_MONTH}.`} subtitle="We're putting the finishing touches on it.">
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff6cc] text-[#121110]">
          <CalendarDays size={22} />
        </span>
        <p className="mt-4 text-[15px] font-semibold text-ink">
          Sign-in opens at <span className="highlight">launch</span>.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          STACK will read your email, chats, calendar and tasks and hand you one brief: what needs you, why, and the next step.
        </p>
        <Link href="/" className="btn-stack btn-sm mt-6">
          <ArrowLeft size={15} /> See what STACK does
        </Link>
      </div>
    </AuthCard>
  );
}
