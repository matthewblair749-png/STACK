/*
 * Objects on STACK's desk, seen from above, drawn in CSS/SVG (no images). Each one belongs to the story - the
 * 8:47 clock, the keyboard you're about to start on, the three priorities on a sticky note, the coffee for the
 * morning. Decoration only: hidden from screen readers, never clickable, lit from the same top-left light.
 */
import { cn } from "@/lib/utils";

/** A soft shadow that grounds an object on the desk: a wide ambient one plus a tight contact one. */
const grounded = "0 34px 44px -22px rgba(30,24,16,0.42), 0 10px 14px -8px rgba(30,24,16,0.28)";

/* Seven-segment digits, drawn as the angled bars of an LED display (a top, b top-right, c bottom-right, d bottom,
   e bottom-left, f top-left, g middle). Unlit segments stay faintly visible, like a real display. */
const hBar = (x1: number, x2: number, y: number) => `${x1},${y} ${x1 + 3.5},${y - 3.5} ${x2 - 3.5},${y - 3.5} ${x2},${y} ${x2 - 3.5},${y + 3.5} ${x1 + 3.5},${y + 3.5}`;
const vBar = (x: number, y1: number, y2: number) => `${x},${y1} ${x + 3.5},${y1 + 3.5} ${x + 3.5},${y2 - 3.5} ${x},${y2} ${x - 3.5},${y2 - 3.5} ${x - 3.5},${y1 + 3.5}`;
const SEGMENTS = {
  a: hBar(7, 33, 4),
  b: vBar(36, 7, 34),
  c: vBar(36, 38, 65),
  d: hBar(7, 33, 68),
  e: vBar(4, 38, 65),
  f: vBar(4, 7, 34),
  g: hBar(7, 33, 36),
};
const DIGITS: Record<string, string> = { "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg" };

function SevenSeg({ digit, color, height }: { digit: string; color: string; height: number }) {
  const on = DIGITS[digit] ?? "";
  return (
    <svg viewBox="0 0 40 72" style={{ height, width: (height * 40) / 72 }}>
      {Object.entries(SEGMENTS).map(([name, points]) => (
        <polygon key={name} points={points} fill={on.includes(name) ? color : "rgba(255,255,255,0.045)"} />
      ))}
    </svg>
  );
}

const LED_YELLOW = "#ffd84a";
const glow = (color: string, px: number) => ({ filter: `drop-shadow(0 0 ${px}px ${color}99)` });

/** A digital LED desk clock: weekdays down the side, 08:47 in big yellow digits, the temperature and the date. */
export function DeskClock({ className }: { className?: string }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute flex h-[104px] w-[330px] items-center gap-3 rounded-[12px] px-3.5", className)}
      style={{
        background: "linear-gradient(180deg,#1c1c1e,#0a0a0b 60%,#121214)",
        boxShadow: `${grounded}, inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.6)`,
      }}
    >
      {/* weekdays, today lit */}
      <div className="flex flex-col gap-[1.5px] text-[8px] font-bold leading-[1.15] tracking-wide">
        {days.map((d) => (
          <span key={d} style={d === "Tue" ? { color: LED_YELLOW, ...glow(LED_YELLOW, 3) } : { color: "rgba(255,255,255,0.88)" }}>
            {d}
          </span>
        ))}
      </div>
      {/* 08:47 */}
      <div className="flex items-center gap-[5px]" style={glow(LED_YELLOW, 5)}>
        <SevenSeg digit="0" color={LED_YELLOW} height={70} />
        <SevenSeg digit="8" color={LED_YELLOW} height={70} />
        <span className="mx-[2px] flex flex-col gap-[14px]">
          <span className="h-[7px] w-[7px] rounded-[1.5px]" style={{ background: LED_YELLOW }} />
          <span className="h-[7px] w-[7px] rounded-[1.5px]" style={{ background: LED_YELLOW }} />
        </span>
        <SevenSeg digit="4" color={LED_YELLOW} height={70} />
        <SevenSeg digit="7" color={LED_YELLOW} height={70} />
      </div>
      {/* temperature and date, in white */}
      <div className="ml-auto flex flex-col items-end gap-2" style={glow("#ffffff", 2)}>
        <div className="flex items-start gap-[3px]">
          <SevenSeg digit="2" color="#ffffff" height={24} />
          <SevenSeg digit="1" color="#ffffff" height={24} />
          <span className="text-[7px] font-semibold leading-none text-[#ffffff]">°C</span>
        </div>
        <div className="flex items-end gap-[3px]">
          <SevenSeg digit="1" color="#ffffff" height={24} />
          <SevenSeg digit="0" color="#ffffff" height={24} />
          <span className="text-[6px] font-semibold leading-none text-[#ffffff]">M</span>
          <SevenSeg digit="1" color="#ffffff" height={24} />
          <SevenSeg digit="4" color="#ffffff" height={24} />
          <span className="text-[6px] font-semibold leading-none text-[#ffffff]">D</span>
        </div>
      </div>
      {/* glass over the display */}
      <div className="absolute inset-0 rounded-[12px] bg-[linear-gradient(160deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.02)_30%,rgba(255,255,255,0)_31%)]" />
    </div>
  );
}

