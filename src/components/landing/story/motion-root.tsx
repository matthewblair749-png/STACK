"use client";

import { MotionConfig } from "framer-motion";

/** People who ask their system for less motion get the story without the movement. */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
