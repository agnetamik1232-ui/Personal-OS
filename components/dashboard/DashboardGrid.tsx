import { OperatorCard }    from "./OperatorCard";
import { FinanceCard }     from "./FinanceCard";
import { BlockersCard }    from "./BlockersCard";
import { SessionCard }     from "./SessionCard";
import { HabitsCard }      from "./HabitsCard";
import { PrioritiesCard }  from "./PrioritiesCard";
import { NutritionCard }   from "./NutritionCard";
import { CalendarCard }    from "./CalendarCard";

export function DashboardGrid() {
  return (
    <div className="dash-grid">
      {/* ── Col 1: Operator / Finance / Blockers ── */}
      <div className="dash-col">
        <OperatorCard />
        <FinanceCard />
        <BlockersCard />
      </div>

      {/* ── Col 2: Session / Habits / Priorities ── */}
      <div className="dash-col">
        <SessionCard />
        <HabitsCard />
        <PrioritiesCard />
      </div>

      {/* ── Col 3: Calendar / Nutrition ── */}
      <div className="dash-col">
        <CalendarCard />
        <NutritionCard />
      </div>
    </div>
  );
}
