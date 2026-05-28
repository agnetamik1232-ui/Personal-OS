import { KpiCard } from "@/components/dashboard/KpiCard";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page header */}
      <div>
        <p className="metric-label mb-1">Wednesday, 28 May 2026</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink-4 text-balance">
          Good morning, Agneta
        </h1>
        <p className="text-sm text-ink-3 mt-1">
          Here&apos;s what&apos;s happening across your systems today.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Tasks today"   value="12"   delta="+3"  trend="up"   />
        <KpiCard label="Habits done"   value="5/8"  delta="63%" trend="neutral" />
        <KpiCard label="Net worth Δ"   value="€240" delta="+1.2%" trend="up" />
        <KpiCard label="Focus hours"   value="3.4h" delta="-0.6h" trend="down" />
      </div>

      {/* Main grid */}
      <DashboardGrid />
    </div>
  );
}
