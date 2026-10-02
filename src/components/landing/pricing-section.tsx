"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pricingPlans } from "@/components/pricing-plans";
import { cn } from "@/lib/utils";

export function PricingSection({ compact = false }: { compact?: boolean }) {
  return (
    <section id="pricing-section" className={cn("mx-auto max-w-7xl px-6", compact ? "py-4" : "py-28 sm:py-36")}>
      {!compact && (
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue">Pricing</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
            Free while we&apos;re in early access.
          </h2>
          <p className="mt-6 text-lg text-neutral-500 sm:text-xl">
            No card, no trial clock. If paid plans arrive later, you&apos;ll hear about it before anything is ever charged.
          </p>
        </div>
      )}

      <div className="mx-auto mt-16 grid max-w-3xl gap-6 sm:grid-cols-2">
        {pricingPlans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className={cn(
              "flex flex-col rounded-3xl border p-7",
              plan.highlighted ? "border-ink bg-ink text-paper" : "border-neutral-100 bg-white",
            )}
          >
            <p className={cn("text-base font-semibold", plan.highlighted ? "text-paper" : "text-ink")}>{plan.name}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
              {plan.period && <span className={cn("text-sm", plan.highlighted ? "text-neutral-400" : "text-neutral-500")}>{plan.period}</span>}
            </div>
            <p className={cn("mt-2.5 text-sm", plan.highlighted ? "text-neutral-400" : "text-neutral-500")}>{plan.description}</p>

            <ul className="mt-6 flex-1 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check size={15} className={cn("mt-0.5 shrink-0", plan.highlighted ? "text-yellow" : "text-blue")} />
                  <span className={plan.highlighted ? "text-neutral-200" : "text-neutral-700"}>{f}</span>
                </li>
              ))}
            </ul>

            {plan.comingSoon ? (
              <Button size="lg" className="mt-7 w-full" variant="outline" disabled>
                {plan.cta}
              </Button>
            ) : (
              <Link href="/signup" className="mt-7">
                <Button size="lg" className="w-full" variant={plan.highlighted ? "secondary" : "outline"}>
                  {plan.cta}
                </Button>
              </Link>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
