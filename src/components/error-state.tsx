import Link from "next/link";
import type { ReactNode } from "react";

/** One calm, honest full-page message used by the 404 and error pages. */
export function ErrorState({
  code,
  title,
  body,
  actions,
}: {
  code?: string;
  title: string;
  body: ReactNode;
  actions: ReactNode;
}) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        {code && <p className="text-sm font-semibold uppercase tracking-wider text-neutral-400">{code}</p>}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        <div className="mt-3 text-sm text-neutral-600">{body}</div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{actions}</div>
      </div>
    </main>
  );
}

export const primaryAction = "inline-flex h-10 items-center rounded-xl bg-ink px-4 text-sm font-medium text-paper hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue";
export const secondaryAction = "inline-flex h-10 items-center rounded-xl border border-neutral-200 px-4 text-sm font-medium text-ink hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue";

export function HomeLink({ href = "/", label = "Go to STACK" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className={secondaryAction}>
      {label}
    </Link>
  );
}
