import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function KpiCard({ label, value, delta, trend = "neutral", className }: KpiCardProps) {
  const trendConfig = {
    up:      { icon: TrendingUp,   cls: "metric-delta-up" },
    down:    { icon: TrendingDown, cls: "metric-delta-down" },
    neutral: { icon: Minus,        cls: "text-xs font-medium tabular-nums text-ink-3" },
  } as const;

  const { icon: TrendIcon, cls } = trendConfig[trend];

  return (
    <div className={cn("panel p-5 space-y-3 hover:shadow-md transition-shadow duration-200", className)}>
      <p className="metric-label">{label}</p>

      <div className="metric-value">{value}</div>

      {delta && (
        <div className={cn("flex items-center gap-1", cls)}>
          <TrendIcon size={12} />
          <span>{delta}</span>
        </div>
      )}
    </div>
  );
}
