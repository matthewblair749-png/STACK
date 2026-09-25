"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { IntegrationCard } from "@/components/integration-card";
import { integrations } from "@/lib/demo-data";
import { SectionHeader } from "./section-header";

const featured = [
  "gmail", "slack", "notion", "google-calendar", "drive", "github",
  "hubspot", "asana", "stripe", "zoom", "trello", "dropbox",
];

export function IntegrationsTeaser() {
  const shown = featured.map((id) => integrations.find((i) => i.id === id)!).filter(Boolean);

  return (
    <section id="integrations" className="bg-white py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Integrations"
          title="Your tools. Still your tools."
          subtitle="STACK doesn't replace the apps you rely on — it connects and understands them."
          className="max-w-2xl"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mt-16 grid grid-cols-1 gap-5 sm:grid-cols-3 lg:grid-cols-4"
        >
          {shown.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} />
          ))}
        </motion.div>

        <div className="mt-12 flex justify-center">
          <Link href="/integrations"><Button size="lg" variant="outline">Browse all integrations</Button></Link>
        </div>
      </div>
    </section>
  );
}
