"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Search, ArrowRight, Monitor, Clock, Ban, AlertTriangle } from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { IntegrationLogo } from "@/components/brand-icons";
import { referralSources } from "@/lib/profession-apps";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["Welcome", "Profession", "Apps", "Source", "Plan", "Ready"];

type PlanId = "Solo" | "Team" | "Business";
type Interval = "monthly" | "yearly";

interface Profession {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
}

type ConnectionStatus = "connected" | "error" | "available" | "needs_setup" | "desktop_app" | "external_tool" | "unavailable";

interface AppEntry {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  isUniversal: boolean;
  recommended: boolean;
  supported: boolean;
  configured: boolean;
  connected: boolean;
  missingSetup: string[];
  oauthProviderId: string | null;
  status: ConnectionStatus;
  hasRealLogo: boolean;
  logoPath?: string | null;
}

const plans: {
  id: PlanId;
  name: string;
  monthly: number;
  yearly: number;
  per: string;
  description: string;
  features: string[];
}[] = [
  {
    id: "Solo",
    name: "Solo",
    monthly: 5,
    yearly: 50,
    per: "/month",
    description: "For individuals.",
    features: ["1 user", "Connected apps", "AI assistant", "Tasks", "Projects", "Calendar", "Files", "Basic automations"],
  },
  {
    id: "Team",
    name: "Team",
    monthly: 12,
    yearly: 120,
    per: "/user/month",
    description: "For teams.",
    features: ["Shared workspace", "Team projects", "Advanced AI", "Team conversations", "Connected apps", "Automations", "Admin controls"],
  },
  {
    id: "Business",
    name: "Business",
    monthly: 20,
    yearly: 200,
    per: "/user/month",
    description: "For larger organizations.",
    features: ["Advanced security", "Organization controls", "Custom integrations", "Advanced administration", "Dedicated support"],
  },
];

