import Link from "next/link";
import { Workflow } from "lucide-react";
import { Card } from "@/components/ui/card";

/** Automations aren't built yet. This page says so plainly instead of showing examples that look real. */
export default function AutomationsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-8">
      <Card className="text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-blue-soft text-blue">
          <Workflow size={20} />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-ink">Automations are coming soon</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
          STACK doesn&apos;t run automations yet. Today, STACK can draft replies, tasks and other changes for you, and
          nothing happens in your apps until you approve it.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3 text-sm">
          <Link href="/ai" className="font-medium text-ink underline">Ask STACK to do something</Link>
          <Link href="/home" className="font-medium text-ink underline">Back to Home</Link>
        </div>
      </Card>
    </div>
  );
}
