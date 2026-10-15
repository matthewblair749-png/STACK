/* Small pieces of the paper-and-clay look shared by the public pages. */
import { cn } from "@/lib/utils";

/** The index tab sticking out of the top of a sheet, labelling what's in the stack. */
export function IndexTab({ label, className }: { label: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("absolute -top-[26px] left-6 rounded-t-[14px] bg-[linear-gradient(180deg,#a9bbff,#7b95ff)] shadow-[inset_0_3px_5px_rgba(255,255,255,0.7)] px-4 pb-2 pt-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#121110]", className)}
    >
      {label}
    </span>
  );
}