const readyMessages = ["Connecting your apps...", "Organizing your work...", "Setting up your AI workspace..."];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);

  const [professions, setProfessions] = useState<Profession[]>([]);
  const [profession, setProfession] = useState<string | null>(null);
  const [professionQuery, setProfessionQuery] = useState("");

  const [apps, setApps] = useState<AppEntry[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [connectPending, setConnectPending] = useState<string | null>(null);

  const [referral, setReferral] = useState<string | null>(null);

  const [interval, setInterval] = useState<Interval>("monthly");
  const [checkoutPending, setCheckoutPending] = useState<PlanId | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [readyMessageIndex, setReadyMessageIndex] = useState(0);

  // Load professions + resume any saved progress.
  useEffect(() => {
    fetch("/api/professions")
      .then((r) => r.json())
      .then((body) => setProfessions(body.professions ?? []))
      .catch(() => {});

    fetch("/api/onboarding/progress")
      .then((r) => r.json())
      .then((body) => {
        const p = body.progress;
        if (!p) {
          setReady(true);
          return;
        }
        if (p.completed) {
          router.replace("/home");
          return;
        }
        if (p.professionSlug) setProfession(p.professionSlug);
        if (p.referralSource) setReferral(p.referralSource);
        if (p.billingInterval) setInterval(p.billingInterval);
        setStep(p.currentStep ?? 0);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [router]);

  useEffect(() => {
    if (step !== 5) return;
    const id = window.setInterval(() => {
      setReadyMessageIndex((i) => Math.min(i + 1, readyMessages.length - 1));
    }, 700);
    return () => window.clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step === 2) loadApps(profession);
  }, [step, profession]);

  // After opening a provider's sign-in page, watch for the connection to really complete (no manual refresh needed).
  useEffect(() => {
    if (!connectPending) return;
    const id = window.setInterval(async () => {
      try {
        const url = profession ? `/api/apps?profession=${encodeURIComponent(profession)}` : "/api/apps";
        const body = await (await fetch(url)).json();
        const list: AppEntry[] = body.apps ?? [];
        setApps(list);
        if (list.find((a) => a.slug === connectPending)?.connected) setConnectPending(null);
      } catch {
        // Try again on the next tick.
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [connectPending, profession]);

  function saveProgress(patch: Record<string, unknown>) {
    fetch("/api/onboarding/progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  }

  const filteredProfessions = useMemo(() => {
    const q = professionQuery.trim().toLowerCase();
    return q ? professions.filter((p) => p.name.toLowerCase().includes(q)) : professions;
  }, [professionQuery, professions]);

  const groupedProfessions = useMemo(() => {
    const groups = new Map<string, Profession[]>();
    for (const p of filteredProfessions) {
      groups.set(p.category, [...(groups.get(p.category) ?? []), p]);
    }
    return Array.from(groups.entries());
  }, [filteredProfessions]);

  const recommendedApps = apps.filter((a) => a.recommended);
  const universalApps = apps.filter((a) => a.isUniversal && !a.recommended);
  const professionName = professions.find((p) => p.slug === profession)?.name;

  function goNext() {
    const next = Math.min(step + 1, STEP_LABELS.length - 1);
    setStep(next);
    saveProgress({ currentStep: next });
  }
  function goBack() {
    const prev = Math.max(step - 1, 0);
    setStep(prev);
    saveProgress({ currentStep: prev });
  }

  function selectProfession(slug: string) {
    setProfession(slug);
    saveProgress({ professionSlug: slug });
    fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profession: slug }),
    }).catch(() => {});
  }

  function selectReferral(id: string) {
    setReferral(id);
    saveProgress({ referralSource: id });
    fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralSource: id }),
    }).catch(() => {});
  }

  async function loadApps(professionSlug: string | null) {
    setAppsLoading(true);
    try {
      const url = professionSlug ? `/api/apps?profession=${encodeURIComponent(professionSlug)}` : "/api/apps";
      const res = await fetch(url);
      const body = await res.json();
      if (res.ok) setApps(body.apps ?? []);
    } finally {
      setAppsLoading(false);
    }
  }

  function connectApp(app: AppEntry) {
    if (!app.oauthProviderId) return;
    setConnectPending(app.slug);
    window.open(`/api/integrations/${app.oauthProviderId}/connect`, "_blank", "noopener,noreferrer");
  }

  async function refreshApps() {
    await loadApps(profession);
    setConnectPending(null);
  }

  function chooseFree() {
    saveProgress({ selectedPlan: "Free", completed: true });
    setReadyMessageIndex(0);
    setStep(5);
  }

  async function subscribe(planId: PlanId) {
    setCheckoutPending(planId);
    setCheckoutError(null);
    saveProgress({ selectedPlan: planId, billingInterval: interval });
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, interval }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Checkout failed.");
      window.location.assign(body.url);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout failed.");
      setCheckoutPending(null);
    }
  }

  function enterStack() {
    saveProgress({ completed: true });
    router.push("/home");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LogoMark size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <div className="mb-8 flex items-center justify-center gap-2">
        <Logo size={26} />
      </div>

      <div className="mb-8 flex items-center justify-center gap-2">
        {STEP_LABELS.map((s, i) => (
          <div key={s} className={cn("h-1.5 w-10 rounded-full", i <= step ? "bg-ink" : "bg-neutral-100")} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25 }}
        >
          {step === 0 && (
            <div className="flex flex-col items-center text-center">
              <LogoMark size={44} />
              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink">Welcome to STACK.</h1>
              <p className="mt-2 text-lg text-neutral-600">Your work, all in one place.</p>
              <p className="mt-3 max-w-sm text-sm text-neutral-500">
                Connect the tools you already use and let STACK bring your work together.
              </p>
              <p className="mt-6 text-sm text-neutral-400">
                Already have an account? <Link href="/login" className="font-medium text-ink underline">Sign in</Link>
              </p>
            </div>
          )}

          {step === 1 && (
            <div>
              <h1 className="text-center text-2xl font-semibold text-ink">What do you do?</h1>
              <p className="mt-2 text-center text-sm text-neutral-500">
                We&apos;ll recommend the tools you may use based on your profession.
              </p>
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-neutral-200 px-3.5 py-2.5">
                <Search size={15} className="text-neutral-400" />
                <input
                  value={professionQuery}
                  onChange={(e) => setProfessionQuery(e.target.value)}
                  placeholder="Search professions..."
                  className="flex-1 text-sm outline-none placeholder:text-neutral-400"
                />
              </div>
              <div className="mt-4 max-h-96 space-y-5 overflow-y-auto pr-1">
                {groupedProfessions.map(([category, list]) => (
                  <div key={category}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{category}</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {list.map((p) => {
                        const active = profession === p.slug;
                        return (
                          <button
                            key={p.id}
                            onClick={() => selectProfession(p.slug)}
                            className={cn(
                              "rounded-xl border px-3.5 py-3 text-left text-sm transition-colors",
                              active ? "border-ink bg-neutral-50 font-medium text-ink" : "border-neutral-200 text-neutral-600 hover:border-neutral-300",
                            )}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {groupedProfessions.length === 0 && (
                  <p className="py-6 text-center text-sm text-neutral-400">No matches — try a different search.</p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-center text-2xl font-semibold text-ink">Connect your work.</h1>
              <p className="mt-2 text-center text-sm text-neutral-500">
                We&apos;ve selected apps commonly used by people in your profession. Choose the ones you actually use.
              </p>

              {appsLoading ? (
                <p className="mt-8 text-center text-sm text-neutral-400">Loading suggestions...</p>
              ) : (
                <>
                  {recommendedApps.length > 0 && (
                    <div className="mt-6">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Recommended for you</p>
                      {professionName && <p className="-mt-1 mb-2 text-xs text-neutral-400">Recommended because you selected {professionName}. STACK only reads what you authorize.</p>}
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {recommendedApps.map((app) => (
                          <AppCard key={app.slug} app={app} pending={connectPending === app.slug} onConnect={() => connectApp(app)} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">You might also use</p>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {universalApps.map((app) => (
                        <AppCard key={app.slug} app={app} pending={connectPending === app.slug} onConnect={() => connectApp(app)} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="mt-4 flex items-center justify-center">
                <button onClick={refreshApps} className="text-xs font-medium text-neutral-400 hover:text-ink">
                  I connected something — refresh status
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h1 className="text-center text-2xl font-semibold text-ink">How did you hear about STACK?</h1>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {referralSources.map((r) => {
                  const active = referral === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => selectReferral(r.id)}
                      className={cn(
                        "rounded-xl border px-3.5 py-3 text-sm transition-colors",
                        active ? "border-ink bg-neutral-50 font-medium text-ink" : "border-neutral-200 text-neutral-600 hover:border-neutral-300",
                      )}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h1 className="text-center text-2xl font-semibold text-ink">Choose the plan that works for you.</h1>
              <div className="mt-5 flex items-center justify-center gap-1 rounded-xl bg-neutral-100 p-1">
                {(["monthly", "yearly"] as Interval[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setInterval(v)}
                    className={cn(
                      "rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                      interval === v ? "bg-white text-ink shadow-sm" : "text-neutral-500",
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
              {checkoutError && <p className="mt-3 text-center text-xs text-red">{checkoutError}</p>}
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="flex flex-col rounded-2xl border border-neutral-200 p-4">
                    <p className="text-sm font-semibold text-ink">{plan.name}</p>
                    <p className="mt-2 text-2xl font-semibold text-ink">
                      ${interval === "monthly" ? plan.monthly : Math.round(plan.yearly / 12)}
                      <span className="text-sm font-normal text-neutral-400">{plan.per}</span>
                    </p>
                    {interval === "yearly" && <p className="text-xs text-neutral-400">${plan.yearly} billed yearly</p>}
                    <p className="mt-2 text-xs text-neutral-500">{plan.description}</p>
                    <ul className="mt-3 flex-1 space-y-1.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs text-neutral-600">
                          <Check size={12} className="mt-0.5 shrink-0 text-blue" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Button size="sm" className="mt-4 w-full" disabled={checkoutPending !== null} onClick={() => subscribe(plan.id)}>
                      {checkoutPending === plan.id ? "Redirecting..." : `Choose ${plan.name}`}
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-2xl border border-neutral-200 p-4 text-center">
                <p className="text-sm font-medium text-ink">Enterprise — Custom</p>
                <p className="mt-1 text-xs text-neutral-500">Advanced security, organization controls, custom integrations, dedicated support.</p>
                <a href="mailto:sales@stack.app" className="mt-2 inline-block text-xs font-medium text-blue hover:underline">Contact Sales</a>
              </div>
              <div className="mt-4 flex justify-center">
                <button onClick={chooseFree} className="text-sm font-medium text-neutral-400 hover:text-ink">
                  Continue with Free →
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col items-center text-center">
              <LogoMark size={48} />
              <h1 className="mt-6 text-2xl font-semibold text-ink">Your STACK is ready.</h1>
              <div className="mt-4 h-5">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={readyMessageIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm text-neutral-500"
                  >
                    {readyMessages[readyMessageIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
              <Button className="mt-8" onClick={enterStack}>
                Enter STACK <ArrowRight size={15} />
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {step !== 5 && (
        <div className="mt-10 flex items-center justify-between">
          {step > 0 ? <Button variant="ghost" onClick={goBack}>Back</Button> : <span />}
          {step === 4 ? <span /> : <Button onClick={goNext}>{step === 0 ? "Get Started" : "Continue"}</Button>}
        </div>
      )}
    </div>
  );
}

const STATUS_META: Record<ConnectionStatus, { label: string; icon?: typeof Clock }> = {
  connected: { label: "Connected" },
  error: { label: "Connection error", icon: AlertTriangle },
  available: { label: "Connect" },
  needs_setup: { label: "Needs setup" },
  desktop_app: { label: "Desktop app", icon: Monitor },
  external_tool: { label: "Coming soon", icon: Clock },
  unavailable: { label: "Unavailable", icon: Ban },
};

function AppCard({ app, pending, onConnect }: { app: AppEntry; pending: boolean; onConnect: () => void }) {
  const disabled = app.status !== "available" || pending;
  const meta = STATUS_META[app.status];
  const StatusIcon = meta.icon;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-50">
        <IntegrationLogo app={app.oauthProviderId ?? app.slug} name={app.name} size="md" logoPath={app.logoPath} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{app.name}</p>
        <p className="truncate text-xs text-neutral-400">{app.description}</p>
      </div>
      <Button
        size="sm"
        variant={app.connected ? "outline" : "primary"}
        disabled={disabled}
        title={app.status === "needs_setup" ? app.missingSetup.join("; ") : app.status === "external_tool" ? "STACK doesn't have this integration built yet" : app.status === "desktop_app" ? "Local software — nothing for STACK to authorize" : app.status === "unavailable" ? "No public API exists for STACK to connect to" : undefined}
        onClick={onConnect}
        className="shrink-0"
      >
        {pending ? (
          "Opening..."
        ) : (
          <>
            {app.status === "connected" && <Check size={13} />}
            {StatusIcon && <StatusIcon size={13} />}
            {meta.label}
          </>
        )}
      </Button>
    </div>
  );
}
