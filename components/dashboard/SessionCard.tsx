"use client";

import { useState, useEffect, useCallback } from "react";
import { IconFocus, IconPlay, IconPause }    from "@/components/ui/Icon";
import type { TaskRow }                      from "@/app/api/tasks/route";

// ── Timer constants ──────────────────────────────────────────────────────────
const TOTAL_S   = 50 * 60;
const INITIAL_S = 32 * 60 + 14;
const RING_R    = 72;
const RING_C    = 2 * Math.PI * RING_R;

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtMin(min: number | null): string {
  if (!min || min <= 0) return "—";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function urgencyDot(urgency: string | null, isKey: boolean): string {
  if (isKey)            return "🔑";
  if (urgency === "high" || urgency === "urgent") return "🔥";
  return "·";
}

// Combine urgency=high + key=true rows, rank by priority_score, take top 3
function filterAndRank(tasks: TaskRow[]): TaskRow[] {
  return tasks
    .filter((t) => t.urgency === "high" || t.urgency === "urgent" || t.key === true)
    .sort((a, b) => {
      // key tasks always float above non-key
      if (a.key && !b.key) return -1;
      if (!a.key && b.key) return 1;
      return (b.priority_score ?? 0) - (a.priority_score ?? 0);
    })
    .slice(0, 3);
}

// ── TaskList sub-component ───────────────────────────────────────────────────
function TaskList() {
  const [tasks,   setTasks]   = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/tasks?status=open&limit=50");
      const json = (await res.json()) as { tasks?: TaskRow[]; error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to load"); return; }
      setTasks(filterAndRank(json.tasks ?? []));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="sess-tasks-shell">
        {[0, 1, 2].map((i) => (
          <div key={i} className="sess-task-skeleton" style={{ opacity: 1 - i * 0.25 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="sess-tasks-shell sess-tasks-error">
        <span>⚠ {error}</span>
        <button className="sess-retry" onClick={() => void load()}>Retry</button>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="sess-tasks-shell sess-tasks-empty">
        <span>✓ No urgent tasks — clear runway ahead</span>
      </div>
    );
  }

  return (
    <div className="sess-tasks-shell">
      {tasks.map((task, idx) => (
        <a
          key={task.id}
          href={`/crm${task.entity_id ? `?entity=${task.entity_id}` : `?task=${task.id}`}`}
          className="sess-task-row"
          aria-label={`${task.title} — open in CRM`}
        >
          <span className="sess-task-rank">{idx + 1}</span>
          <span className="sess-task-dot" aria-hidden>{urgencyDot(task.urgency, task.key)}</span>
          <span className="sess-task-title">{task.title}</span>
          <span className="sess-task-time">{fmtMin(task.time_estimate_min)}</span>
          <span className="sess-task-arrow" aria-hidden>›</span>
        </a>
      ))}
    </div>
  );
}

// ── SessionCard ──────────────────────────────────────────────────────────────
export function SessionCard() {
  const [running,     setRunning]     = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(INITIAL_S);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const mm  = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss  = String(secondsLeft % 60).padStart(2, "0");
  const pct = 1 - secondsLeft / TOTAL_S;

  return (
    <div className="card card-dark">
      <svg
        className="card-deco"
        style={{ right: -50, top: -50, width: 220, height: 220 }}
        viewBox="0 0 100 100"
        aria-hidden
      >
        <circle cx="50" cy="50" r="50" fill="rgba(250,245,236,0.025)" />
      </svg>

      {/* ── Timer section ── */}
      <div className="session-layout">
        <div className="session-left">
          <div className="session-tag">
            <IconFocus size={12} />
            Active Session · Deep Work
          </div>

          <h3 className="session-focus">
            Q3 strategy memo<br />
            <span>— second draft</span>
          </h3>

          <div className="session-meta-row">
            <span><b>17</b> min elapsed</span>
            <span>·</span>
            <span><b>2</b> distractions blocked</span>
          </div>

          <div className="session-actions">
            <button
              className="session-btn session-btn-primary"
              onClick={() => setRunning((r) => !r)}
              aria-label={running ? "Pause session" : "Resume session"}
            >
              {running ? <IconPause size={11} /> : <IconPlay size={11} />}
              {running ? "Pause" : "Resume"}
            </button>
            <button className="session-btn session-btn-ghost">End early</button>
            <button className="session-btn session-btn-ghost">Notes</button>
          </div>
        </div>

        <div className="session-ring-wrap" aria-label={`${mm}:${ss} remaining`}>
          <svg width="168" height="168" viewBox="0 0 168 168" aria-hidden>
            <circle cx="84" cy="84" r={RING_R} fill="none" stroke="rgba(250,245,236,0.10)" strokeWidth="6" />
            <circle
              cx="84" cy="84" r={RING_R}
              fill="none"
              stroke="#F0E2A6"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - pct)}
              transform="rotate(-90 84 84)"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="session-ring-inner">
            <div>
              <div className="session-ring-time">{mm}:{ss}</div>
              <div className="session-ring-lbl">remaining</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Today's priority tasks ── */}
      <div className="sess-tasks-header">
        <span className="sess-tasks-eyebrow">
          🔥 Today &amp; Key tasks
        </span>
        <a href="/crm" className="sess-tasks-crm-link">Open CRM ›</a>
      </div>

      <TaskList />
    </div>
  );
}
