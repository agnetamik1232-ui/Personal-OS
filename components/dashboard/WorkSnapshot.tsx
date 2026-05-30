"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { WorkSummary } from "@/lib/work/types";

export function WorkSnapshot() {
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

  const stats = [
    { label: "Hours",      value: summary ? `${summary.total_hours.toFixed(1)}h` : "—" },
    { label: "Shifts",     value: summary ? String(summary.days_worked) : "—" },
    { label: "Night h",    value: summary ? `${summary.night_hours.toFixed(1)}h` : "—" },
    { label: "Day-off h",  value: summary ? `${(summary.day_off_hours ?? 0).toFixed(1)}h` : "—" },
  ];

  return (
    <Link href="/work" className="card ws-card card-link-wrap">
      <div className="ws-header">
        <div className="card-eyebrow">💼 Work</div>
        <span className="ws-month">
          {new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date())}
        </span>
      </div>

      {loading && <div className="kpi2-skeleton" style={{ height: 60, marginTop: 10 }} />}

      {!loading && (
        <div className="ws-grid">
          {stats.map(s => (
            <div key={s.label} className="ws-stat">
              <div className="ws-stat-val">{s.value}</div>
              <div className="ws-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="ws-footer">Open work dashboard →</div>
    </Link>
  );
}
