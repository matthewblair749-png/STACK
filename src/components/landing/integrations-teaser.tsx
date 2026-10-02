"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { IntegrationLogo } from "@/components/brand-icons";
import { SectionHeader } from "./section-header";

/** A sample of apps STACK can really connect to today - logos only, no pretend "connected" states. */
export function IntegrationsTeaser({ featured, total }: { featured: { id: string; name: string }[]; total: number }) {
  return (
    <section id="integrations" className="bg-white py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Integrations"
          title="Your tools. Still your tools."
          subtitle={`STACK doesn't replace the apps you rely on - it connects and understands them. ${total} apps work today, from email and chat to CRMs, support desks and code.`}
          className="max-w-2xl"
        />

        <motion.ul
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        >
          {featured.map((app) => (
            <li key={app.id} className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-50">
                <IntegrationLogo app={app.id} name={app.name} size="md" />
              </span>
              <span className="truncate text-sm font-semibold text-ink">{app.name}</span>
            </li>
          ))}
        </motion.ul>

        <div className="mt-12 flex justify-center">
          <Link href="/signup"><Button size="lg" variant="outline">Get started and connect yours</Button></Link>
        </div>
      </div>
    </section>
  );
}
