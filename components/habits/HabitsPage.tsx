"use client";

import { useState, useEffect }         from "react";
import { HABITS as DEFAULT_HABITS }    from "@/lib/config/habits";
import type { HabitConfig }            from "@/lib/config/habits";
import type { HabitsResponse, HabitDayData } from "@/app/api/habits/route";
import { localDateKey }                from "@/lib/utils/localDate";

// ── Date helpers ──────────────────────────────────────────────────────────────

function lastNKeys(n: number): string[] {
  const today = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (n - 1 - i));
    return localDateKey(d);
  });
}

function fmtShort(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", timeZone: "Europe/Vilnius",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function dayLetter(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("en-GB", { weekday: "narrow", timeZone: "Europe/Vilnius" })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

// ── Streak computation ────────────────────────────────────────────────────────

function computeStreak(habitId: string, logs: Record<string, HabitDayData>): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key  = localDateKey(d);
    const done = logs[key]?.done ?? [];
    if (done.includes(habitId)) { streak++; }
    else if (i > 0) break;
  }
  return streak;
}

function computeLongestStreak(habitId: string, logs: Record<string, HabitDayData>): number {
  let longest = 0, current = 0;
  const keys = Object.keys(logs).sort();
  for (const key of keys) {
    if ((logs[key]?.done ?? []).includes(habitId)) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

// ── Heatmap cell ─────────────────────────────────────────────────────────────

function HeatCell({ done, isToday }: { done: boolean; isToday: boolean }) {
  return (
    <div
      className={`habits-heat-cell${done ? " habits-heat-cell-done" : ""}${isToday ? " habits-heat-cell-today" : ""}`}
    />
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function HabitsPage() {
  const todayKey = localDateKey();
  const [logs,    setLogs]    = useState<Record<string, HabitDayData>>({});
  const [habits,  setHabits]  = useState<HabitConfig[]>(DEFAULT_HABITS);
  const [loading, setLoading] = useState(true);
  const [range,   setRange]   = useState<28 | 60 | 90>(28);

  useEffect(() => {
    setLoading(true);
    void Promise.all([
      fetch("/api/habits?days=90").then((r) => r.json() as Promise<HabitsResponse>),
      fetch("/api/habits/config").then((r) => r.json() as Promise<{ habits?: HabitConfig[] }>),
    ]).then(([logsRes, cfgRes]) => {
      if (logsRes.logs) setLogs(logsRes.logs);
      if (cfgRes.habits?.length) setHabits(cfgRes.habits);
    }).finally(() => setLoading(false));
  }, []);

  const dayKeys = lastNKeys(range);
  const todayLog = logs[todayKey];
  const todayPct = habits.length > 0
    ? ((todayLog?.done.length ?? 0) / habits.length) * 100
    : 0;

  // ── Week stats ─────────────────────────────────────────────────────────────
  const last7 = lastNKeys(7);
  const weekPcts = last7.map((key) => {
    const log = logs[key];
    if (!log || habits.length === 0) return 0;
    return (log.done.length / habits.length) * 100;
  });
  const avgWeekPct = weekPcts.reduce((s, v) => s + v, 0) / weekPcts.length;

  return (
    <div className="habits-page">
      {/* Header */}
      <div className="habits-page-header">
        <div>
          <p className="habits-eyebrow">Wellbeing</p>
          <h1 className="habits-page-title">Habit Tracker</h1>
        </div>
        <div className="habits-page-range">
          {([28, 60, 90] as const).map((d) => (
            <button
              key={d}
              className={`habits-range-btn${range === d ? " habits-range-btn-active" : ""}`}
              onClick={() => setRange(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary row */}
      <div className="habits-summary-row">
        <div className="habits-summary-card">
          <div className="habits-summary-val">{Math.round(todayPct)}%</div>
          <div className="habits-summary-label">Today</div>
        </div>
        <div className="habits-summary-card">
          <div className="habits-summary-val">{Math.round(avgWeekPct)}%</div>
          <div className="habits-summary-label">7-day avg</div>
        </div>
        <div className="habits-summary-card">
          <div className="habits-summary-val">
            {habits.reduce((max, h) => Math.max(max, computeStreak(h.id, logs)), 0)}d
          </div>
          <div className="habits-summary-label">Best streak today</div>
        </div>
        <div className="habits-summary-card">
          <div className="habits-summary-val">{habits.length}</div>
          <div className="habits-summary-label">Total habits</div>
        </div>
      </div>

      {/* Streaks bar */}
      <div className="habits-streaks-section">
        <h2 className="habits-section-title">Current streaks</h2>
        <div className="habits-streaks-list">
          {habits.map((h) => {
            const streak  = computeStreak(h.id, logs);
            const longest = computeLongestStreak(h.id, logs);
            const pct     = longest > 0 ? (streak / longest) * 100 : 0;
            return (
              <div key={h.id} className="habits-streak-row">
                <span className="habits-streak-icon">{h.icon}</span>
                <span className="habits-streak-name">{h.name}</span>
                <div className="habits-streak-bar-wrap">
                  <div
                    className="habits-streak-bar-fill"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`habits-streak-val${streak > 0 ? " habits-streak-val-active" : ""}`}>
                  {streak > 0 ? `${streak}d` : "—"}
                </span>
                <span className="habits-streak-best">/{longest}d best</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Heatmap */}
      {loading ? (
        <div className="habits-loading">Loading…</div>
      ) : (
        <div className="habits-heatmap-section">
          <h2 className="habits-section-title">Heatmap · last {range} days</h2>
          <div className="habits-heatmap-table">
            {/* Column headers */}
            <div className="habits-heatmap-labels">
              <div className="habits-heatmap-name-spacer" />
              {dayKeys.filter((_, i) => i % 7 === 0).map((key) => (
                <div key={key} className="habits-heatmap-col-label">{fmtShort(key)}</div>
              ))}
            </div>
            {/* Rows per habit */}
            {habits.map((h) => (
              <div key={h.id} className="habits-heatmap-row">
                <div className="habits-heatmap-name">
                  <span>{h.icon}</span>
                  <span className="habits-heatmap-name-text">{h.name}</span>
                </div>
                <div className="habits-heatmap-cells">
                  {dayKeys.map((key) => (
                    <HeatCell
                      key={key}
                      done={(logs[key]?.done ?? []).includes(h.id)}
                      isToday={key === todayKey}
                    />
                  ))}
                </div>
              </div>
            ))}
            {/* Day letter footer */}
            <div className="habits-heatmap-footer">
              <div className="habits-heatmap-name-spacer" />
              <div className="habits-heatmap-cells">
                {dayKeys.map((key) => (
                  <div key={key} className="habits-heatmap-day-letter">
                    {dayLetter(key)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
