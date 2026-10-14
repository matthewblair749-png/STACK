/*
 * Little clay shapes floating over the desk - pure decoration, hidden from screen readers. Each is lit from the
 * top-left like everything else (a bright spot, a darker bottom-right) and bobs slowly; people who ask for less
 * motion see them still (the global reduced-motion rule stops the animation).
 */
import { cn } from "@/lib/utils";

const drop = "drop-shadow(0 18px 16px rgba(74,58,34,0.22)) drop-shadow(0 4px 4px rgba(74,58,34,0.12))";

function Shape({ className, style, delay }: { className?: string; style: React.CSSProperties; delay: number }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute", className)} style={{ filter: drop }}>
      <div className="clay-float" style={{ ...style, animationDelay: `${delay}s` }} />
    </div>
  );
}

export function ClayShapes() {
  return (
    <>
      {/* yellow ball */}
      <Shape
        className="left-[calc(50%-82px)] top-[150px]"
        delay={0}
        style={{ width: 64, height: 64, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, #fff8c9 0%, #ffe45a 32%, #f0c214 70%, #c99a00 100%)" }}
      />
      {/* lilac capsule */}
      <Shape
        className="bottom-[400px] left-[51%]"
        delay={1.2}
        style={{
          width: 112,
          height: 46,
          borderRadius: 999,
          background: "radial-gradient(120% 140% at 30% 22%, #f4f0ff 0%, #c8bdff 38%, #9a88f2 78%, #7c69dc 100%)",
          ["--clay-rot" as string]: "-18deg",
        }}
      />
      {/* peach ring */}
      <Shape
        className="bottom-[370px] left-[16%]"
        delay={0.6}
        style={{
          width: 84,
          height: 84,
          borderRadius: "50%",
          background: "radial-gradient(circle at 34% 28%, #ffe3d3 0%, #ffad8d 42%, #ee7f5f 80%, #cf6447 100%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 0 27%, black 29%)",
          maskImage: "radial-gradient(circle, transparent 0 27%, black 29%)",
          ["--clay-rot" as string]: "12deg",
        }}
      />
      {/* small mint ball */}
      <Shape
        className="bottom-[96px] left-[55%]"
        delay={1.8}
        style={{ width: 34, height: 34, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, #eafff4 0%, #9fe8c3 40%, #5cc994 82%, #3fae78 100%)" }}
      />
    </>
  );
}
