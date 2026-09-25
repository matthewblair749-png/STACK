"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { StructuredAnswer } from "@/lib/work-types";

function OpenLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = /^https?:|^slack:/.test(href);
  const cls = "inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-ink hover:border-ink";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children} <ExternalLink size={11} />
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/** A work-connected answer: the answer, the specific findings behind it, and what to do next. */
export function AiAnswer({ answer }: { answer: StructuredAnswer }) {
  const reduce = useReducedMotion();
  const reveal = (i: number) => (reduce ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay: 0.12 + i * 0.1 } });
  return (
    <div className="space-y-3">
      <motion.p {...reveal(-1)} className="text-[15px] font-medium leading-snug text-ink">{answer.headline}</motion.p>
      {answer.findings.length > 0 && (
        <ol className="space-y-2.5">
          {answer.findings.map((f, i) => (
            <motion.li key={`${f.title}-${i}`} {...reveal(i)} className="flex gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-semibold text-neutral-600">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{f.title}</p>
                <p className="text-sm text-neutral-500">{f.detail}</p>
                {f.source && (
                  <p className="mt-1 text-xs text-neutral-400">
                    From{" "}
                    {f.source.href ? (
                      /^https?:|^slack:/.test(f.source.href) ? (
                        <a href={f.source.href} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">{f.source.label}</a>
                      ) : (
                        <Link href={f.source.href} className="underline hover:text-ink">{f.source.label}</Link>
                      )
                    ) : (
                      f.source.label
                    )}
                  </p>
                )}
              </div>
            </motion.li>
          ))}
        </ol>
      )}
      {answer.nextStep && (
        <motion.div {...reveal(answer.findings.length)} className="rounded-xl bg-blue-soft/70 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue">Recommended next step</p>
          <p className="mt-0.5 flex items-start gap-1.5 text-sm text-ink">
            <ArrowRight size={14} className="mt-0.5 shrink-0 text-blue" /> {answer.nextStep}
          </p>
        </motion.div>
      )}
      {answer.actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {answer.actions.map((a) => (
            <OpenLink key={`${a.label}-${a.href}`} href={a.href}>
              {a.label}
            </OpenLink>
          ))}
        </div>
      )}
    </div>
  );
}
