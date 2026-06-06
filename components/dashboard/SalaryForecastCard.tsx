"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { WorkSummary } from "@/lib/work/types";

function fmt(n: number) {
  return "€" + new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 }).format(n);
}

// Pay period = full calendar month (e.g. May 1–31)
// Payday     = 10th of the FOLLOWING month (e.g. June 10)
function daysUntilPayday(): number {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Payday = 10th of current month if not yet passed, else 10th of next month
  let payday  = new Date(now.getFullYear(), now.getMonth(), 10);
  if (today >= payday) payday = new Date(now.getFullYear(), now.getMonth() + 1, 10);
  return Math.max(0, Math.round((payday.getTime() - today.getTime()) / 86400000));
}

function currentMonthLabel(): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date());
}

export function SalaryForecastCard() {
  const [summary, setSummary] = useState<WorkSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    void fetch(`/api/work/summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
      .then(r => r.json() as Promise<{ summary?: WorkSummary }>)
      .then(d => { if (d.summary) setSummary(d.summary); })
      .catch(() => {/**/})
      .finally(() => setLoading(false));
  }, []);

  const now         = new Date();
  const totalDays   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); // days in month
  const elapsedDays = now.getDate();
  const days        = daysUntilPayday();
  const hoursWorked = summary?.total_hours ?? 0;
  const net         = summary?.net_salary ?? 0;
  // Project to end of full calendar month
  const projNet     = elapsedDays > 0 && net > 0 ? Math.round((net / elapsedDays) * totalDays) : net;

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
            <div className="sf-stat-val sf-stat-green">{fmt(net)}</div>
            <div className="sf-stat-label">Net so far</div>
          </div>
          <div className="sf-stat">
            <div className="sf-stat-val sf-stat-green">{fmt(projNet)}</div>
            <div className="sf-stat-label">Projected net</div>
          </div>
          <div className="sf-stat">
            <div className="sf-stat-val">{elapsedDays}/{totalDays}</div>
            <div className="sf-stat-label">Days elapsed</div>
          </div>
        </div>
      )}
    </Link>
  );
}
