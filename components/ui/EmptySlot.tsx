import { cn } from "@/lib/utils/cn";

interface EmptySlotProps {
  label?: string;
  height?: string;
  className?: string;
}

export function EmptySlot({ label = "Coming soon", height = "h-32", className }: EmptySlotProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl border border-dashed border-ink-2/60",
        "text-xs text-ink-3/60 font-medium tracking-wide",
        height,
        className
      )}
    >
      {label}
    </div>
  );
}
