"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { WorkSummary } from "@/lib/work/types";

function fmt(n: number) {
  return "€" + new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 }).format(n);
}

function daysUntilPayday(): number {
  const now   = new Date();
  const day   = now.getDate();
  // Payday = 10th of each month
  const payday = day <= 10
    ? new Date(now.getFullYear(), now.getMonth(), 10)
    : new Date(now.getFullYear(), now.getMonth() + 1, 10);
  const diff = payday.getTime() - new Date(now.getFullYear(), now.getMonth(), day).getTime();
  return Math.max(0, Math.round(diff / 86400000));
}

function currentMonthLabel(): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date());
}

export function SalaryForecastCard() {
  const [summary, setSummary] = useState<WorkSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth() + 1;
    void fetch(`/api/work/summary?year=${year}&month=${month}`)
      .then(r => r.json() as Promise<{ summary?: WorkSummary }>)
      .then(d => { if (d.summary) setSummary(d.summary); })
      .catch(() => {/* silent */})
      .finally(() => setLoading(false));
  }, []);

  const days = daysUntilPayday();
  const hoursWorked = summary?.total_hours ?? 0;
  const gross       = summary?.gross_salary ?? 0;
  const net         = summary?.net_salary ?? 0;

  // Rough projection based on days elapsed
  // Pay period: 11th of prev month → 10th of this month (30-day window)
  const now        = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth() - (now.getDate() <= 10 ? 1 : 0), 11);
  const periodEnd   = new Date(now.getFullYear(), now.getMonth() + (now.getDate() <= 10 ? 0 : 1), 10);
  const periodDays  = Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000) + 1;
  const elapsedDays = Math.round((now.getTime() - periodStart.getTime()) / 86400000) + 1;
  const projGross = elapsedDays > 0 && gross > 0 ? Math.round((gross / elapsedDays) * periodDays) : gross;
  const projNet   = elapsedDays > 0 && net > 0   ? Math.round((net   / elapsedDays) * periodDays) : net;

  return (
    <Link href="/work" className="card sf-card card-link-wrap">
      <div className="sf-header">
        <div>
          <div className="card-eyebrow">💼 Salary Forecast</div>
          <div className="sf-month">{currentMonthLabel()}</div>
        </div>
        <div className="sf-payday">
          <div className="sf-payday-num">{days}</div>
          <div className="sf-payday-label">days to pay</div>
        </div>
      </div>

      {loading && <div className="kpi-skeleton" style={{ height: 70, marginTop: 12 }} />}

      {!loading && (
        <div className="sf-grid">
          <div className="sf-stat">
            <div className="sf-stat-val">{hoursWorked.toFixed(1)}h</div>
            <div className="sf-stat-label">Hours worked</div>
          </div>
          <div className="sf-stat">
            <div className="sf-stat-val">{fmt(gross)}</div>
            <div className="sf-stat-label">Gross so far</div>
          </div>
          <div className="sf-stat">
            <div className="sf-stat-val sf-stat-green">{fmt(net)}</div>
            <div className="sf-stat-label">Net so far</div>
          </div>
          <div className="sf-stat">
            <div className="sf-stat-val sf-stat-green">{fmt(projNet)}</div>
            <div className="sf-stat-label">Projected net</div>
          </div>
        </div>
      )}

      {!loading && projGross > gross && (
        <div className="sf-projection">
          Projected gross: <strong>{fmt(projGross)}</strong> by month end
        </div>
      )}
    </Link>
  );
}
