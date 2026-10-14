/*
 * Objects on a desk, seen from above, drawn in CSS/SVG (no images). They are decoration only: hidden from
 * screen readers, never clickable, and lit from the same top-left light so their shadows agree.
 */
import { cn } from "@/lib/utils";

const keyShadow = "0 1px 0 rgba(0,0,0,0.10), 0 2px 3px rgba(0,0,0,0.06), inset 0 -1px 0 rgba(0,0,0,0.04)";

/** Rows of key widths (in key units), roughly a compact wireless keyboard. */
const ROWS = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.6],
  [1.6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.7],
  [2.4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.4],
  [1, 1, 1, 1.3, 5.2, 1.3, 1, 2.2],
];

export function Keyboard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute w-[560px] rounded-[18px] p-3", className)}
      style={{
        background: "linear-gradient(180deg,#fbfbfc,#e7e7ea)",
        boxShadow: "0 40px 50px -30px rgba(0,0,0,0.35), 0 10px 18px -10px rgba(0,0,0,0.18), inset 0 1px 0 #fff",
      }}
    >
      <div className="flex flex-col gap-[5px]">
        {ROWS.map((row, r) => (
          <div key={r} className="flex gap-[5px]">
            {row.map((w, k) => (
              <span key={k} className="h-[30px] rounded-[6px] bg-[#ffffff]" style={{ flex: w, boxShadow: keyShadow }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Paperclip({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 44 120" className={cn("pointer-events-none absolute w-[44px] drop-shadow-[3px_6px_4px_rgba(0,0,0,0.22)]", className)}>
      <defs>
        <linearGradient id="clip-metal" x1="0" x2="1">
          <stop offset="0" stopColor="#f1f3f6" />
          <stop offset="0.45" stopColor="#9aa1ab" />
          <stop offset="0.7" stopColor="#e6e9ee" />
          <stop offset="1" stopColor="#8d949e" />
        </linearGradient>
      </defs>
      <path
        d="M15 34 V92 a7.5 7.5 0 0 0 15 0 V20 a12 12 0 0 0 -24 0 V96 a16 16 0 0 0 32 0 V38"
        fill="none"
        stroke="url(#clip-metal)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LaptopCorner({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute h-[420px] w-[620px] rounded-[30px] p-6", className)}
      style={{
        background: "linear-gradient(160deg,#d9dbdf,#b9bcc2 55%,#c9ccd1)",
        boxShadow: "0 50px 70px -40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.7)",
      }}
    >
      <div className="grid grid-cols-12 gap-[6px] rounded-[10px] bg-[#9fa3aa] p-2">
        {Array.from({ length: 60 }, (_, i) => (
          <span key={i} className="h-[28px] rounded-[5px] bg-[#2a2b2f] shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]" />
        ))}
      </div>
      <div className="mx-auto mt-5 h-[150px] w-[260px] rounded-[12px] bg-[linear-gradient(180deg,#cfd2d7,#c3c6cc)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)]" />
    </div>
  );
}

export function Coffee({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute h-[170px] w-[170px]", className)}>
      {/* saucer */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_40%_35%,#ffffff,#ececee_70%,#dedee2)] shadow-[0_24px_30px_-16px_rgba(0,0,0,0.3)]" />
      {/* handle */}
      <div className="absolute right-[6px] top-[72px] h-[26px] w-[34px] rounded-full border-[7px] border-[#f4f4f6] shadow-[2px_4px_6px_rgba(0,0,0,0.15)]" />
      {/* cup */}
      <div className="absolute left-[30px] top-[30px] h-[110px] w-[110px] rounded-full bg-[#fafafa] shadow-[0_10px_18px_-6px_rgba(0,0,0,0.28),inset_0_0_0_2px_#ffffff]" />
      {/* coffee with a little crema */}
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

export function Pencil({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute flex h-[16px] w-[300px] items-stretch drop-shadow-[4px_8px_6px_rgba(0,0,0,0.22)]", className)}>
      <span className="w-[22px] rounded-l-[4px] bg-[#f0a6b4]" />
      <span className="w-[14px] bg-[linear-gradient(180deg,#e9eaec,#a9adb4,#e9eaec)]" />
      <span className="flex-1 bg-[linear-gradient(180deg,#ffd45c,#f4b52c_50%,#e8a21a)]" />
      <span className="w-[36px] bg-[#f1d3a5] [clip-path:polygon(0_0,100%_42%,100%_58%,0_100%)]" />
    </div>
  );
}
