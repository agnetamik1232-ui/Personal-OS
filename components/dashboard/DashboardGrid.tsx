import { KpiRow }              from "./KpiRow";
import { TodayFocusCard }      from "./TodayFocusCard";
import { AttentionCard }       from "./AttentionCard";
import { CheckInCard }         from "@/components/checkin/CheckInCard";
import { SalaryForecastCard }  from "./SalaryForecastCard";
import { HealthSnapshotCard }  from "./HealthSnapshotCard";
import { HabitsCard }          from "./HabitsCard";
import { GoalsCard }           from "./GoalsCard";
import { CalendarCard }        from "./CalendarCard";

export function DashboardGrid() {
  return (
    <>
      <div className="dash-v2">

        {/* ── Row 0: Executive KPIs ── */}
        <div className="dash-full">
          <KpiRow />
        </div>

        {/* ── Command Zone: Focus · Attention · CheckIn ── */}
        <div className="dash-command-zone">
          <TodayFocusCard />
          <AttentionCard />
          <CheckInCard />
        </div>

        {/* ── Row 4: Salary Forecast + Health Snapshot ── */}
        <div className="dash-two-col">
          <SalaryForecastCard />
          <HealthSnapshotCard />
        </div>

        {/* ── Row 5: Habits + Goals ── */}
        <div className="dash-two-col">
          <HabitsCard />
          <GoalsCard />
        </div>

        {/* ── Row 6: Calendar ── */}
        <div className="dash-full">
          <CalendarCard />
        </div>

      </div>
    </>
  );
}
