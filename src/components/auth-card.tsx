"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/logo";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-25 px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center text-center">
          <Link href="/"><Logo size={30} /></Link>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-1.5 text-sm text-neutral-500">{subtitle}</p>
        </div>

        <div className="mt-8 rounded-2xl border border-neutral-100 bg-white p-6 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.2)]">
          {children}
        </div>

        {footer && <p className="mt-6 text-center text-sm text-neutral-500">{footer}</p>}
      </motion.div>
    </div>
  );
}
