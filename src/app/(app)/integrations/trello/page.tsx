"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

/** Trello returns its token in the URL fragment; forward it to the normal callback, which stores it. */
function Finish() {
  const state = useSearchParams().get("state");

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token");
    if (!token || !state) {
      window.location.replace("/integrations?error=" + encodeURIComponent("Trello sign-in didn't complete. Try connecting again."));
      return;
    }
    window.history.replaceState(null, "", window.location.pathname);
    const target = new URL("/api/integrations/trello/callback", window.location.origin);
    target.searchParams.set("code", token);
    target.searchParams.set("state", state);
    window.location.replace(target.toString());
  }, [state]);

  return <p className="p-8 text-sm text-neutral-500">Finishing Trello connection...</p>;
}

export default function TrelloReturnPage() {
  return (
    <Suspense>
      <Finish />
    </Suspense>
  );
}
