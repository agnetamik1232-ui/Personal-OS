import { cn } from "@/lib/utils/cn";

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "lg" | "flush" | "glass";
  padding?: "none" | "sm" | "md" | "lg";
  as?: React.ElementType;
}

const variantClass: Record<NonNullable<PanelProps["variant"]>, string> = {
  default: "panel",
  lg:      "panel-lg",
  flush:   "panel-flush",
  glass:   "panel-glass",
};

const paddingClass: Record<NonNullable<PanelProps["padding"]>, string> = {
  none: "",
  sm:   "p-4",
  md:   "p-5",
  lg:   "p-6 lg:p-8",
};

export function Panel({
  children,
  className,
  variant = "default",
  padding = "md",
  as: Component = "div",
}: PanelProps) {
  return (
    <Component
      className={cn(variantClass[variant], paddingClass[padding], className)}
    >
      {children}
    </Component>
  );
}

/* ── Panel sub-components ──────────────────────────────────────────────── */
export function PanelHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-5", className)}>
      <div>
        <div className="accent-bar mb-2" />
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export function PanelBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("", className)}>{children}</div>;
}
