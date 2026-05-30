"use client";

import { useState, useEffect } from "react";
import type { FinSummary } from "@/lib/finance/types";
import type { CheckinStats } from "@/lib/checkin/types";
import type { WorkSummary } from "@/lib/work/types";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmtDate(): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long",
    timeZone: "Europe/Vilnius",
  }).format(new Date());
}

function fmt(n: number) {
  return "€" + new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 }).format(n);
}

function daysUntilPayday(): number {
  const now = new Date();
  const day = now.getDate();
  const payday = day <= 10
    ? new Date(now.getFullYear(), now.getMonth(), 10)
    : new Date(now.getFullYear(), now.getMonth() + 1, 10);
  return Math.max(0, Math.round((payday.getTime() - new Date(now.getFullYear(), now.getMonth(), day).getTime()) / 86400000));
}

interface BriefBase {
  dueToday: number;
  overdue:  number;
  projNet:  number | null;
  sleep:    number | null;
  mood:     number | null;
  alerts:   string[];
}

interface BriefData extends BriefBase {
  recommendation: string;
}

function buildRecommendation(d: BriefBase): string {
  const h = new Date().getHours();
  if (d.overdue > 0) return `You have ${d.overdue} overdue task${d.overdue > 1 ? "s" : ""} — clear these first.`;
  if (d.alerts.length > 0) return d.alerts[0]!;
  if (h < 12 && d.dueToday > 0) return `${d.dueToday} task${d.dueToday > 1 ? "s" : ""} due today — tackle the hardest one first.`;
  if (d.sleep !== null && d.sleep < 6.5) return "Low sleep detected. Protect your energy — avoid scheduling deep work after 15:00.";
  if (d.mood !== null && d.mood >= 8) return "Energy is high today. A great day to tackle your most challenging goal.";
  if (daysUntilPayday() <= 3) return "Payday approaching. Review your budget and confirm transfers.";
  return "No critical issues. Stay focused on your top priorities.";
}

