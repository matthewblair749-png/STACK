import { IndexTab } from "@/components/landing/story/desk";
import { cn } from "@/lib/utils";

/**
 * The surface the public site is built on: the "calm" palette and soft light falling on the middle, so every page
 * outside the app looks like one product.
 */
export function DeskSurface({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("calm relative isolate min-h-screen overflow-hidden", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_65%_55%_at_50%_40%,#fbfaf7_0%,rgba(251,250,247,0)_72%)]" />
      {children}
    </div>
  );
}

/** The white sheet every form or message sits on: soft paper shadow, a page or two stacked underneath, and an optional yellow index tab. */
export function PaperSheet({ children, className, pages = true, tab }: { children: React.ReactNode; className?: string; pages?: boolean; tab?: string }) {
  return (
    <div className="relative">
      {pages && (
        <>
          <div aria-hidden className="clay-sm absolute inset-x-6 -top-[16px] bottom-6 !rounded-[26px] bg-[#fbf8f2]" />
          <div aria-hidden className="clay-sm absolute inset-x-3 -top-[8px] bottom-3 !rounded-[26px] bg-[#fffdf9]" />
        </>
      )}
      {tab && <IndexTab label={tab} className={pages ? "-top-[42px] z-10" : "z-10"} />}
      <div className={cn("clay relative bg-white shadow-[0_40px_60px_-34px_rgba(0,0,0,0.32),0_4px_10px_-4px_rgba(0,0,0,0.08)]", className)}>{children}</div>
    </div>
  );
}