type Key = { w: number; label?: string; kind?: "mod" | "accent" };
const k = (labels: string) => labels.split(" ").map((label) => ({ w: 1, label }));
const mod = (w: number, label = ""): Key => ({ w, label, kind: "mod" });

/** A compact mechanical keyboard: warm off-white keys, charcoal modifiers, and one highlighter-yellow Enter. */
const KEY_ROWS: Key[][] = [
  [{ w: 1, label: "esc", kind: "mod" }, ...k("F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12"), mod(1), mod(1)],
  [...k("` 1 2 3 4 5 6 7 8 9 0 - ="), mod(2, "delete")],
  [mod(1.5, "tab"), ...k("Q W E R T Y U I O P [ ]"), { w: 1.5, label: "\\" }],
  [mod(1.75, "caps"), ...k("A S D F G H J K L ; '"), { w: 2.25, label: "return", kind: "accent" }],
  [mod(2.25, "shift"), ...k("Z X C V B N M , . /"), mod(1.75, "shift"), { w: 1, label: "↑" }],
  [mod(1.25, "ctrl"), mod(1.25, "opt"), mod(1.25, "cmd"), { w: 7 }, mod(1.25, "cmd"), { w: 1, label: "←" }, { w: 1, label: "↓" }, { w: 1, label: "→" }],
];

const KEY_STYLE: Record<"key" | "mod" | "accent", { background: string; color: string; boxShadow: string }> = {
  key: {
    background: "linear-gradient(180deg,#fdfcf9,#ebe7df)",
    color: "#6d6962",
    boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.09), inset 0 1px 0 #ffffff, 0 2px 2px rgba(0,0,0,0.35)",
  },
  mod: {
    background: "linear-gradient(180deg,#4b4945,#2d2b28)",
    color: "#c9c5bc",
    boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.10), 0 2px 2px rgba(0,0,0,0.4)",
  },
  accent: {
    background: "linear-gradient(180deg,#fff27d,#f4ce1c)",
    color: "#5a4a00",
    boxShadow: "inset 0 -3px 0 rgba(140,100,0,0.28), inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 2px rgba(0,0,0,0.35)",
  },
};

