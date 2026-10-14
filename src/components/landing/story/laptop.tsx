/*
 * The open laptop on STACK's desk, with STACK's Home page on screen. Drawn in CSS (no images), decoration only:
 * hidden from screen readers and never clickable. The dashboard is a miniature of the real Home page, in the
 * signed-in app's own light theme, with the same example data as the rest of the landing page.
 */
import { IntegrationLogo } from "@/components/brand-icons";
import { cn } from "@/lib/utils";

const grounded = "0 34px 44px -22px rgba(30,24,16,0.42), 0 10px 14px -8px rgba(30,24,16,0.28)";

const NAV = [
  ["Home", true],
  ["Inbox", false],
  ["My Work", false],
  ["Projects", false],
  ["Calendar", false],
  ["Files", false],
  ["STACK AI", false],
] as const;

const PRIORITIES = [
  ["Send Sarah the Q4 proposal", "Asked twice · due tomorrow", "gmail"],
  ["Fix the failing build on main", "Blocks today's release", "github"],
  ["Prep for the 2:00 launch sync", "You're presenting", "google-calendar"],
] as const;

/** STACK's Home page in miniature. */
function MiniDashboard() {
  return (
    <div className="flex h-full w-full bg-[#f8f8f6] text-[#18171a]">
      <aside className="flex w-[104px] shrink-0 flex-col border-r border-[#e8e6df] bg-[#f3f2ee] px-2 py-2.5">
        <div className="flex items-center gap-1.5 px-1">
          <svg viewBox="0 0 24 24" className="h-[13px] w-[13px]" fill="none" stroke="#18171a" strokeWidth="2.2" strokeLinejoin="round">
            <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
            <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
            <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
          </svg>
          <span className="text-[9px] font-semibold">STACK</span>
        </div>
        <ul className="mt-3 space-y-[3px]">
          {NAV.map(([label, active]) => (
            <li
              key={label}
              className={cn("flex items-center gap-1.5 rounded-[5px] px-1.5 py-[3px] text-[7.5px] font-medium", active ? "bg-[#edecfb] text-[#4f4cc9]" : "text-[#5f5c56]")}
            >
              <span className={cn("h-[6px] w-[6px] rounded-[2px]", active ? "bg-[#6b69e2]" : "bg-[#c9c6bd]")} />
              {label}
              {label === "Inbox" && <span className="ml-auto rounded-full bg-[#6b69e2] px-1 text-[6px] font-semibold text-[#ffffff]">4</span>}
            </li>
          ))}
        </ul>
        <p className="mt-auto px-1 text-[6px] font-semibold uppercase tracking-wider text-[#8a877f]">Connected</p>
        <div className="mt-1 flex gap-1 px-1">
          {["gmail", "slack", "github", "notion"].map((app) => (
            <span key={app} className="flex h-[13px] w-[13px] items-center justify-center overflow-hidden rounded-[3px] bg-[#ffffff] [&_svg]:h-[9px] [&_svg]:w-[9px]">
              <IntegrationLogo app={app} size="sm" />
            </span>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col px-3.5 py-2.5">
        <div className="flex items-center justify-between">
          <span className="w-[150px] rounded-full border border-[#e8e6df] bg-[#ffffff] px-2 py-[3px] text-[6.5px] text-[#8a877f]">Search or ask STACK...</span>
          <span className="h-[14px] w-[14px] rounded-full bg-[linear-gradient(135deg,#f7b267,#e8a400)]" />
        </div>
        <div className="mt-2.5 flex items-end justify-between">
          <div>
            <p className="text-[13px] font-semibold tracking-tight">Good morning, Alex.</p>
            <p className="text-[7px] text-[#6f6c66]">Here&apos;s what matters right now.</p>
          </div>
          <span className="rounded-full bg-[#e9f7ee] px-1.5 py-[2px] text-[6px] font-medium text-[#15803d]">Up to date</span>
        </div>
        <div className="mt-2 flex gap-1">
          {["3 priorities", "2 meetings", "1 project at risk", "4 waiting on you"].map((c) => (
            <span key={c} className="rounded-full border border-[#e4e1d8] bg-[#ffffff] px-1.5 py-[2px] text-[6.5px] font-medium text-[#45423c]">
              {c}
            </span>
          ))}
        </div>
        <div className="mt-2.5 grid flex-1 grid-cols-[1.4fr_1fr] items-start gap-2">
          <section className="rounded-[7px] border border-[#ebe9e3] bg-[#ffffff] p-2">
            <p className="text-[6px] font-semibold uppercase tracking-wider text-[#6b69e2]">Priorities</p>
            <ol className="mt-1.5 space-y-1.5">
              {PRIORITIES.map(([title, why, app], i) => (
                <li key={title} className="flex items-start gap-1.5">
                  <span className="flex h-[11px] w-[11px] shrink-0 items-center justify-center rounded-full bg-[#18171a] text-[6px] font-semibold text-[#ffffff]">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[7.5px] font-semibold">{title}</span>
                    <span className="block text-[6.5px] text-[#6b69e2]">{why}</span>
                  </span>
                  <span className="[&_svg]:h-[9px] [&_svg]:w-[9px]">
                    <IntegrationLogo app={app} size="sm" />
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <div className="flex flex-col gap-2">
            <section className="rounded-[7px] border border-[#ebe9e3] bg-[#ffffff] p-2">
              <p className="text-[6px] font-semibold uppercase tracking-wider text-[#8a877f]">Today</p>
              {[
                ["10:00", "Design review"],
                ["2:00", "Launch sync"],
              ].map(([t, what]) => (
                <p key={what} className="mt-1 flex gap-1.5 text-[7px]">
                  <span className="font-mono text-[#8a877f]">{t}</span>
                  <span className="font-medium">{what}</span>
                </p>
              ))}
            </section>
            <section className="rounded-[7px] border border-[#ebe9e3] bg-[#ffffff] p-2">
              <p className="text-[6px] font-semibold uppercase tracking-wider text-[#d93a2b]">At risk</p>
              <p className="mt-1 text-[7px] font-medium">Mobile redesign</p>
              <p className="text-[6px] text-[#6f6c66]">No updates in 6 days</p>
            </section>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 rounded-[8px] border border-[#e4e1d8] bg-[#ffffff] px-2 py-1.5">
          <span className="h-[8px] w-[8px] rounded-full bg-[#6b69e2]" />
          <span className="flex-1 text-[7px] text-[#8a877f]">Ask STACK: what should I do first?</span>
          <span className="rounded-[4px] bg-[#18171a] px-1.5 py-[2px] text-[6px] font-medium text-[#ffffff]">Ask</span>
        </div>
      </div>
    </div>
  );
}

/** An open laptop seen from above: the screen tilted back, showing STACK, over a black-keyed keyboard deck. */
export function Laptop({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute w-[620px]", className)}>
      {/* screen, hinged at the bottom and tilted back */}
      <div
        className="relative mx-auto h-[368px] w-[580px] rounded-t-[20px] bg-[linear-gradient(180deg,#26272b,#141417)] p-[11px] pb-[18px]"
        style={{ transform: "perspective(1500px) rotateX(22deg)", transformOrigin: "50% 100%", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)" }}
      >
        <span className="absolute left-1/2 top-[4px] h-[4px] w-[4px] -translate-x-1/2 rounded-full bg-[#3a3d44]" />
        <div className="relative h-full w-full overflow-hidden rounded-[6px]">
          <MiniDashboard />
          <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,0.20)_0%,rgba(255,255,255,0.04)_30%,rgba(255,255,255,0)_31%)]" />
        </div>
      </div>
      {/* hinge */}
      <div className="mx-auto h-[9px] w-[592px] rounded-b-[6px] bg-[linear-gradient(180deg,#8c8f95,#c3c6cb)]" />
      {/* keyboard deck */}
      <div
        className="mx-auto mt-[-2px] h-[330px] w-[620px] rounded-[20px] px-[34px] pt-[22px]"
        style={{ background: "linear-gradient(170deg,#e4e6e9,#c4c7cc 55%,#d3d5d9)", boxShadow: `${grounded}, inset 0 1px 0 rgba(255,255,255,0.8)` }}
      >
        <div className="flex flex-col gap-[5px] rounded-[8px] bg-[#a9acb2] p-[6px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]">
          {[14, 14, 13, 12, 8].map((count, r) => (
            <div key={r} className="flex gap-[5px]">
              {Array.from({ length: count }, (_, i) => (
                <span
                  key={i}
                  className="h-[22px] rounded-[4px] bg-[linear-gradient(180deg,#2c2d31,#1b1c1f)] shadow-[0_1px_1px_rgba(0,0,0,0.4)]"
                  style={{ flex: r === 4 && i === 3 ? 6 : r > 0 && (i === 0 || i === count - 1) ? 1.6 : 1 }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mx-auto mt-[22px] h-[130px] w-[230px] rounded-[12px] bg-[linear-gradient(180deg,#d6d8dc,#c8cbd0)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.15)]" />
      </div>
    </div>
  );
}
