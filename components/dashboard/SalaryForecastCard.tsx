"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { WorkSummary } from "@/lib/work/types";

function fmt(n: number) {
  return "€" + new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 }).format(n);
}

function daysUntilPayday(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.max(0, lastDay.getDate() - now.getDate());
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
  const now     = new Date();
  const elapsed = now.getDate();
  const total   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projGross = elapsed > 0 && gross > 0 ? Math.round((gross / elapsed) * total) : gross;
  const projNet   = elapsed > 0 && net > 0   ? Math.round((net / elapsed) * total)   : net;

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
