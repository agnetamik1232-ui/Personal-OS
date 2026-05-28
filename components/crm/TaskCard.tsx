"use client";

import type { TaskRow }        from "@/app/api/tasks/route";
import { urgencyToTier, TIERS } from "./tiers";
import { localDateKey, dayDiff } from "@/lib/utils/localDate";

interface Props {
  task:        TaskRow;
  isDragging?: boolean;
  onOpen:      (task: TaskRow) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

const TZ = "Europe/Vilnius";

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const todayKey = localDateKey();
  const diff     = dayDiff(todayKey, iso);
  if (diff < 0) {
    const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
    const label = new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric", timeZone: TZ })
      .format(new Date(Date.UTC(y, m - 1, d)));
    return `⚠ ${label}`;
  }
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric", timeZone: TZ })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

export function TaskCard({ task, isDragging, onOpen, dragHandleProps }: Props) {
  const tier   = TIERS.find((t) => t.id === urgencyToTier(task.urgency));
  const isOver = task.due_date ? dayDiff(localDateKey(), task.due_date) < 0 : false;

  return (
    <div
      className={`crm-card${isDragging ? " crm-card-dragging" : ""}`}
      onClick={() => onOpen(task)}
      role="button"
      tabIndex={0}
      aria-label={`Open task: ${task.title}`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(task); }}}
    >
      {/* Drag handle */}
      <div className="crm-card-drag" {...dragHandleProps} aria-hidden onClick={(e) => e.stopPropagation()}>
        ⠿
      </div>

      <div className="crm-card-body">
        {/* Title row */}
        <div className="crm-card-title-row">
          {task.key && <span className="crm-card-key" title="Key task">🔑</span>}
          <span className="crm-card-title">{task.title}</span>
        </div>

        {/* Meta row */}
        <div className="crm-card-meta">
          {tier && (
            <span className="crm-card-tier" style={{ color: tier.color }}>
              {tier.dot}
            </span>
          )}
          {task.entity_name && (
            <span className="crm-card-entity">{task.entity_name}</span>
          )}
          {task.owner && (
            <span className="crm-card-owner">@{task.owner}</span>
          )}
          {task.due_date && (
            <span className={`crm-card-due${isOver ? " crm-card-due-over" : ""}`}>
              {fmtDate(task.due_date)}
            </span>
          )}
          {task.time_estimate_min != null && (
            <span className="crm-card-time">
              {task.time_estimate_min < 60
                ? `${task.time_estimate_min}m`
                : `${Math.floor(task.time_estimate_min / 60)}h`}
            </span>
          )}
        </div>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="crm-card-tags">
            {task.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="crm-tag">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Priority indicator bar */}
      {task.priority_score != null && (
        <div
          className="crm-card-pbar"
          style={{ width: `${Math.min(100, task.priority_score)}%` }}
          title={`Priority: ${task.priority_score}`}
        />
      )}
    </div>
  );
}
