import { KpiRow }             from "./KpiRow";
import { FinanceCard }        from "./FinanceCard";
import { SessionCard }        from "./SessionCard";
import { HabitsCard }         from "./HabitsCard";
import { NutritionCard }      from "./NutritionCard";
import { CalendarCard }       from "./CalendarCard";
import { GoalsCard }          from "./GoalsCard";
import { InsightsCard }       from "./InsightsCard";
import { WeeklySnapshotCard } from "./WeeklySnapshotCard";
import { CheckInCard }        from "@/components/checkin/CheckInCard";

export function DashboardGrid() {
  return (
    <div className="dash-v2">

      {/* ── Row 0: Executive KPIs ── */}
      <div className="dash-full">
        <KpiRow />
      </div>

      {/* ── Row 1: Daily Check-In (full width hero) ── */}
      <div className="dash-full">
        <CheckInCard />
      </div>

      {/* ── Row 2: Deep Work + Calendar ── */}
      <div className="dash-two-col">
        <SessionCard />
        <CalendarCard />
      </div>

      {/* ── Row 3: Habits + Finance ── */}
      <div className="dash-two-col">
        <HabitsCard />
        <FinanceCard />
      </div>

      {/* ── Row 4: Goals + Insights ── */}
      <div className="dash-two-col">
        <GoalsCard />
        <InsightsCard />
      </div>

      {/* ── Row 5: Weekly Snapshot + Nutrition ── */}
      <div className="dash-two-col">
        <WeeklySnapshotCard />
        <NutritionCard />
      </div>

    </div>
  );
}
