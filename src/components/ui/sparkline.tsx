import { cn } from "@/lib/utils";

export function Sparkline({
  data,
  width = 56,
  height = 20,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const inset = 2;
  const innerHeight = height - inset * 2;

  const points = data
    .map((v, i) => `${i * step},${inset + innerHeight - ((v - min) / range) * innerHeight}`)
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("shrink-0 overflow-visible", className)}>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
