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

        {/* ── Row 1: Today's Focus + Momentum ── */}
        <div className="dash-focus-row">
          <TodayFocusCard />
          <MomentumCard />
        </div>

        {/* ── Row 2: Attention + Biggest Win ── */}
        <div className="dash-two-col">
          <AttentionCard />
          <BiggestWinCard />
        </div>

        {/* ── Row 3: Daily Check-In (full width) ── */}
        <div className="dash-full">
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

        {/* ── Row 6: Finance + Calendar ── */}
        <div className="dash-two-col">
          <FinanceCard />
          <CalendarCard />
        </div>

      </div>
    </>
  );
}
