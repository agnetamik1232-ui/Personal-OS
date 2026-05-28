import { FinanceCard }     from "./FinanceCard";
import { SessionCard }     from "./SessionCard";
import { HabitsCard }      from "./HabitsCard";
import { NutritionCard }   from "./NutritionCard";
import { CalendarCard }    from "./CalendarCard";
import { GoalsCard }       from "./GoalsCard";

export function DashboardGrid() {
  return (
    <div className="dash-grid">
      {/* ── Col 1: Finance / Habits ── */}
      <div className="dash-col">
        <FinanceCard />
        <HabitsCard />
      </div>

      {/* ── Col 2: Session / Goals ── */}
      <div className="dash-col">
        <SessionCard />
        <GoalsCard />
      </div>

      {/* ── Col 3: Calendar / Nutrition ── */}
      <div className="dash-col">
        <CalendarCard />
        <NutritionCard />
      </div>
    </div>
  );
}
