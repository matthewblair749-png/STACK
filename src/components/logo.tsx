"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/*
 * Four stacked layers, one colour each - blue, red, green, yellow from the top - the same as the browser-tab icon
 * (src/app/icon.svg). The colours are the site's own blue/red/green plus the logo yellow.
 */
const layers = [
  { d: "M12 2L22 6L12 10L2 6Z", color: "#2f4fe0" },
  { d: "M2 10L12 14L22 10", color: "#e5483b" },
  { d: "M2 14L12 18L22 14", color: "#1f9d55" },
  { d: "M2 18L12 22L22 18", color: "#f5c400" },
];

const separateOffsets = [-1.6, -0.55, 0.55, 1.6];

export function LogoMark({
  size = 28,
  animate = true,
  strokeWidth = 2,
  className,
}: {
  size?: number;
  animate?: boolean;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0 overflow-visible text-ink", className)}
    >
      {layers.map(({ d, color }, i) => (
        <motion.path
          key={d}
          d={d}
          stroke={color}
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

/** The app icon on a transparent background: the same bold layers as the browser-tab icon (src/app/icon.svg), in the theme's text color. */
export function LogoIcon({ size = 28, animate = true, className }: { size?: number; animate?: boolean; className?: string }) {
  return <LogoMark size={size} strokeWidth={2.4} animate={animate} className={className} />;
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
      <LogoIcon size={size} animate={animate} />
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
