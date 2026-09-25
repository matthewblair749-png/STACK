"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export function Card({
  className,
  hover = false,
  children,
  ...props
}: {
  hover?: boolean;
  className?: string;
  children?: React.ReactNode;
} & HTMLMotionProps<"div">) {
  return (
    <motion.div
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn(
        "rounded-[20px] border border-neutral-100 bg-paper p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        hover && "cursor-pointer hover:border-neutral-200 hover:shadow-[0_12px_28px_-16px_rgba(0,0,0,0.14)]",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-semibold uppercase tracking-wider text-neutral-500", className)}>
      {children}
    </p>
  );
}
