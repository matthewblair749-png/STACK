import { hand } from "@/components/landing/story/fonts";
import { Coffee, DeskClock, Highlighter, IndexTab, Phone, StickyNote } from "@/components/landing/story/desk";
import { cn } from "@/lib/utils";

type Scene = "auth" | "message" | "onboarding" | "plain";

/**
 * The grey desk the public site is built on (see the landing page): light falling on the middle, a few objects
 * around the edges on wide screens, and the "calm" palette so every page outside the app looks like one product.
 */
export function DeskSurface({ scene = "plain", note, className, children }: { scene?: Scene; note?: string[]; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("calm relative isolate min-h-screen overflow-hidden", hand.variable, className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_65%_55%_at_50%_40%,#fbfaf7_0%,rgba(251,250,247,0)_72%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden xl:block">
        {scene === "auth" && (
          <>
            <DeskClock className="left-[9%] top-[12%]" />
            <Phone className="bottom-[-80px] right-[7%] rotate-[-14deg]" />
            <Highlighter className="bottom-[16%] left-[8%] rotate-[18deg]" />
          </>
        )}
        {scene === "message" && (
          <>
            <DeskClock className="right-[8%] top-[10%]" />
            <Coffee className="bottom-[12%] left-[10%]" />
            {note && <StickyNote lines={note} className="right-[12%] bottom-[16%] rotate-[5deg]" />}
          </>
        )}
        {scene === "onboarding" && (
          <>
            <DeskClock className="left-[7%] top-[10%]" />
            <Coffee className="bottom-[10%] right-[8%]" />
            <Highlighter className="bottom-[18%] left-[6%] rotate-[-16deg]" />
          </>
        )}
      </div>
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
          <div aria-hidden className="absolute inset-x-6 -top-[16px] bottom-6 rounded-[14px] border border-neutral-200 bg-[#fbfaf8]" />
          <div aria-hidden className="absolute inset-x-3 -top-[8px] bottom-3 rounded-[14px] border border-neutral-200 bg-[#ffffff]" />
        </>
      )}
      {tab && <IndexTab label={tab} className={pages ? "-top-[42px] z-10" : "z-10"} />}
      <div className={cn("relative rounded-[14px] bg-white shadow-[0_40px_60px_-34px_rgba(0,0,0,0.32),0_4px_10px_-4px_rgba(0,0,0,0.08)]", className)}>{children}</div>
    </div>
  );
}
