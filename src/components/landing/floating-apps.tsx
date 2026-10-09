"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { LogoIcon } from "@/components/logo";
import { BrandIcon } from "@/components/brand-icons";

const apps = [
  { name: "Gmail", brandId: "gmail", top: "20%", left: "6%", depth: 0.7, delay: 0 },
  { name: "Calendar", brandId: "google-calendar", top: "6%", left: "32%", depth: 0.5, delay: 0.5 },
  { name: "Notion", brandId: "notion", top: "10%", left: "66%", depth: 0.6, delay: 0.3 },
  { name: "Asana", brandId: "asana", top: "24%", left: "92%", depth: 0.9, delay: 0.15 },
  { name: "Slack", brandId: "slack", top: "80%", left: "12%", depth: 0.8, delay: 0.45 },
  { name: "Drive", brandId: "drive", top: "92%", left: "36%", depth: 0.9, delay: 0.6 },
  { name: "Linear", brandId: "linear", top: "92%", left: "64%", depth: 0.7, delay: 0.2 },
  { name: "GitHub", brandId: "github", top: "80%", left: "90%", depth: 0.6, delay: 0.35 },
];

function FloatingCard({
  app,
  index,
  sx,
  sy,
}: {
  app: (typeof apps)[number];
  index: number;
  sx: MotionValue<number>;
  sy: MotionValue<number>;
}) {
  const x = useTransform(sx, (v) => v * -18 * app.depth);
  const y = useTransform(sy, (v) => v * -18 * app.depth);

  return (
    <motion.div
      className="absolute -translate-x-1/2 -translate-y-1/2 animate-float-slow"
      style={
        {
          top: app.top,
          left: app.left,
          x,
          y,
          "--rot": `${(index % 2 === 0 ? -1 : 1) * (2 + index)}deg`,
          animationDelay: `${app.delay}s`,
        } as unknown as React.CSSProperties
      }
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.15 * index, ease: "easeOut" }}
    >
      <div className="flex items-center gap-2.5 whitespace-nowrap rounded-2xl border border-neutral-100 bg-white/95 px-5 py-3.5 shadow-[0_16px_36px_-18px_rgba(0,0,0,0.3)] backdrop-blur">
        <BrandIcon id={app.brandId} size={20} />
        <span className="text-base font-medium text-neutral-800">{app.name}</span>
      </div>
    </motion.div>
  );
}

export function FloatingApps() {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className="relative mx-auto mt-16 h-[400px] w-full max-w-6xl select-none sm:h-[480px]"
      style={{ perspective: 1200 }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative flex items-center justify-center"
        >
          <LogoIcon size={84} />
        </motion.div>
      </div>

      {apps.map((app, i) => (
        <FloatingCard key={app.name} app={app} index={i} sx={sx} sy={sy} />
      ))}
    </div>
  );
}
