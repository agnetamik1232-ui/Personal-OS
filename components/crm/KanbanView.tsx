"use client";

import { useState, useRef }          from "react";
import type { TaskRow }               from "@/app/api/tasks/route";
import { TaskCard }                   from "./TaskCard";
import { TIERS, urgencyToTier }       from "./tiers";
import type { TierId }                from "./tiers";

interface Props {
  tasks:     TaskRow[];
  onOpen:    (task: TaskRow) => void;
  onNewTask: (tierId: TierId) => void;
  onUpdate:  (updated: TaskRow) => void;
  onReorder: (tasks: TaskRow[]) => void;
}

/**
 * Compute a priority_score that places a task between two neighbours.
 * Tasks are sorted DESC, so "above" has a HIGHER score than "below".
 */
function midScore(above: TaskRow | undefined, below: TaskRow | undefined): number {
  const a = above?.priority_score ?? null;
  const b = below?.priority_score ?? null;
  if (a === null && b === null) return 50;
  if (a === null) return (b ?? 50) + 10;   // dropped at top  → score above the top card
  if (b === null) return a - 10;            // dropped at bottom → score below the bottom card
  return (a + b) / 2;
}

export function KanbanView({ tasks, onOpen, onNewTask, onUpdate, onReorder }: Props) {
  const draggingId  = useRef<string | null>(null);
  const [dropState, setDropState] = useState<{ col: TierId; idx: number } | null>(null);

  // Group tasks by tier, sorted by priority_score DESC NULLS LAST
  const grouped = Object.fromEntries(
    TIERS.map((tier) => [
      tier.id,
      tasks
        .filter((t) => !t.completed_at && urgencyToTier(t.urgency) === tier.id)
        .sort((a, b) => (b.priority_score ?? -Infinity) - (a.priority_score ?? -Infinity)),
    ])
  ) as Record<TierId, TaskRow[]>;

  function handleDragStart(e: React.DragEvent, taskId: string) {
    draggingId.current = taskId;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);   // required for Firefox
  }

  function handleDragOver(e: React.DragEvent, col: TierId, idx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropState((prev) =>
      prev?.col === col && prev?.idx === idx ? prev : { col, idx }
    );
  }

  function handleDrop(e: React.DragEvent, col: TierId, dropIdx: number) {
    e.preventDefault();
    const id = draggingId.current;
    draggingId.current = null;
    setDropState(null);
    if (!id) return;

    const colTasks = grouped[col];
    const task     = tasks.find((t) => t.id === id);
    if (!task) return;

    // Remove task from its current position in the column (if same column)
    const withoutSelf = colTasks.filter((t) => t.id !== id);

    // Compute new score
    const newScore = midScore(withoutSelf[dropIdx - 1], withoutSelf[dropIdx]);

    // Optimistically update
    const updated: TaskRow = { ...task, urgency: col, priority_score: newScore };
    const newAll = tasks.map((t) => t.id === id ? updated : t);
    onReorder(newAll);

    // Persist
    void fetch(`/api/tasks/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ urgency: col, priority_score: newScore }),
    }).then(async (res) => {
      const json = await res.json() as { task?: TaskRow };
      if (json.task) onUpdate(json.task);
    }).catch(console.error);
  }

  function handleDragEnd() {
    draggingId.current = null;
    setDropState(null);
  }

  return (
    <div className="crm-kanban">
      {TIERS.map((tier) => {
        const col = grouped[tier.id];
        return (
          <div key={tier.id} className="crm-col">
            {/* Column header */}
            <div className="crm-col-header">
              <div className="crm-col-title">
                <span style={{ color: tier.color }}>{tier.dot}</span>
                {tier.label}
                <span className="crm-col-count">{col.length}</span>
              </div>
              <button
                className="crm-col-add"
                onClick={() => onNewTask(tier.id)}
                aria-label={`Add task to ${tier.label}`}
              >+</button>
            </div>

            {/* Cards — drop zones are siblings of draggable wrappers, not children */}
            <div className="crm-col-cards">
              {/* Drop zone at top (index 0) */}
              <div
                className={`crm-drop-zone${dropState?.col === tier.id && dropState.idx === 0 ? " crm-drop-zone-active" : ""}`}
                onDragOver={(e) => handleDragOver(e, tier.id, 0)}
                onDrop={(e) => handleDrop(e, tier.id, 0)}
              />
              {col.length === 0 && (
                <div
                  className="crm-col-empty"
                  onDragOver={(e) => handleDragOver(e, tier.id, 0)}
                  onDrop={(e) => handleDrop(e, tier.id, 0)}
                >
                  Drop here
                </div>
              )}
              {col.map((task, idx) => (
                <div key={task.id} className="crm-card-slot">
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <TaskCard task={task} onOpen={onOpen} />
                  </div>
                  {/* Drop zone AFTER each card — sibling, not child of draggable */}
                  <div
                    className={`crm-drop-zone${dropState?.col === tier.id && dropState.idx === idx + 1 ? " crm-drop-zone-active" : ""}`}
                    onDragOver={(e) => handleDragOver(e, tier.id, idx + 1)}
                    onDrop={(e) => handleDrop(e, tier.id, idx + 1)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
