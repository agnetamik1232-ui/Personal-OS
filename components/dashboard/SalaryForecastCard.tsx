"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { WorkSummary, WorkShift } from "@/lib/work/types";
import { SHIFT_META } from "@/lib/work/types";

function fmt(n: number) {
  return "€" + new Intl.NumberFormat("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function daysUntilPayday(): number {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let payday  = new Date(now.getFullYear(), now.getMonth(), 10);
  if (today >= payday) payday = new Date(now.getFullYear(), now.getMonth() + 1, 10);
  return Math.max(0, Math.round((payday.getTime() - today.getTime()) / 86400000));
}

// Expected working days in month (Mon–Fri only)
function expectedWorkingDays(year: number, month: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

// Build mini calendar: array of {date, dayNum, dow, inMonth}
function buildMiniCal(year: number, month: number) {
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { date: string; dayNum: number; inMonth: boolean }[] = [];
  // Leading empty cells
  for (let i = 0; i < firstDow; i++) cells.push({ date: "", dayNum: 0, inMonth: false });
  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push({ date: `${year}-${mm}-${dd}`, dayNum: d, inMonth: true });
  }
  return cells;
}

export function SalaryForecastCard() {
  const [summary, setSummary] = useState<WorkSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Before the 10th → show last month (about to be paid)
  // On/after the 10th → show this month (accumulating)
  const now              = new Date();
  const beforePayday     = now.getDate() < 10;
  const displayYear      = beforePayday && now.getMonth() === 0
    ? now.getFullYear() - 1
    : now.getFullYear();
  const displayMonth     = beforePayday
    ? (now.getMonth() === 0 ? 12 : now.getMonth())   // prev month (1-based)
    : now.getMonth() + 1;                             // current month (1-based)

  useEffect(() => {
    void fetch(`/api/work/summary?year=${displayYear}&month=${displayMonth}`)
      .then(r => r.json() as Promise<{ summary?: WorkSummary }>)
      .then(d => { if (d.summary) setSummary(d.summary); })
      .catch(() => {/**/})
      .finally(() => setLoading(false));
  }, [displayYear, displayMonth]);

  const year          = displayYear;
  const month         = displayMonth - 1; // back to 0-based for Date
  const todayStr      = now.toISOString().split("T")[0]!;
  const days          = daysUntilPayday();
  const net           = summary?.net_salary   ?? 0;   // actual net from logged shifts
  const gross         = summary?.gross_salary ?? 0;   // actual gross from logged shifts
  const tax           = summary?.tax_amount   ?? 0;   // actual tax deducted
  const hoursWorked   = summary?.total_hours  ?? 0;
  const daysWorked    = summary?.days_worked  ?? 0;
  const expectedDays  = expectedWorkingDays(year, month);
  const progressPct   = Math.min(100, Math.round((daysWorked / expectedDays) * 100));

  // Build shift lookup map
  const shiftMap: Record<string, WorkShift> = {};
  for (const s of summary?.shifts ?? []) shiftMap[s.date] = s;

  const cells = buildMiniCal(year, month);

  return (
    <Link href="/work" className="card sf-card card-link-wrap">
      {/* Header */}
      <div className="sf-header">
        <div>
          <div className="card-eyebrow">💼 Salary Forecast</div>
          <div className="sf-month">
            {new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(year, month))}
            {beforePayday && <span className="sf-pay-context"> · due {now.getDate() < 10 ? `${10 - now.getDate()}d` : "today"}</span>}
          </div>
        </div>
        <div className="sf-payday">
          <div className="sf-payday-num">{days}</div>
          <div className="sf-payday-label">{days === 0 ? "Payday! 🎉" : "days to pay"}</div>
        </div>
      </div>

      {/* Key stats — all from logged shifts, no guessing */}
      <div className="sf-grid">
        <div className="sf-stat">
          <div className="sf-stat-val">{hoursWorked.toFixed(1)}h</div>
          <div className="sf-stat-label">Hours worked</div>
        </div>
        <div className="sf-stat">
          <div className="sf-stat-val">{fmt(gross)}</div>
          <div className="sf-stat-label">Gross earned</div>
        </div>
        <div className="sf-stat">
          <div className="sf-stat-val" style={{ color: "#ef4444" }}>−{fmt(tax)}</div>
          <div className="sf-stat-label">Tax (39%)</div>
        </div>
        <div className="sf-stat">
          <div className="sf-stat-val sf-stat-green">{fmt(net)}</div>
          <div className="sf-stat-label">Net pay</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="sf-progress-wrap">
        <div className="sf-progress-bar">
          <div className="sf-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="sf-progress-label">{progressPct}% of expected shifts logged</span>
      </div>

      {/* Mini calendar */}
      {!loading && (
        <div className="sf-mini-cal">
          <div className="sf-mini-weekdays">
            {["M","T","W","T","F","S","S"].map((d, i) => (
              <span key={i} className="sf-mini-wd">{d}</span>
            ))}
          </div>
          <div className="sf-mini-grid">
            {cells.map((cell, i) => {
              if (!cell.inMonth) return <div key={i} className="sf-mini-cell empty" />;
              const shift   = shiftMap[cell.date];
              const isToday = cell.date === todayStr;
              const color   = shift ? SHIFT_META[shift.shift_type]?.color : undefined;
              return (
                <div
                  key={i}
                  className={`sf-mini-cell${isToday ? " today" : ""}${shift ? " has-shift" : ""}`}
                  style={shift ? { background: color, borderColor: color } : undefined}
                  title={shift ? `${SHIFT_META[shift.shift_type]?.label} · ${shift.hours_worked}h` : cell.date}
                >
                  <span className="sf-mini-num" style={shift ? { color: "#fff" } : undefined}>
                    {cell.dayNum}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          {summary && summary.shifts.length > 0 && (
            <div className="sf-mini-legend">
              {[...new Set(summary.shifts.map(s => s.shift_type))].map(type => (
                <span key={type} className="sf-mini-legend-item">
                  <span className="sf-mini-legend-dot" style={{ background: SHIFT_META[type]?.color }} />
                  {SHIFT_META[type]?.label}
                </span>
              ))}
            </div>
          )}
          {!loading && (!summary || summary.shifts.length === 0) && (
            <p className="sf-no-shifts">No shifts logged yet. Go to Work → Calendar to add shifts.</p>
          )}
        </div>
      )}

      {loading && <div className="kpi-skeleton" style={{ height: 120, marginTop: 12 }} />}
    </Link>
  );
}
