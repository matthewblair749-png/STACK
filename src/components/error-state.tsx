import Link from "next/link";
import type { ReactNode } from "react";
import { DeskSurface, PaperSheet } from "@/components/desk-surface";

/** One calm, honest full-page message used by the 404 and error pages. */
export function ErrorState({
  code,
  title,
  body,
  actions,
  inline = false,
}: {
  code?: string;
  title: string;
  body: ReactNode;
  actions: ReactNode;
  /** Inside the signed-in app: plain, using the app's own theme instead of the public site's desk. */
  inline?: boolean;
}) {
  if (inline) {
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
  return (
    <DeskSurface>
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <PaperSheet className="px-7 py-9 text-center">
            {code && <p className="font-mono text-sm text-neutral-400">{code}</p>}
            <h1 className="mt-2 text-balance text-2xl font-semibold tracking-[-0.02em] text-ink">{title}</h1>
            <div className="mt-3 text-[15px] leading-relaxed text-neutral-500">{body}</div>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">{actions}</div>
          </PaperSheet>
        </div>
      </main>
    </DeskSurface>
  );
}

export const primaryAction = "inline-flex h-10 items-center rounded-[10px] bg-ink px-5 text-sm font-medium text-paper hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue";
export const secondaryAction = "inline-flex h-10 items-center rounded-[10px] border border-neutral-200 bg-white px-5 text-sm font-medium text-ink hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue";

export function HomeLink({ href = "/", label = "Go to STACK" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className={secondaryAction}>
      {label}
    </Link>
  );
}
