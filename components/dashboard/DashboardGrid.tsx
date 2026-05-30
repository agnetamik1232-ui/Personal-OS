import { KpiRow }              from "./KpiRow";
import { TodayFocusCard }      from "./TodayFocusCard";
import { MomentumCard }        from "./MomentumCard";
import { AttentionCard }       from "./AttentionCard";
import { BiggestWinCard }      from "./BiggestWinCard";
import { CheckInCard }         from "@/components/checkin/CheckInCard";
import { SalaryForecastCard }  from "./SalaryForecastCard";
import { HealthSnapshotCard }  from "./HealthSnapshotCard";
import { HabitsCard }          from "./HabitsCard";
import { GoalsCard }           from "./GoalsCard";
import { FinanceCard }         from "./FinanceCard";
import { CalendarCard }        from "./CalendarCard";

export function DashboardGrid() {
  return (
    <>
      <div className="dash-v2">

        {/* ── Row 0: Executive KPIs ── */}
        <div className="dash-full">
          <KpiRow />
        </div>

        {/* ── Command Zone: Focus · Attention+Win · Momentum+CheckIn ── */}
        <div className="dash-command-zone">
          <TodayFocusCard />
          <div className="dash-command-mid">
            <AttentionCard />
            <BiggestWinCard />
          </div>
          <div className="dash-command-right">
            <MomentumCard />
            <CheckInCard />
          </div>
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

        {/* ── Row 6: Finance + Calendar ── */}
        <div className="dash-two-col">
          <FinanceCard />
          <CalendarCard />
        </div>

      </div>
    </>
  );
}