export function Keyboard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute w-[560px] rounded-[18px] p-[9px]", className)}
      style={{ background: "linear-gradient(160deg,#e3dfd7,#c4bfb5 60%,#d4d0c7)", boxShadow: `${grounded}, inset 0 1px 0 rgba(255,255,255,0.7)` }}
    >
      {/* the dark plate between the keys */}
      <div className="flex flex-col gap-[4px] rounded-[11px] bg-[#34312d] p-[5px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
        {KEY_ROWS.map((row, r) => (
          <div key={r} className="flex gap-[4px]">
            {row.map((key, i) => {
              const style = KEY_STYLE[key.kind ?? "key"];
              return (
                <span
                  key={i}
                  className={cn("flex rounded-[5px] px-[4px] pt-[3px] font-medium leading-none", r === 0 ? "h-[20px] text-[6px]" : "h-[31px] text-[8px]", key.w > 1.4 ? "items-end pb-[4px]" : "items-start")}
                  style={{ flex: key.w, ...style }}
                >
                  {key.label}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A flat white: cup on its saucer, a spoon, and a little latte art. */
export function Coffee({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute h-[180px] w-[180px]", className)}>
      {/* saucer */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_38%_32%,#ffffff_0%,#f3f1ec_55%,#e4e0d8_100%)]" style={{ boxShadow: grounded }} />
      <div className="absolute inset-[18px] rounded-full shadow-[inset_0_2px_5px_rgba(0,0,0,0.10)]" />
      {/* spoon resting on the saucer: an oval bowl and a tapering handle */}
      <div className="absolute bottom-[22px] left-[2px] h-[16px] w-[104px] rotate-[-34deg] drop-shadow-[2px_5px_3px_rgba(0,0,0,0.25)]">
        <span className="absolute left-0 top-0 h-[16px] w-[28px] rounded-[50%] bg-[radial-gradient(circle_at_40%_35%,#ffffff,#c9ccd2_60%,#9aa0a8)]" />
        <span className="absolute left-[24px] top-[5px] h-[6px] w-[80px] rounded-full bg-[linear-gradient(180deg,#f6f6f7,#a3a8b0)] [clip-path:polygon(0_30%,100%_0,100%_100%,0_70%)]" />
      </div>
      {/* handle: a white loop on the right of the cup */}
      <div className="absolute left-[132px] top-[72px] h-[34px] w-[40px] rounded-r-[20px] border-[8px] border-l-0 border-[#ffffff] drop-shadow-[2px_4px_3px_rgba(0,0,0,0.22)]" />
      {/* cup */}
      <div className="absolute left-[30px] top-[30px] h-[120px] w-[120px] rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffffff,#eeebe4)] shadow-[0_14px_18px_-6px_rgba(0,0,0,0.32),inset_0_-2px_3px_rgba(0,0,0,0.06)]" />
      {/* coffee: crema darker at the rim, a soft heart poured in the middle */}
      <div className="absolute left-[41px] top-[41px] h-[98px] w-[98px] overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_48%,#d6a26c_0%,#b37a45_38%,#7f4a20_72%,#5a3214_100%)] shadow-[inset_0_5px_10px_rgba(0,0,0,0.45)]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" style={{ filter: "blur(0.7px)" }}>
          <path d="M50 82 C 47 76, 26 63, 24 46 C 22 32, 34 25, 43 30 C 47 32, 49 36, 50 40 C 51 36, 53 32, 57 30 C 66 25, 78 32, 76 46 C 74 63, 53 76, 50 82 Z" fill="#f4e4cc" />
          <path d="M50 72 C 41 64, 33 56, 33 47 C 33 39, 41 36, 46 40 C 48 42, 49 44, 50 47 C 51 44, 52 42, 54 40 C 59 36, 67 39, 67 47 C 67 56, 59 64, 50 72 Z" fill="#dcb88e" opacity="0.6" />
          <path d="M50 64 C 45 59, 41 54, 41 49 C 41 45, 45 43, 48 46 C 49 47, 50 49, 50 50 C 50 49, 51 47, 52 46 C 55 43, 59 45, 59 49 C 59 54, 55 59, 50 64 Z" fill="#f4e4cc" opacity="0.9" />
          <path d="M50 30 L 50 86" stroke="#e6cfae" strokeWidth="1.4" opacity="0.7" />
        </svg>
        <div className="absolute left-[14px] top-[10px] h-[20px] w-[34px] rotate-[-20deg] rounded-full bg-[rgba(255,255,255,0.20)] blur-[5px]" />
      </div>
    </div>
  );
}

export function StickyNote({ lines, className }: { lines: string[]; className?: string }) {
  const fold = 30;
  return (
    <div aria-hidden className={cn("pointer-events-none absolute w-[196px]", className)} style={{ filter: "drop-shadow(0 16px 14px rgba(30,24,16,0.28)) drop-shadow(0 2px 2px rgba(30,24,16,0.12))" }}>
      {/* the note, its bottom-right corner folded back (so that corner shows the desk) */}
      <div
        className="relative px-5 pb-7 pt-6 text-[22px] leading-[1.18] text-[#3b3423]"
        style={{
          background: "linear-gradient(172deg,#fff6b8 0%,#ffe882 55%,#f8d964 100%)",
          fontFamily: "var(--font-hand), 'Comic Sans MS', cursive",
          clipPath: `polygon(0 0, 100% 0, 100% calc(100% - ${fold}px), calc(100% - ${fold}px) 100%, 0 100%)`,
        }}
      >
        <div className="absolute inset-x-0 top-0 h-[16px] bg-[linear-gradient(180deg,rgba(214,176,40,0.22),rgba(214,176,40,0))]" />
        {lines.map((l) => (
          <p key={l} className="relative">
            {l}
          </p>
        ))}
      </div>
      {/* the folded flap, lying on top of the note */}
      <div
        className="absolute bottom-0 right-0"
        style={{ width: fold, height: fold, background: "linear-gradient(135deg,#fff3ad 0%,#f3d35a 50%,transparent 50%)", filter: "drop-shadow(-2px -2px 2px rgba(0,0,0,0.12))" }}
      />
    </div>
  );
}

/** A chisel-tip highlighter with its cap off - what STACK does to your day. */
export function Highlighter({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute h-[44px] w-[300px]", className)}>
      <div className="absolute left-0 top-[7px] flex h-[30px] w-[232px] items-stretch drop-shadow-[5px_10px_8px_rgba(30,24,16,0.28)]">
        {/* end plug */}
        <span className="w-[14px] rounded-l-[9px] bg-[linear-gradient(180deg,#3a3835,#121110)]" />
        {/* barrel */}
        <span className="relative flex-1 overflow-hidden bg-[linear-gradient(180deg,#fff7a8_0%,#ffe14d_32%,#f5cc1f_72%,#d9b012_100%)]">
          <span className="absolute inset-x-0 top-[5px] h-[3px] bg-[rgba(255,255,255,0.55)]" />
          <span className="absolute left-[46px] top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold tracking-[0.3em] text-[#121110]/80">STACK</span>
          <span className="absolute right-[10px] top-1/2 h-[14px] w-[3px] -translate-y-1/2 rounded-full bg-[#121110]/25" />
        </span>
        {/* collar */}
        <span className="w-[12px] bg-[linear-gradient(180deg,#fafafa,#bdbab4_60%,#e8e6e1)]" />
        {/* tapered nose, then the felt chisel tip */}
        <span className="w-[22px] bg-[linear-gradient(180deg,#fff7a8_0%,#ffe14d_32%,#f5cc1f_72%,#d9b012_100%)] [clip-path:polygon(0_0,100%_22%,100%_78%,0_100%)]" />
        <span className="-ml-[1px] w-[16px] bg-[linear-gradient(160deg,#f7d63a,#d8aa08)] [clip-path:polygon(0_22%,100%_44%,100%_70%,0_78%)]" />
      </div>
      {/* the cap, lying next to it */}
      <div className="absolute right-0 top-[2px] h-[34px] w-[54px] rotate-[14deg] rounded-[8px_14px_14px_8px] bg-[linear-gradient(180deg,#fff2a0_0%,#ffe14d_35%,#e8bf17_100%)] shadow-[4px_9px_8px_-3px_rgba(30,24,16,0.3)]">
        <span className="absolute left-[8px] right-[10px] top-[4px] h-[3px] rounded-full bg-[rgba(255,255,255,0.6)]" />
        <span className="absolute left-[6px] top-[-3px] h-[8px] w-[34px] rounded-[3px] bg-[linear-gradient(180deg,#f8f8f8,#b9b6b0)] shadow-[0_1px_2px_rgba(0,0,0,0.25)]" />
      </div>
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
