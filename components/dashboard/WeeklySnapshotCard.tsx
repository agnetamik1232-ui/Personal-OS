"use client";

import { useState, useEffect } from "react";
import Link                    from "next/link";
import type { FinSummary }     from "@/lib/finance/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return "€" + new Intl.NumberFormat("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));
}

function weekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({ label, value, sub, positive }: { label: string; value: string; sub?: string | undefined; positive?: boolean | undefined }) {
  return (
    <div className="wkly-tile">
      <div className="wkly-tile-label">{label}</div>
      <div className={`wkly-tile-value ${positive === true ? "wkly-pos" : positive === false ? "wkly-neg" : ""}`}>
        {value}
      </div>
      {sub && <div className="wkly-tile-sub">{sub}</div>}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function WeeklySnapshotCard() {
  const [summary,        setSummary]        = useState<FinSummary | null>(null);
  const [tasksCompleted, setTasksCompleted] = useState<number>(0);
  const [habitsPct,      setHabitsPct]      = useState<number | null>(null);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    const wStart = weekStart();
    const today  = todayKey();

    void Promise.all([
      fetch("/api/finance/summary").then(r => r.json() as Promise<{ summary?: FinSummary }>),
      fetch(`/api/tasks?status=all&limit=500`).then(r => r.json() as Promise<{ tasks?: { completed_at?: string | null }[] }>),
      fetch(`/api/habits?days=7`).then(r => r.json() as Promise<{ logs?: Record<string, { done: string[]; total: number }> }>),
    ]).then(([fin, tx, hab]) => {
      if (fin.summary) setSummary(fin.summary);

      if (tx.tasks) {
        const done = tx.tasks.filter(t => {
          if (!t.completed_at) return false;
          const d = t.completed_at.slice(0, 10);
          return d >= wStart && d <= today;
        }).length;
        setTasksCompleted(done);
      }

      if (hab.logs) {
        const entries = Object.values(hab.logs);
        if (entries.length > 0) {
          const totalDone  = entries.reduce((s, e) => s + e.done.length, 0);
          const totalSlots = entries.reduce((s, e) => s + (e.total || 1), 0);
          setHabitsPct(totalSlots > 0 ? Math.round((totalDone / totalSlots) * 100) : 0);
        }
      }
    }).catch(() => {/* silent */})
    .finally(() => setLoading(false));
  }, []);

  const savings  = summary?.monthly_savings ?? 0;
  const income   = summary?.monthly_income ?? 0;
  const expenses = summary?.monthly_expenses ?? 0;

  return (
    <div className="card wkly-card">
      <div className="card-head">
        <div>
          <div className="card-eyebrow">📊 Weekly Snapshot</div>
          <h3 className="card-title">This week at a glance</h3>
        </div>
        <Link href="/analytics" className="card-action">Full review →</Link>
      </div>

      {loading
        ? <div className="wkly-grid">{[0,1,2,3].map(i => <div key={i} className="wkly-skeleton" />)}</div>
        : <div className="wkly-grid">
            <StatTile
              label="Tasks Done"
              value={String(tasksCompleted)}
              sub="this week"
              positive={tasksCompleted > 0}
            />
            {habitsPct !== null && (
              <StatTile
                label="Habit Score"
                value={`${habitsPct}%`}
                sub="completion"
                positive={habitsPct >= 70}
              />
            )}
            {habitsPct === null && (
              <StatTile label="Habit Score" value="—" sub="completion" />
            )}
            <StatTile
              label="Month Income"
              value={income > 0 ? fmt(income) : "—"}
              sub="vs expenses"
              positive={income > expenses ? true : income < expenses ? false : undefined}
            />
            <StatTile
              label="Month Saved"
              value={savings !== 0 ? fmt(savings) : "—"}
              sub={savings >= 0 ? "saved" : "overspent"}
              positive={savings >= 0}
            />
          </div>
      }
    </div>
  );
}
