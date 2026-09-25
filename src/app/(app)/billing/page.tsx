"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CreditCard, ExternalLink } from "lucide-react";
import { PLAN_LIMITS, planLabel, type PlanId } from "@/lib/plan-limits";
import { Card, SectionLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BillingStatus {
  configured: boolean;
  plan: "Free" | "Solo" | "Team" | "Business" | "Enterprise";
  status: string;
  currentPeriodEnd?: string;
  hasStripeCustomer: boolean;
  seats: number;
}

const upgradePlans: { id: "Solo" | "Team" | "Business"; planId: PlanId }[] = [
  { id: "Solo", planId: "solo" },
  { id: "Team", planId: "team" },
  { id: "Business", planId: "business" },
];

export default function BillingPage() {
  return (
    <Suspense>
      <BillingPageInner />
    </Suspense>
  );
}

function BillingPageInner() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  function fetchStatus() {
    return fetch("/api/billing/status").then((res) => (res.ok ? (res.json() as Promise<BillingStatus>) : null));
  }

  useEffect(() => {
    fetchStatus().then((data) => {
      if (data) setStatus(data);
    });
  }, []);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      fetchStatus().then((data) => {
        if (data) setStatus(data);
      });
    }
  }, [searchParams]);

  async function upgrade(plan: "Solo" | "Team" | "Business") {
    setPending(plan);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Checkout failed.");
      window.location.assign(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setPending(null);
    }
  }

  async function openPortal() {
    setPending("portal");
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't open the billing portal.");
      window.location.assign(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open the billing portal.");
      setPending(null);
    }
  }

  if (!status) {
    return <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 text-sm text-neutral-400">Loading billing...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      {error && (
        <div className="mb-4 rounded-xl border border-red/30 bg-red-soft px-4 py-3 text-sm text-red">{error}</div>
      )}

      {!status.configured && (
        <div className="mb-5 rounded-xl border border-yellow/40 bg-yellow/10 px-4 py-3 text-sm text-ink">
          Billing isn&apos;t configured yet. Set <code className="font-mono text-xs">STRIPE_SECRET_KEY</code>,{" "}
          <code className="font-mono text-xs">STRIPE_WEBHOOK_SECRET</code>, and the plan price IDs (
          <code className="font-mono text-xs">STRIPE_PRICE_SOLO</code>,{" "}
          <code className="font-mono text-xs">STRIPE_PRICE_TEAM</code>,{" "}
          <code className="font-mono text-xs">STRIPE_PRICE_BUSINESS</code>) to enable real subscriptions.
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionLabel>Current plan</SectionLabel>
            <p className="mt-1 text-2xl font-semibold text-ink">{status.plan}</p>
            <p className="mt-1 text-sm text-neutral-500">
              {status.seats} seat{status.seats === 1 ? "" : "s"} · <Badge accent={status.status === "Active" ? "green" : "red"}>{status.status}</Badge>
              {status.currentPeriodEnd && ` · Renews ${new Date(status.currentPeriodEnd).toLocaleDateString()}`}
            </p>
          </div>
          {status.hasStripeCustomer && (
            <Button variant="outline" size="sm" onClick={openPortal} disabled={pending === "portal"}>
              {pending === "portal" ? "Opening..." : <><ExternalLink size={14} /> Manage billing</>}
            </Button>
          )}
        </div>
      </Card>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {upgradePlans.map((p) => (
          <Card key={p.id}>
            <p className="text-sm font-semibold text-ink">{planLabel[p.planId]}</p>
            <p className="mt-1 text-xs text-neutral-400">{PLAN_LIMITS[p.planId].openTabs} Open Tabs</p>
            <Button
              size="sm"
              className="mt-4 w-full"
              variant={status.plan === p.id ? "outline" : "primary"}
              disabled={status.plan === p.id || pending === p.id || !status.configured}
              onClick={() => upgrade(p.id)}
            >
              {status.plan === p.id ? "Current plan" : pending === p.id ? "Redirecting..." : `Upgrade to ${p.id}`}
            </Button>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        <div className="flex items-center gap-2 text-neutral-500">
          <CreditCard size={16} />
          <SectionLabel>Payment method & invoices</SectionLabel>
        </div>
        <p className="mt-3 text-sm text-neutral-600">
          {status.hasStripeCustomer
            ? "Manage your card, view invoices, and cancel your subscription from the Stripe billing portal."
            : "Subscribe to a plan to add a payment method."}
        </p>
      </Card>
    </div>
  );
}
