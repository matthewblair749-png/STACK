"use client";

import { Suspense } from "react";
import { ConnectionCenter } from "@/components/connections/connection-center";

export default function IntegrationsPage() {
  return (
    <Suspense>
      <ConnectionCenter />
    </Suspense>
  );
}
