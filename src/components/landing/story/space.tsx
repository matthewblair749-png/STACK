"use client";

import { useEffect, useRef } from "react";
import { IntegrationLogo } from "@/components/brand-icons";
import { cn } from "@/lib/utils";

/**
 * A quiet, twinkling night sky behind the whole page, with a slow parallax as you scroll and the odd shooting
 * star. Drawn on one canvas; it stops when the tab is hidden (requestAnimationFrame pauses) and draws a single
 * still frame for people who ask for less motion.
 */
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tints = ["255,255,255", "255,255,255", "255,255,255", "190,180,255", "170,200,255", "255,222,180"];
    let stars: { x: number; y: number; r: number; depth: number; phase: number; speed: number; tint: string }[] = [];
    let w = 0;
    let h = 0;
    let frame = 0;
    let shooting: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
    let nextShot = performance.now() + 4000;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((w * h) / 4200);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() < 0.92 ? Math.random() * 0.9 + 0.25 : Math.random() * 0.8 + 1.1,
        depth: Math.random() * 0.12 + 0.02,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 1.2 + 0.4,
        tint: tints[Math.floor(Math.random() * tints.length)],
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const scroll = window.scrollY;
      for (const s of stars) {
        const y = (((s.y - scroll * s.depth) % h) + h) % h;
        const twinkle = still ? 0.8 : 0.55 + 0.45 * Math.sin(t / 1000 * s.speed + s.phase);
        ctx.beginPath();
        ctx.fillStyle = `rgba(${s.tint},${(0.25 + 0.6 * twinkle).toFixed(3)})`;
        ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (still) return;
      if (!shooting && t > nextShot) {
        shooting = { x: Math.random() * w * 0.7 + w * 0.15, y: Math.random() * h * 0.35, vx: -7, vy: 3.2, life: 1 };
        nextShot = t + 7000 + Math.random() * 9000;
      }
      if (shooting) {
        const { x, y, vx, vy, life } = shooting;
        const grad = ctx.createLinearGradient(x, y, x - vx * 14, y - vy * 14);
        grad.addColorStop(0, `rgba(255,255,255,${0.85 * life})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - vx * 14, y - vy * 14);
        ctx.stroke();
        shooting.x += vx;
        shooting.y += vy;
        shooting.life -= 0.018;
        if (shooting.life <= 0) shooting = null;
      }
      frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    if (still) {
      draw(0);
      const redraw = () => draw(0);
      window.addEventListener("scroll", redraw, { passive: true });
      return () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("scroll", redraw);
      };
    }
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}

/** A soft coloured glow - nebula light behind a section. */
export function Nebula({ className, color = "124,108,255", opacity = 0.22 }: { className?: string; color?: string; opacity?: number }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute rounded-full", className)}
      style={{ background: `radial-gradient(closest-side, rgba(${color},${opacity}), transparent)` }}
    />
  );
}

const RINGS: { radius: number; duration: number; reverse?: boolean; apps: string[]; className?: string }[] = [
  { radius: 330, duration: 80, apps: ["gmail", "slack", "google-calendar", "notion"] },
  { radius: 470, duration: 130, reverse: true, apps: ["github", "linear", "asana", "figma", "google-drive"] },
  { radius: 610, duration: 190, apps: ["hubspot", "jira", "zendesk", "trello", "stripe", "dropbox"], className: "hidden sm:block" },
];

/** Your apps, in orbit around the headline: everything you use, held together. */
export function Orbits({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute left-1/2 top-1/2 h-[1400px] w-[1400px] -translate-x-1/2 -translate-y-1/2", className)}
      // Keep the middle clear so the orbits never sit behind the headline's words.
      style={{ maskImage: "radial-gradient(ellipse 360px 220px at center, transparent 55%, black 100%)", WebkitMaskImage: "radial-gradient(ellipse 360px 220px at center, transparent 55%, black 100%)" }}
    >
      <div className="absolute left-1/2 top-1/2 h-0 w-0">
      {RINGS.map((ring) => (
        <div key={ring.radius} className={ring.className}>
          <div
            className="absolute rounded-full border border-dashed border-[rgba(255,255,255,0.08)]"
            style={{ width: ring.radius * 2, height: ring.radius * 2, left: -ring.radius, top: -ring.radius }}
          />
          <div
            className="orbit-ring absolute will-change-transform"
            style={{
              width: ring.radius * 2,
              height: ring.radius * 2,
              left: -ring.radius,
              top: -ring.radius,
              ["--orbit-duration" as string]: `${ring.duration}s`,
              ["--orbit-direction" as string]: ring.reverse ? "reverse" : "normal",
            }}
          >
            {ring.apps.map((app, i) => {
              const angle = (360 / ring.apps.length) * i + ring.radius / 7;
              return (
                <div key={app} className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" style={{ transform: `translate(-50%, -50%) rotate(${-angle}deg)` }}>
                    <div
                      className="orbit-upright flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(30,27,48,0.9)] shadow-[0_0_24px_rgba(165,150,255,0.25)]"
                      style={{ ["--orbit-duration" as string]: `${ring.duration}s`, ["--orbit-direction" as string]: ring.reverse ? "reverse" : "normal" }}
                    >
                      <IntegrationLogo app={app} size="md" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}

/** The curve of a planet with dawn breaking over its rim. */
export function Horizon() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[420px] overflow-hidden">
      <div className="absolute left-1/2 top-[200px] h-[2400px] w-[2400px] -translate-x-1/2 rounded-full bg-[#06050d] shadow-[0_-1px_0_rgba(255,214,150,0.55),0_-30px_90px_rgba(165,150,255,0.35),0_-8px_30px_rgba(255,190,120,0.25)]" />
      <div className="absolute left-1/2 top-[130px] h-[180px] w-[620px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,206,140,0.55),rgba(255,160,110,0.12)_60%,transparent)] blur-xl" />
    </div>
  );
}
