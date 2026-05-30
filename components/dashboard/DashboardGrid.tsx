import { KpiRow }             from "./KpiRow";
import { ExecutiveBrief }     from "./ExecutiveBrief";
import { TodayFocusSection }  from "./TodayFocusSection";
import { SalaryForecastCard } from "./SalaryForecastCard";
import { WorkSnapshot }       from "./WorkSnapshot";
import { HealthSnapshotCard } from "./HealthSnapshotCard";
import { CalendarCard }       from "./CalendarCard";
import { HabitsCard }         from "./HabitsCard";
import { NutritionCard }      from "./NutritionCard";
import { CheckInGate }        from "./CheckInGate";
export function DashboardGrid() {
  return (
    <>
      <div className="dash-v3">

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

        {/* Snapshot row */}
        <div className="dash-three-col">
          <SalaryForecastCard />
          <WorkSnapshot />
          <HealthSnapshotCard />
        </div>

        {/* Calendar + Habits + Nutrition */}
        <div className="dash-three-col">
          <CalendarCard />
          <HabitsCard />
          <NutritionCard />
        </div>

        {/* Check-In (only when not done today) */}
        <CheckInGate />

      </div>
    </>
  );
}
