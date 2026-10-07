"use client";

import { useEffect } from "react";
import { ErrorState, HomeLink, primaryAction } from "@/components/error-state";
import { reportError } from "@/lib/report-error";

/** Keeps the sidebar and top bar visible when a page inside the app fails. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => reportError(error), [error]);

  return (
    <ErrorState
      title="Something went wrong on our side."
      body={
        <>
          This page didn&apos;t load. Your data is safe - nothing was changed. Try again, and if it keeps happening, let us know.
          {error.digest && <span className="mt-2 block text-xs text-neutral-400">Reference: {error.digest}</span>}
        </>
      }
      actions={
        <>
          <button onClick={() => retry()} className={primaryAction}>Try again</button>
          <HomeLink href="/home" label="Back to Home" />
        </>
      }
    />
  );
}
