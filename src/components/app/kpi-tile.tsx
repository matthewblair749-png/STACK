import { Card, SectionLabel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/ui/sparkline";
import { cn } from "@/lib/utils";

type TrendAccent = "blue" | "yellow" | "red" | "green" | "neutral";

export function KpiTile({
  label,
  value,
  trend,
  trendAccent = "neutral",
  sparkline,
  sparklineClassName,
}: {
  label: string;
  value: string | number;
  trend?: string;
  trendAccent?: TrendAccent;
  sparkline?: number[];
  sparklineClassName?: string;
}) {
  return (
    <Card className="rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <SectionLabel>{label}</SectionLabel>
        {sparkline && sparkline.length > 1 && (
          <Sparkline data={sparkline} className={cn("text-neutral-300", sparklineClassName)} />
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-2xl font-semibold tabular-nums text-ink">{value}</span>
        {trend && <Badge accent={trendAccent}>{trend}</Badge>}
      </div>
    </Card>
  );
}
