"use client";

import type { TaskRow }         from "@/app/api/tasks/route";
import { TaskCard }             from "./TaskCard";
import { urgencyToTier, TIERS } from "./tiers";

interface Props {
  tasks:  TaskRow[];
  onOpen: (task: TaskRow) => void;
}

interface Group {
  key:        string;
  label:      string;
  tasks:      TaskRow[];
  topUrgency: number;   // lowest tier index = highest urgency
}

export function CategoryView({ tasks, onOpen }: Props) {
  const open = tasks.filter((t) => !t.completed_at);

  // Build groups by entity_id (null → "No entity")
  const groupMap = new Map<string, Group>();

  for (const task of open) {
    const key   = task.entity_id ?? "__none__";
    const label = task.entity_name ?? (task.entity_id ? task.entity_id.slice(0, 8) + "…" : "No entity");

    if (!groupMap.has(key)) {
      groupMap.set(key, { key, label, tasks: [], topUrgency: 99 });
    }
    const grp = groupMap.get(key)!;
    grp.tasks.push(task);

    // Track the highest urgency tier present in this group
    const tierIdx = TIERS.findIndex((t) => t.id === urgencyToTier(task.urgency));
    if (tierIdx < grp.topUrgency) grp.topUrgency = tierIdx;
  }

  // Sort groups: no-entity last, others by highest urgency then alpha
  const groups = [...groupMap.values()].sort((a, b) => {
    if (a.key === "__none__") return 1;
    if (b.key === "__none__") return -1;
    if (a.topUrgency !== b.topUrgency) return a.topUrgency - b.topUrgency;
    return a.label.localeCompare(b.label);
  });

  // Within each group, sort by tier then priority_score
  for (const grp of groups) {
    grp.tasks.sort((a, b) => {
      const ta = TIERS.findIndex((t) => t.id === urgencyToTier(a.urgency));
      const tb = TIERS.findIndex((t) => t.id === urgencyToTier(b.urgency));
      if (ta !== tb) return ta - tb;
      return (b.priority_score ?? -Infinity) - (a.priority_score ?? -Infinity);
    });
  }

  if (groups.length === 0) {
    return (
      <div className="crm-empty">
        <p>No open tasks yet.</p>
      </div>
    );
  }

  return (
    <div className="crm-category">
      {groups.map((grp) => {
        const topTier = grp.topUrgency < TIERS.length ? TIERS[grp.topUrgency] : null;
        return (
          <section key={grp.key} className="crm-cat-group">
            <div className="crm-cat-header">
              <div className="crm-cat-label">
                {grp.key !== "__none__"
                  ? <span className="crm-cat-entity-icon">🏢</span>
                  : <span className="crm-cat-entity-icon">·</span>}
                {grp.label}
              </div>
              <div className="crm-cat-meta">
                {topTier && (
                  <span className="crm-cat-tier" style={{ color: topTier.color }}>
                    {topTier.dot} {topTier.label}
                  </span>
                )}
                <span className="crm-cat-count">{grp.tasks.length} task{grp.tasks.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <div className="crm-cat-grid">
              {grp.tasks.map((task) => (
                <TaskCard key={task.id} task={task} onOpen={onOpen} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
