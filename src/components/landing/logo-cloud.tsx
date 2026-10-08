"use client";

import { motion } from "framer-motion";
import { BrandIcon } from "@/components/brand-icons";

const tools = [
  { name: "Linear", id: "linear" },
  { name: "Notion", id: "notion" },
  { name: "GitHub", id: "github" },
  { name: "Google Drive", id: "drive" },
  { name: "Google Calendar", id: "google-calendar" },
  { name: "Trello", id: "trello" },
  { name: "Asana", id: "asana" },
  { name: "Slack", id: "slack" },
  { name: "ClickUp", id: "clickup" },
  { name: "Zendesk", id: "zendesk" },
];

export function LogoCloud() {
  return (
    <div className="mx-auto mt-10 max-w-4xl px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
        Connect the tools you already use
      </p>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="mt-4 flex flex-wrap items-center justify-center gap-2"
      >
        {tools.map((tool) => (
          <span
            key={tool.name}
            className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600"
          >
            <BrandIcon id={tool.id} size={13} />
            {tool.name}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
