"use client";

import { motion } from "framer-motion";
import { Mail, Calendar, CheckSquare } from "lucide-react";
import { LogoIcon } from "@/components/logo";
import { BrandIcon } from "@/components/brand-icons";
import { SectionHeader } from "./section-header";

const scattered = [
  { icon: Mail, label: "Email", sub: "Q4 proposal needs sign-off", color: "#EA4335", rot: -6, top: "0%", left: "2%" },
  { brandId: "slack", label: "Slack message", sub: "“Can you review this today?”", rot: 5, top: "4%", left: "58%" },
  { icon: Calendar, label: "Calendar event", sub: "Launch sync · 2:00 PM", color: "#2F5EFF", rot: -3, top: "44%", left: "26%" },
  { icon: CheckSquare, label: "Task", sub: "Finish product proposal", color: "#FC636B", rot: 4, top: "48%", left: "70%" },
];

export function ProblemSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28 sm:py-36">
      <SectionHeader
        eyebrow="The problem"
        accent="red"
        title={<>Your work is everywhere.</>}
        subtitle="Email here. A Slack message there. A calendar invite, a task, a file, a notification — scattered across a dozen tabs you have to hold in your head all day."
        className="max-w-2xl"
      />

      <div className="relative mx-auto mt-20 h-[280px] max-w-xl sm:h-[300px]">
        {scattered.map((item, i) => {
          const Icon = "icon" in item ? item.icon : undefined;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
              whileInView={{ opacity: 1, scale: 1, rotate: item.rot }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{ top: item.top, left: item.left }}
              className="absolute w-60 rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_20px_44px_-20px_rgba(0,0,0,0.25)]"
            >
              <div className="flex items-center gap-2">
                {Icon ? (
                  <Icon size={17} color={"color" in item ? item.color : undefined} strokeWidth={2} />
                ) : (
                  "brandId" in item && <BrandIcon id={item.brandId!} size={17} />
                )}
                <span className="text-sm font-semibold text-neutral-700">{item.label}</span>
              </div>
              <p className="mt-2 text-sm text-ink">{item.sub}</p>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto mt-20 flex max-w-4xl flex-col items-center rounded-3xl bg-ink px-8 py-20 text-center sm:px-20"
      >
        <LogoIcon size={48} className="text-white" />
        <h3 className="mt-7 text-4xl font-semibold tracking-tight text-paper sm:text-5xl">
          From scattered to connected.
        </h3>
        <p className="mt-5 max-w-lg text-lg text-neutral-400">
          STACK pulls every one of those moments into a single, intelligent
          view — so you always know what needs you next.
        </p>
      </motion.div>
    </section>
  );
}
