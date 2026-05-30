import { KpiRow }             from "./KpiRow";
import { ExecutiveBrief }     from "./ExecutiveBrief";
import { TodayFocusSection }  from "./TodayFocusSection";
import { SalaryForecastCard } from "./SalaryForecastCard";
import { WorkSnapshot }       from "./WorkSnapshot";
import { HealthSnapshotCard } from "./HealthSnapshotCard";
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

        {/* Check-In (only when not done today) */}
        <CheckInGate />

      </div>
    </>
  );
}
