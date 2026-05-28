import { OperatorCard }    from "./OperatorCard";
import { FinanceCard }     from "./FinanceCard";
import { BlockersCard }    from "./BlockersCard";
import { SessionCard }     from "./SessionCard";
import { HabitsCard }      from "./HabitsCard";
import { PrioritiesCard }  from "./PrioritiesCard";
import { NutritionCard }   from "./NutritionCard";

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

      {/* ── Col 3: Nutrition ── */}
      <div className="dash-col">
        <NutritionCard />
      </div>
    </div>
  );
}
