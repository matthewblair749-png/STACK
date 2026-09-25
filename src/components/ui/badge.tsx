import { cn } from "@/lib/utils";

type Accent = "blue" | "yellow" | "red" | "green" | "neutral";

const styles: Record<Accent, string> = {
  blue: "bg-blue-soft text-blue",
  yellow: "bg-yellow-soft text-neutral-900",
  red: "bg-red-soft text-red",
  green: "bg-green-soft text-green",
  neutral: "bg-neutral-100 text-neutral-700",
};

const dotStyles: Record<Accent, string> = {
  blue: "bg-blue",
  yellow: "bg-yellow",
  red: "bg-red",
  green: "bg-green",
  neutral: "bg-neutral-400",
};

export function Badge({
  accent = "neutral",
  dot = false,
  className,
  children,
}: {
  accent?: Accent;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        styles[accent],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotStyles[accent])} />}
      {children}
    </span>
  );
}

export function PriorityDot({ priority }: { priority: "normal" | "important" | "urgent" }) {
  const map = { normal: "bg-blue", important: "bg-yellow", urgent: "bg-red" };
  return <span className={cn("inline-block h-2 w-2 rounded-full", map[priority])} />;
}
