import { KpiRow }             from "./KpiRow";
import { ExecutiveBrief }     from "./ExecutiveBrief";
import { TodayFocusSection }  from "./TodayFocusSection";
import { SalaryForecastCard } from "./SalaryForecastCard";
import { HealthSnapshotCard } from "./HealthSnapshotCard";
import { CalendarCard }       from "./CalendarCard";
import { HabitsCard }         from "./HabitsCard";
import { NutritionCard }      from "./NutritionCard";
import { CheckInGate }        from "./CheckInGate";
import { TodaySummaryBar }    from "./TodaySummaryBar";
export function DashboardGrid() {
  return (
    <>
      <div className="dash-v3">

        {/* Today summary bar */}
        <div className="dash-full">
          <TodaySummaryBar />
        </div>

        {/* KPI strip */}
        <div className="dash-full">
          <KpiRow />
        </div>

        {/* AI Executive Brief */}
        <div className="dash-full">
          <ExecutiveBrief />
        </div>

        {/* Today's Focus */}
        <div className="dash-full">
          <TodayFocusSection />
        </div>

        {/* Salary left, Health + Habits stacked right */}
        <div className="dash-two-col dash-two-col-asymmetric">
          <SalaryForecastCard />
          <div className="dash-stack">
            <HealthSnapshotCard />
            <HabitsCard />
          </div>
        </div>

        {/* Calendar + Nutrition */}
        <div className="dash-two-col">
          <CalendarCard />
          <NutritionCard />
        </div>

        {/* Check-In (only when not done today) */}
        <CheckInGate />

      </div>
    </>
  );
}
