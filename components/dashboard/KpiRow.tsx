"use client";

import { useState, useEffect } from "react";
import Link                    from "next/link";
import type { FinSummary }     from "@/lib/finance/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return "€" + new Intl.NumberFormat("en-IE", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.abs(n));
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function scoreColor(s: number) {
  if (s >= 75) return "#16a34a";
  if (s >= 50) return "#d97706";
  return "#dc2626";
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TaskSummary {
  dueToday: number;
  overdue:  number;
  total:    number;
}

interface HabitSummary {
  done:  number;
  total: number;
}

// ── Ring SVG ──────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 52, stroke = 5 }: { score: number; size?: number; stroke?: number }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(score / 100, 1);
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

// ── KPI Cards ─────────────────────────────────────────────────────────────────

function NetWorthCard({ summary, loading }: { summary: FinSummary | null; loading: boolean }) {
  const nw      = summary?.net_worth ?? 0;
  const savings = summary?.monthly_savings ?? 0;
  const up      = savings >= 0;

  return (
    <Link href="/finance" className="kpi-card kpi-card-link">
      <div className="kpi-eyebrow">💰 Net Worth</div>
      {loading
        ? <div className="kpi-skeleton" />
        : <>
            <div className="kpi-value">{fmt(nw)}</div>
            <div className={`kpi-trend ${up ? "kpi-trend-up" : "kpi-trend-down"}`}>
              {up ? "▲" : "▼"} {fmt(Math.abs(savings))} this month
            </div>
          </>
      }
    </Link>
  );
}

function AvailableCard({ summary, loading }: { summary: FinSummary | null; loading: boolean }) {
  const avail        = summary?.available_to_spend ?? 0;
  const upcomingSum  = (summary?.upcoming_bills ?? []).slice(0, 30).reduce((s, b) => s + b.amount, 0);

  return (
    <Link href="/finance" className="kpi-card kpi-card-link">
      <div className="kpi-eyebrow">💳 Available to Spend</div>
      {loading
        ? <div className="kpi-skeleton" />
        : <>
            <div className="kpi-value kpi-value-green">{fmt(avail)}</div>
            {upcomingSum > 0 && (
              <div className="kpi-trend kpi-trend-neutral">
                {fmt(upcomingSum)} in upcoming bills
              </div>
            )}
            {upcomingSum === 0 && (
              <div className="kpi-trend kpi-trend-neutral">After bills &amp; savings</div>
            )}
          </>
      }
    </Link>
  );
}

function FocusCard({ tasks, loading }: { tasks: TaskSummary | null; loading: boolean }) {
  return (
    <Link href="/tasks" className="kpi-card kpi-card-link">
      <div className="kpi-eyebrow">🎯 Today&apos;s Focus</div>
      {loading
        ? <div className="kpi-skeleton" />
        : tasks && (tasks.dueToday > 0 || tasks.overdue > 0)
          ? <>
              <div className="kpi-value">{tasks.dueToday}</div>
              <div className="kpi-focus-pills">
                {tasks.dueToday > 0 && (
                  <span className="kpi-pill kpi-pill-neutral">{tasks.dueToday} due today</span>
                )}
                {tasks.overdue > 0 && (
                  <span className="kpi-pill kpi-pill-red">{tasks.overdue} overdue</span>
                )}
              </div>
            </>
          : <>
              <div className="kpi-value kpi-value-green">✓</div>
              <div className="kpi-trend kpi-trend-up">All clear</div>
            </>
      }
    </Link>
  );
}

function LifeScoreCard({
  finScore,
  habits,
  loading,
}: {
  finScore: number;
  habits:   HabitSummary | null;
  loading:  boolean;
}) {
  const habitScore = habits && habits.total > 0
    ? Math.round((habits.done / habits.total) * 100)
    : 50;

  const lifeScore = Math.round(finScore * 0.5 + habitScore * 0.5);

  return (
    <div className="kpi-card kpi-card-score">
      <div className="kpi-eyebrow">⭐ Life Score</div>
      {loading
        ? <div className="kpi-skeleton" />
        : <div className="kpi-score-wrap">
            <div className="kpi-score-ring">
              <ScoreRing score={lifeScore} size={56} stroke={5} />
              <div className="kpi-score-inner">{lifeScore}</div>
            </div>
            <div className="kpi-score-detail">
              <div className="kpi-score-row">
                <span>Finance</span>
                <strong style={{ color: scoreColor(finScore) }}>{finScore}</strong>
              </div>
              <div className="kpi-score-row">
                <span>Habits</span>
                <strong style={{ color: scoreColor(habitScore) }}>{habitScore}</strong>
              </div>
            </div>
          </div>
      }
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function KpiRow() {
  const [summary, setSummary] = useState<FinSummary | null>(null);
  const [tasks,   setTasks]   = useState<TaskSummary | null>(null);
  const [habits,  setHabits]  = useState<HabitSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      fetch("/api/finance/summary").then(r => r.json() as Promise<{ summary?: FinSummary }>),
      fetch("/api/tasks?status=open&limit=200").then(r => r.json() as Promise<{ tasks?: { due_date?: string | null; completed_at?: string | null }[] }>),
      fetch(`/api/habits/${todayKey()}`).then(r => r.json() as Promise<{ done?: string[]; total?: number }>),
    ]).then(([fin, tx, hab]) => {
      if (fin.summary) setSummary(fin.summary);

      const today = todayKey();
      const now   = new Date();
      if (tx.tasks) {
        const dueToday = tx.tasks.filter(t => t.due_date === today).length;
        const overdue  = tx.tasks.filter(t => {
          if (!t.due_date || t.completed_at) return false;
          return new Date(t.due_date) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }).length;
        setTasks({ dueToday, overdue, total: tx.tasks.length });
      }

      if (hab.done !== undefined) {
        setHabits({ done: hab.done.length, total: hab.total ?? 5 });
      }
    }).catch(() => {
      /* silent — cards show empty state */
    }).finally(() => setLoading(false));
  }, []);

  const finScore = summary?.health_score ?? 0;

  return (
    <div className="kpi-row">
      <NetWorthCard   summary={summary} loading={loading} />
      <AvailableCard  summary={summary} loading={loading} />
      <FocusCard      tasks={tasks}     loading={loading} />
      <LifeScoreCard  finScore={finScore} habits={habits} loading={loading} />
    </div>
  );
}
