import { hand } from "@/components/landing/story/fonts";
import { Coffee, Keyboard, LaptopCorner, Paperclip, Pencil, StickyNote } from "@/components/landing/story/desk";
import { cn } from "@/lib/utils";

type Scene = "auth" | "message" | "onboarding" | "plain";

/**
 * The grey desk the public site is built on (see the landing page): light falling on the middle, a few objects
 * around the edges on wide screens, and the "calm" palette so every page outside the app looks like one product.
 */
export function DeskSurface({ scene = "plain", note, className, children }: { scene?: Scene; note?: string[]; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("calm relative isolate min-h-screen overflow-hidden", hand.variable, className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_65%_55%_at_50%_40%,#ffffff_0%,rgba(255,255,255,0)_72%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden xl:block">
        {scene === "auth" && (
          <>
            <Keyboard className="bottom-[-40px] left-[-190px] rotate-[-16deg]" />
            <Coffee className="right-[9%] top-[12%]" />
            <Pencil className="bottom-[14%] right-[6%] rotate-[-30deg]" />
          </>
        )}
        {scene === "message" && (
          <>
            <LaptopCorner className="right-[-360px] top-[-180px] rotate-[18deg]" />
            <Coffee className="bottom-[12%] left-[10%]" />
            {note && <StickyNote lines={note} className="right-[12%] bottom-[16%] rotate-[5deg]" />}
          </>
        )}
        {scene === "onboarding" && (
          <>
            <Paperclip className="left-[10%] top-[16%] rotate-[28deg]" />
            <Coffee className="bottom-[10%] right-[8%]" />
            <Pencil className="bottom-[18%] left-[5%] rotate-[24deg]" />
          </>
        )}
      </div>
      {children}
    </div>
  );
}

/** The white sheet every form or message sits on: soft paper shadow, a page or two peeking out underneath. */
export function PaperSheet({ children, className, pages = true }: { children: React.ReactNode; className?: string; pages?: boolean }) {
  return (
    <div className="relative">
      {pages && (
        <>
          <div aria-hidden className="absolute inset-x-3 -top-2 bottom-3 rotate-[-2deg] rounded-[14px] bg-[#ffffff] shadow-[0_18px_30px_-20px_rgba(0,0,0,0.28)]" />
          <div aria-hidden className="absolute inset-x-5 top-0 bottom-2 rotate-[1.6deg] rounded-[14px] bg-[#fcfcfc] shadow-[0_18px_30px_-20px_rgba(0,0,0,0.22)]" />
        </>
      )}
      <div className={cn("relative rounded-[14px] bg-white shadow-[0_40px_60px_-34px_rgba(0,0,0,0.32),0_4px_10px_-4px_rgba(0,0,0,0.08)]", className)}>{children}</div>
    </div>
  );
}
