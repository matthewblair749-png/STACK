"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

/**
 * Last-resort page when the root layout itself fails. It renders its own document without the app's
 * stylesheet, so it's styled inline and follows the system light/dark setting.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => reportError(error), [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", colorScheme: "light dark" }}>
        <title>Something went wrong · STACK</title>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>STACK didn&apos;t load.</h1>
            <p style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.5 }}>
              Something went wrong on our side. Your data is safe. Try again in a moment.
              {error.digest && <span style={{ display: "block", fontSize: 12, marginTop: 8 }}>Reference: {error.digest}</span>}
            </p>
            <button
              onClick={() => retry()}
              style={{ marginTop: 12, height: 40, padding: "0 16px", borderRadius: 12, border: "1px solid currentColor", background: "transparent", color: "inherit", fontSize: 14, cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
