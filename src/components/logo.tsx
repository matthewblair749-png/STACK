"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const layerPaths = [
  "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",
  "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",
  "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",
];

const separateOffsets = [-1.6, 0, 1.6];

export function LogoMark({
  size = 28,
  animate = true,
  className,
}: {
  size?: number;
  animate?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0 text-ink", className)}
    >
      {layerPaths.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          initial={false}
          animate={animate ? { y: [0, separateOffsets[i], 0] } : { y: 0 }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            repeatDelay: 1.6,
            ease: "easeInOut",
            delay: i * 0.07,
          }}
        />
      ))}
    </svg>
  );
}

export function Logo({
  size = 28,
  animate = true,
  showWordmark = true,
  className,
  textClassName,
}: {
  size?: number;
  animate?: boolean;
  showWordmark?: boolean;
  className?: string;
  textClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark size={size} animate={animate} />
      {showWordmark && (
        <span
          className={cn(
            "font-semibold tracking-tight text-ink",
            textClassName ?? "text-lg",
          )}
        >
          STACK
        </span>
      )}
    </div>
  );
}