export function ExecutiveBrief() {
  const [data,    setData]    = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now      = new Date();
    const today    = todayKey();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in7      = new Date(todayDate.getTime() + 7 * 86400000);

    void Promise.all([
      fetch("/api/tasks?status=open&limit=300").then(r => r.json() as Promise<{ tasks?: { due_date?: string | null; completed_at?: string | null }[] }>).catch(() => ({})),
      fetch(`/api/work/summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`).then(r => r.json() as Promise<{ summary?: WorkSummary }>).catch(() => ({})),
      fetch("/api/checkin/stats").then(r => r.json() as Promise<{ stats?: CheckinStats }>).catch(() => ({})),
      fetch(`/api/checkin?date=${today}`).then(r => r.json() as Promise<{ checkin?: { mood?: number | null; sleep_hours?: number | null } | null }>).catch(() => ({})),
      fetch("/api/finance/summary").then(r => r.json() as Promise<{ summary?: FinSummary }>).catch(() => ({})),
    ]).then(([tx, w, cs, ci, f]) => {
      const rawTasks = (tx as { tasks?: { due_date?: string | null }[] }).tasks ?? [];
      const dueToday = rawTasks.filter(t => t.due_date === today).length;
      const overdue  = rawTasks.filter(t => t.due_date && new Date(t.due_date) < todayDate).length;

      const workData   = (w as { summary?: WorkSummary }).summary;
      const ciStats    = (cs as { stats?: CheckinStats }).stats;
      const todayCi    = (ci as { checkin?: { mood?: number | null; sleep_hours?: number | null } | null }).checkin;
      const finData    = (f as { summary?: FinSummary }).summary;

      // Salary projection
      const periodStart = new Date(now.getFullYear(), now.getMonth() - (now.getDate() <= 10 ? 1 : 0), 11);
      const periodEnd   = new Date(now.getFullYear(), now.getMonth() + (now.getDate() <= 10 ? 0 : 1), 10);
      const periodDays  = Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000) + 1;
      const elapsedDays = Math.max(1, Math.round((now.getTime() - periodStart.getTime()) / 86400000) + 1);
      const projNet     = workData && workData.net_salary > 0 ? Math.round((workData.net_salary / elapsedDays) * periodDays) : null;

      // Alerts
      const alerts: string[] = [];
      if (overdue > 0) alerts.push(`${overdue} overdue task${overdue > 1 ? "s" : ""} need attention`);
      const bills = finData?.upcoming_bills ?? [];
      const dueBills = bills.filter(b => new Date(b.due_date) >= todayDate && new Date(b.due_date) <= in7);
      if (dueBills.length > 0) {
        const total = dueBills.reduce((s, b) => s + b.amount, 0);
        alerts.push(`${dueBills.length} bill${dueBills.length > 1 ? "s" : ""} due within 7 days — ${fmt(total)} total`);
      }

      const sleep = todayCi?.sleep_hours ?? ciStats?.avgSleep ?? null;
      const mood  = todayCi?.mood ?? null;

      const partial: BriefBase = { dueToday, overdue, projNet, sleep, mood, alerts };
      const brief: BriefData = { ...partial, recommendation: buildRecommendation(partial) };
      setData(brief);
    }).finally(() => setLoading(false));
  }, []);

  const days = daysUntilPayday();

  return (
    <div className="eb-card card">
      <div className="eb-header">
        <div>
          <div className="eb-greeting">{greeting()}, Agneta.</div>
          <div className="eb-date">{fmtDate()}</div>
        </div>
        <div className="eb-status">
          {loading ? null : data && data.alerts.length === 0
            ? <span className="eb-all-clear">✓ No critical issues</span>
            : <span className="eb-has-alerts">⚠ {data?.alerts.length ?? 0} alert{(data?.alerts.length ?? 0) > 1 ? "s" : ""}</span>
          }
        </div>
      </div>

      {loading && (
        <div className="eb-loading">
          <div className="kpi2-skeleton" style={{ height: 14, width: "60%", marginBottom: 8 }} />
          <div className="kpi2-skeleton" style={{ height: 14, width: "40%", marginBottom: 8 }} />
          <div className="kpi2-skeleton" style={{ height: 14, width: "50%" }} />
        </div>
      )}

      {!loading && data && (
        <div className="eb-body">
          <div className="eb-overview">
            {data.dueToday > 0 && (
              <div className="eb-item">
                <span className="eb-dot eb-dot-orange" />
                <span>{data.dueToday} task{data.dueToday > 1 ? "s" : ""} due today</span>
              </div>
            )}
            {data.dueToday === 0 && (
              <div className="eb-item">
                <span className="eb-dot eb-dot-green" />
                <span>No tasks due today</span>
              </div>
            )}
            {data.projNet && (
              <div className="eb-item">
                <span className="eb-dot eb-dot-green" />
                <span>Salary forecast {fmt(data.projNet)} net · {days === 0 ? "payday today" : `${days} days`}</span>
              </div>
            )}
            {data.sleep !== null && (
              <div className="eb-item">
                <span className={`eb-dot ${data.sleep >= 7 ? "eb-dot-green" : data.sleep >= 6 ? "eb-dot-orange" : "eb-dot-red"}`} />
                <span>Sleep {data.sleep}h {data.sleep >= 7 ? "— well rested" : data.sleep >= 6 ? "— slightly low" : "— rest tonight"}</span>
              </div>
            )}
            {data.alerts.map((a, i) => (
              <div key={i} className="eb-item eb-item-alert">
                <span className="eb-dot eb-dot-red" />
                <span>{a}</span>
              </div>
            ))}
          </div>

          <div className="eb-recommendation">
            <div className="eb-rec-label">Recommendation</div>
            <div className="eb-rec-text">{data.recommendation}</div>
          </div>
        </div>
      )}
    </div>
  );
}
