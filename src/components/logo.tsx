"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/*
 * The mark: three solid layers seen from above, with the middle one - the thing that matters - pulled out of the
 * stack in highlighter yellow. Drawn bottom to top so each layer sits in front of the one beneath it. Solid shapes
 * (not outlines) so it stays legible at 16px. The same paths are in the browser-tab icon (src/app/icon.svg).
 */
const LAYERS = [
  { d: "M10.5 13.5L19 17.5L10.5 21.5L2 17.5Z", move: { y: [0, 1.2, 0] } },
  { d: "M14 8L22.5 12L14 16L5.5 12Z", move: { x: [0, 1.4, 0] }, yellow: true },
  { d: "M10.5 2.5L19 6.5L10.5 10.5L2 6.5Z", move: { y: [0, -1.2, 0] } },
];

/** STACK's highlighter yellow, a shade deep enough to hold up on light paper. */
export const LOGO_YELLOW = "#f5c400";

export function LogoMark({ size = 28, animate = true, className }: { size?: number; animate?: boolean; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      className={cn("shrink-0 overflow-visible text-ink", className)}
    >
      {LAYERS.map((l, i) => (
        <motion.path
          key={l.d}
          d={l.d}
          fill={l.yellow ? LOGO_YELLOW : undefined}
          stroke={l.yellow ? LOGO_YELLOW : undefined}
          initial={false}
          // Every so often the layers part and the yellow one slides out, then it all settles back.
          animate={animate ? l.move : { x: 0, y: 0 }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut", delay: i * 0.07 }}
        />
      ))}
    </svg>
  );
}

/** The app icon on a transparent background: the same layers as the browser-tab icon (src/app/icon.svg), in the theme's text color. */
export function LogoIcon({ size = 28, animate = true, className }: { size?: number; animate?: boolean; className?: string }) {
  return <LogoMark size={size} animate={animate} className={className} />;
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
