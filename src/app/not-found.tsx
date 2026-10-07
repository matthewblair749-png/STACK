import type { Metadata } from "next";
import Link from "next/link";
import { ErrorState, primaryAction, secondaryAction } from "@/components/error-state";

export const metadata: Metadata = { title: "Page not found · STACK", robots: { index: false } };

export default function NotFound() {
  return (
    <ErrorState
      code="404"
      title="We couldn't find that page."
      body="The link may be old, or the page may have moved. If you followed a link inside STACK, it may point to something that was deleted."
      actions={
        <>
          <Link href="/home" className={primaryAction}>Open STACK</Link>
          <Link href="/" className={secondaryAction}>Go to the homepage</Link>
        </>
      }
    />
  );
}
