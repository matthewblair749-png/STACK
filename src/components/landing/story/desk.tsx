/*
 * Objects on STACK's desk, seen from above, drawn in CSS/SVG (no images). Each one belongs to the story - the
 * 8:47 clock, the phone that won't stop buzzing, the three priorities on a sticky note, the coffee for the
 * morning. Decoration only: hidden from screen readers, never clickable, lit from the same top-left light.
 */
import { cn } from "@/lib/utils";

/** A round desk clock showing 8:47. */
export function DeskClock({ className }: { className?: string }) {
  // 8:47 -> minute hand at 282deg, hour hand at 8*30 + 47*0.5 = 263.5deg (0deg = 12 o'clock).
  return (
    <div aria-hidden className={cn("pointer-events-none absolute h-[150px] w-[150px]", className)}>
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#3a3834,#1c1b19_70%)] shadow-[0_26px_30px_-16px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.15)]" />
      <div className="absolute inset-[10px] rounded-full bg-[radial-gradient(circle_at_40%_35%,#ffffff,#f3f1ec)] shadow-[inset_0_2px_6px_rgba(0,0,0,0.18)]">
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            className={cn("absolute left-1/2 top-[6px] rounded-full bg-[#1c1b19]", i % 3 === 0 ? "h-[10px] w-[3px]" : "h-[6px] w-[2px]")}
            style={{ transformOrigin: "50% 59px", transform: `translateX(-50%) rotate(${i * 30}deg)` }}
          />
        ))}
        <span className="absolute bottom-1/2 left-1/2 h-[32px] w-[4px] rounded-full bg-[#1c1b19]" style={{ transformOrigin: "50% 100%", transform: "translateX(-50%) rotate(263.5deg)" }} />
        <span className="absolute bottom-1/2 left-1/2 h-[46px] w-[3px] rounded-full bg-[#1c1b19]" style={{ transformOrigin: "50% 100%", transform: "translateX(-50%) rotate(282deg)" }} />
        <span className="absolute left-1/2 top-1/2 h-[8px] w-[8px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e8a400]" />
      </div>
    </div>
  );
}

/** A phone lying face up, its lock screen full of notifications. */
export function Phone({ count = 47, className }: { count?: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute h-[300px] w-[148px] rounded-[30px] bg-[#1c1b19] p-[7px]", className)}
      style={{ boxShadow: "0 36px 40px -24px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)" }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[24px] bg-[linear-gradient(170deg,#2c2f45,#16171f)] px-2.5 pt-7">
        <span className="absolute left-1/2 top-2 h-[14px] w-[44px] -translate-x-1/2 rounded-full bg-[#0d0d10]" />
        <p className="text-center text-[30px] font-light leading-none text-[#ffffff]">8:47</p>
        <p className="mt-1 text-center text-[8px] text-[#c9cbe0]">Tuesday</p>
        <div className="mt-4 space-y-1.5">
          {["Slack · 14 new", "Gmail · 23 new", "Calendar · moved", "GitHub · build failed"].map((n) => (
            <div key={n} className="rounded-[9px] bg-[rgba(255,255,255,0.14)] px-2 py-1.5 text-[8px] font-medium text-[#ffffff]">
              {n}
            </div>
          ))}
        </div>
        <span className="absolute right-2 top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff4433] px-1 text-[9px] font-semibold text-[#ffffff]">
          {count}
        </span>
      </div>
    </div>
  );
}

export function Coffee({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute h-[170px] w-[170px]", className)}>
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_40%_35%,#ffffff,#efece6_70%,#e2ded5)] shadow-[0_24px_30px_-16px_rgba(0,0,0,0.3)]" />
      <div className="absolute right-[6px] top-[72px] h-[26px] w-[34px] rounded-full border-[7px] border-[#f6f4ef] shadow-[2px_4px_6px_rgba(0,0,0,0.15)]" />
      <div className="absolute left-[30px] top-[30px] h-[110px] w-[110px] rounded-full bg-[#fbfaf8] shadow-[0_10px_18px_-6px_rgba(0,0,0,0.28),inset_0_0_0_2px_#ffffff]" />
      <div className="absolute left-[42px] top-[42px] h-[86px] w-[86px] rounded-full bg-[radial-gradient(circle_at_42%_38%,#b07a4c_0%,#7a4a24_45%,#4a2a12_80%)] shadow-[inset_0_3px_8px_rgba(0,0,0,0.45)]" />
      <div className="absolute left-[60px] top-[56px] h-[22px] w-[34px] rounded-full bg-[rgba(255,240,220,0.18)] blur-[3px]" />
    </div>
  );
}

export function StickyNote({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute w-[190px] px-5 pb-6 pt-5 text-[22px] leading-[1.15] text-[#3b3423]", className)}
      style={{
        background: "linear-gradient(170deg,#fff3a6,#ffe680 70%,#f9dc6a)",
        boxShadow: "0 22px 24px -16px rgba(0,0,0,0.32), 0 2px 3px rgba(0,0,0,0.08)",
        fontFamily: "var(--font-hand), 'Comic Sans MS', cursive",
      }}
    >
      {lines.map((l) => (
        <p key={l}>{l}</p>
      ))}
    </div>
  );
}

/** A yellow highlighter, cap off - what STACK does to your day. */
export function Highlighter({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute flex h-[26px] w-[230px] items-stretch drop-shadow-[4px_9px_7px_rgba(0,0,0,0.22)]", className)}>
      <span className="w-[22px] rounded-l-[8px] bg-[#1c1b19]" />
      <span className="flex-1 bg-[linear-gradient(180deg,#fff27a,#ffe14d_55%,#f2cb1d)]" />
      <span className="w-[16px] bg-[linear-gradient(180deg,#f4f2ee,#c9c5bc,#f4f2ee)]" />
      <span className="w-[22px] bg-[#ffe14d] [clip-path:polygon(0_0,100%_30%,100%_70%,0_100%)]" />
    </div>
  );
}

/** The index tab sticking out of the top of a sheet, labelling what's in the stack. */
export function IndexTab({ label, className }: { label: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("absolute -top-[26px] left-6 rounded-t-[8px] bg-[#ffe14d] px-3.5 pb-2 pt-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#121110]", className)}
    >
      {label}
    </span>
  );
}
