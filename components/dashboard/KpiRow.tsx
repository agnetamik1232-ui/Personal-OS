"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { FinSummary } from "@/lib/finance/types";
import type { CheckinStats } from "@/lib/checkin/types";
import type { WorkSummary } from "@/lib/work/types";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmt(n: number) {
  return "€" + new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 }).format(Math.abs(n));
}

function daysUntilPayday(): number {
  const now    = new Date();
  const payday = new Date(now.getFullYear(), now.getMonth() + 1, 10);
  return Math.max(0, Math.round((payday.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000));
}

function scoreColor(s: number) {
  if (s >= 70) return "#16a34a";
  if (s >= 50) return "#d97706";
  return "#dc2626";
}

export function KpiRow() {
  const [fin,     setFin]     = useState<FinSummary | null>(null);
  const [work,    setWork]    = useState<WorkSummary | null>(null);
  const [health,  setHealth]  = useState<CheckinStats | null>(null);
  const [tasks,   setTasks]   = useState<{ dueToday: number; urgent: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now      = new Date();
    const today    = todayKey();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    void Promise.all([
      fetch("/api/finance/summary").then(r => r.json() as Promise<{ summary?: FinSummary }>).catch(() => ({})),
      fetch(`/api/work/summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`).then(r => r.json() as Promise<{ summary?: WorkSummary }>).catch(() => ({})),
      fetch("/api/checkin/stats").then(r => r.json() as Promise<{ stats?: CheckinStats }>).catch(() => ({})),
      fetch("/api/tasks?status=open&limit=200").then(r => r.json() as Promise<{ tasks?: { due_date?: string | null; key?: boolean }[] }>).catch(() => ({})),
    ]).then(([f, w, h, t]) => {
      const finData    = (f as { summary?: FinSummary }).summary;
      const workData   = (w as { summary?: WorkSummary }).summary;
      const healthData = (h as { stats?: CheckinStats }).stats;
      const rawTasks   = (t as { tasks?: { due_date?: string | null; key?: boolean }[] }).tasks ?? [];

      if (finData)    setFin(finData);
      if (workData)   setWork(workData);
      if (healthData) setHealth(healthData);

      setTasks({
        dueToday: rawTasks.filter(x => x.due_date === today).length,
        urgent:   rawTasks.filter(x => x.key || (x.due_date && new Date(x.due_date) < todayDate)).length,
      });
    }).finally(() => setLoading(false));
  }, []);

  const healthScore = health
    ? Math.round(((health.avgMood ?? 5) + (health.avgEnergy ?? 5) + (health.avgSleepQual ?? 5)) / 3 * 10)
    : null;

  const now         = new Date();
  const totalDays   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsedDays = now.getDate();
  const projNet     = work && work.net_salary > 0 ? Math.round((work.net_salary / elapsedDays) * totalDays) : null;

  const savings = fin?.monthly_savings ?? 0;
  const days    = daysUntilPayday();

  return (
    <div className="kpi2-row">

      <Link href="/finance" className="kpi2-card kpi2-link">
        <div className="kpi2-eyebrow">Net Worth</div>
        {loading ? <div className="kpi2-skeleton" /> : <>
          <div className="kpi2-value">{fin ? fmt(fin.net_worth) : "—"}</div>
          <div className={`kpi2-trend ${savings >= 0 ? "kpi2-up" : "kpi2-down"}`}>
            {savings >= 0 ? "▲" : "▼"} {fmt(Math.abs(savings))} this month
          </div>
        </>}
      </Link>

      <Link href="/work" className="kpi2-card kpi2-link">
        <div className="kpi2-eyebrow">Salary Forecast</div>
        {loading ? <div className="kpi2-skeleton" /> : <>
          <div className="kpi2-value kpi2-green">{projNet ? fmt(projNet) : work ? fmt(work.net_salary) : "—"}</div>
          <div className="kpi2-trend kpi2-neutral">
            {days === 0 ? "Payday today 🎉" : `${days} days to payday`}
          </div>
        </>}
      </Link>

      <Link href="/tasks" className="kpi2-card kpi2-link">
        <div className="kpi2-eyebrow">Today&apos;s Focus</div>
        {loading ? <div className="kpi2-skeleton" /> : <>
          <div className={`kpi2-value ${(tasks?.dueToday ?? 0) > 0 ? "" : "kpi2-green"}`}>
            {tasks?.dueToday ?? 0}
          </div>
          <div className="kpi2-trend kpi2-neutral">
            {(tasks?.dueToday ?? 0) === 0 ? "All clear ✓" : `tasks due · ${tasks?.urgent ?? 0} urgent`}
          </div>
        </>}
      </Link>

      <div className="kpi2-card">
        <div className="kpi2-eyebrow">Health Score</div>
        {loading ? <div className="kpi2-skeleton" /> : <>
          <div className="kpi2-value" style={healthScore ? { color: scoreColor(healthScore) } : undefined}>
            {healthScore ?? "—"}
          </div>
          <div className="kpi2-trend kpi2-neutral">
            {health?.currentStreak ? `🔥 ${health.currentStreak}-day streak` : "Complete check-ins"}
          </div>
        </>}
      </div>

    </div>
  );
}
