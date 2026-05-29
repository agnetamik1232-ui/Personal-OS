"use client";

import { useState, useEffect } from "react";
import { localDateKey }         from "@/lib/utils/localDate";
import type { HabitsResponse }  from "@/app/api/habits/route";
import type { NutritionResponse } from "@/app/api/nutrition/route";
import type { TaskRow }         from "@/app/api/tasks/route";
import type { JournalEntry }    from "@/app/api/journal/route";

// ── Date helpers ──────────────────────────────────────────────────────────────

function weekStart(offset = 0): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1 - day) + offset * 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0]!;
}

function weekEnd(start: string): string {
  const [y, m, d] = start.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + 6));
  return dt.toISOString().split("T")[0]!;
}

function fmtDateShort(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", timeZone: "Europe/Vilnius",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function keysInRange(start: string, end: string): string[] {
  const keys: string[] = [];
  const [y, m, d] = start.split("-").map(Number) as [number, number, number];
  const endTs = new Date(end).getTime();
  for (let i = 0; i < 7; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    if (dt.getTime() > endTs) break;
    keys.push(dt.toISOString().split("T")[0]!);
  }
  return keys;
}

// ── Mini sparkline ────────────────────────────────────────────────────────────

function Sparkline({ values, color = "#2E6B45" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 80, H = 28;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ pct, label, color }: { pct: number; label: string; color: string }) {
  const r = 28, circ = 2 * Math.PI * r;
  const dash = circ * Math.min(pct / 100, 1);
  return (
    <div className="score-ring-wrap">
      <svg viewBox="0 0 72 72" width="72" height="72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(28,26,23,0.08)" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
        <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="600" fill="rgba(28,26,23,0.75)">
          {Math.round(pct)}%
        </text>
      </svg>
      <span className="score-ring-label">{label}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function WeeklyReview() {
  const todayKey = localDateKey();

  const [weekOffset, setWeekOffset] = useState(0);
  const [habits, setHabits]         = useState<HabitsResponse["logs"]>({});
  const [nutrition, setNutrition]   = useState<NutritionResponse["logs"]>({});
  const [tasks, setTasks]           = useState<TaskRow[]>([]);
  const [journal, setJournal]       = useState<JournalEntry[]>([]);
  const [loading, setLoading]       = useState(true);

  const wStart = weekStart(weekOffset);
  const wEnd   = weekEnd(wStart);
  const dayKeys = keysInRange(wStart, wEnd).filter((k) => k <= todayKey);

  useEffect(() => {
    setLoading(true);
    void Promise.all([
      fetch("/api/habits?days=30").then((r) => r.json() as Promise<HabitsResponse>),
      fetch("/api/nutrition?days=30").then((r) => r.json() as Promise<NutritionResponse>),
      fetch("/api/tasks?status=completed&limit=200").then((r) => r.json() as Promise<{ tasks: TaskRow[] }>),
      fetch("/api/journal?days=60").then((r) => r.json() as Promise<{ entries: JournalEntry[] }>),
    ]).then(([hab, nut, tsk, jrn]) => {
      setHabits(hab.logs ?? {});
      setNutrition(nut.logs ?? {});
      setTasks(tsk.tasks ?? []);
      setJournal(jrn.entries ?? []);
      setLoading(false);
    });
  }, []);

  // ── Habits stats for the week ─────────────────────────────────────────────
  const habitDays = dayKeys.map((key) => {
    const log = habits[key];
    if (!log || log.total === 0) return null;
    return { pct: (log.done.length / log.total) * 100, done: log.done.length, total: log.total };
  }).filter(Boolean) as { pct: number; done: number; total: number }[];

  const avgHabitPct = habitDays.length
    ? habitDays.reduce((s, d) => s + d.pct, 0) / habitDays.length
    : 0;

  // ── Nutrition averages for the week ───────────────────────────────────────
  const nutDays = dayKeys
    .map((key) => nutrition[key])
    .filter(Boolean) as NutritionResponse["logs"][string][];

  const avgKcal = nutDays.length ? nutDays.reduce((s, d) => s + d.kcal, 0) / nutDays.length : 0;
  const avgP    = nutDays.length ? nutDays.reduce((s, d) => s + d.p, 0)    / nutDays.length : 0;

  // ── Tasks completed this week ─────────────────────────────────────────────
  const completedThisWeek = tasks.filter((t) => {
    if (!t.completed_at) return false;
    const completedDate = t.completed_at.split("T")[0]!;
    return completedDate >= wStart && completedDate <= wEnd;
  });

  // ── Journal entries this week ─────────────────────────────────────────────
  const journalThisWeek = journal.filter((e) => e.date >= wStart && e.date <= wEnd);
  const journalPct      = dayKeys.length ? (journalThisWeek.length / dayKeys.length) * 100 : 0;

  const isCurrentWeek = weekOffset === 0;

  return (
    <div className="wr-page">
      {/* Header */}
      <div className="wr-header">
        <div>
          <p className="wr-eyebrow">Weekly Review</p>
          <h1 className="wr-title">
            {fmtDateShort(wStart)} – {fmtDateShort(wEnd)}
            {isCurrentWeek && <span className="wr-this-week-badge">This week</span>}
          </h1>
        </div>
        <div className="wr-week-nav">
          <button className="wr-nav-btn" onClick={() => setWeekOffset((o) => o - 1)}>‹ Prev</button>
          {!isCurrentWeek && (
            <button className="wr-nav-btn" onClick={() => setWeekOffset(0)}>Today</button>
          )}
          <button className="wr-nav-btn" onClick={() => setWeekOffset((o) => o + 1)} disabled={isCurrentWeek}>
            Next ›
          </button>
        </div>
      </div>

      {loading ? (
        <div className="wr-loading">Loading…</div>
      ) : (
        <>
          {/* Score rings */}
          <div className="wr-rings">
            <ScoreRing pct={avgHabitPct}  label="Habits"  color="#2E6B45" />
            <ScoreRing pct={journalPct}   label="Journal" color="#7A6BDE" />
            <ScoreRing
              pct={avgKcal > 0 ? Math.min(100, (avgKcal / 2100) * 100) : 0}
              label="Nutrition"
              color="#C99C4A"
            />
          </div>

          {/* Day-by-day breakdown */}
          <div className="wr-section">
            <h2 className="wr-section-title">Day breakdown</h2>
            <div className="wr-day-grid">
              {keysInRange(wStart, wEnd).map((key) => {
                const isFuture  = key > todayKey;
                const habLog    = habits[key];
                const nutLog    = nutrition[key];
                const jrnEntry  = journal.find((e) => e.date === key);
                const isToday   = key === todayKey;

                return (
                  <div key={key} className={`wr-day${isFuture ? " wr-day-future" : ""}${isToday ? " wr-day-today" : ""}`}>
                    <div className="wr-day-label">
                      {new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Europe/Vilnius" })
                        .format(new Date(key + "T12:00:00Z"))}
                    </div>
                    <div className="wr-day-num">
                      {parseInt(key.split("-")[2]!, 10)}
                    </div>
                    {!isFuture && (
                      <div className="wr-day-dots">
                        <span className={`wr-dot${habLog && habLog.done.length === habLog.total && habLog.total > 0 ? " wr-dot-green" : habLog && habLog.done.length > 0 ? " wr-dot-yellow" : ""}`} title="Habits" />
                        <span className={`wr-dot${nutLog && nutLog.meals.length > 0 ? " wr-dot-orange" : ""}`} title="Nutrition" />
                        <span className={`wr-dot${jrnEntry ? " wr-dot-purple" : ""}`} title="Journal" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="wr-legend">
              <span className="wr-legend-item"><span className="wr-dot wr-dot-green" />All habits</span>
              <span className="wr-legend-item"><span className="wr-dot wr-dot-yellow" />Some habits</span>
              <span className="wr-legend-item"><span className="wr-dot wr-dot-orange" />Nutrition logged</span>
              <span className="wr-legend-item"><span className="wr-dot wr-dot-purple" />Journal written</span>
            </div>
          </div>

          {/* Stats cards */}
          <div className="wr-stats-grid">
            {/* Habits */}
            <div className="wr-stat-card">
              <h3 className="wr-stat-title">Habits</h3>
              <div className="wr-stat-big">{Math.round(avgHabitPct)}%</div>
              <p className="wr-stat-sub">avg completion ({habitDays.length} day{habitDays.length !== 1 ? "s" : ""} tracked)</p>
              <Sparkline values={habitDays.map((d) => d.pct)} color="#2E6B45" />
            </div>

            {/* Nutrition */}
            <div className="wr-stat-card">
              <h3 className="wr-stat-title">Nutrition</h3>
              <div className="wr-stat-big">{Math.round(avgKcal).toLocaleString()}</div>
              <p className="wr-stat-sub">kcal / day avg · {Math.round(avgP)}g protein</p>
              <Sparkline values={nutDays.map((d) => d.kcal)} color="#C99C4A" />
            </div>

            {/* Tasks */}
            <div className="wr-stat-card">
              <h3 className="wr-stat-title">Tasks completed</h3>
              <div className="wr-stat-big">{completedThisWeek.length}</div>
              <p className="wr-stat-sub">this week</p>
              {completedThisWeek.length > 0 && (
                <ul className="wr-task-list">
                  {completedThisWeek.slice(0, 5).map((t) => (
                    <li key={t.id} className="wr-task-item">✓ {t.title}</li>
                  ))}
                  {completedThisWeek.length > 5 && (
                    <li className="wr-task-more">+{completedThisWeek.length - 5} more</li>
                  )}
                </ul>
              )}
            </div>

            {/* Journal */}
            <div className="wr-stat-card">
              <h3 className="wr-stat-title">Journal</h3>
              <div className="wr-stat-big">{journalThisWeek.length}/{dayKeys.length}</div>
              <p className="wr-stat-sub">days written</p>
              {journalThisWeek[0] && (
                <p className="wr-journal-preview">
                  &ldquo;{journalThisWeek[0].text.slice(0, 80)}{journalThisWeek[0].text.length > 80 ? "…" : ""}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Completed tasks detail */}
          {completedThisWeek.length > 0 && (
            <div className="wr-section">
              <h2 className="wr-section-title">Completed this week</h2>
              <div className="wr-task-detail-list">
                {completedThisWeek.map((t) => (
                  <div key={t.id} className="wr-task-detail-row">
                    <span className="wr-task-check">✓</span>
                    <div>
                      <div className="wr-task-detail-title">{t.title}</div>
                      {t.entity_name && <div className="wr-task-detail-entity">{t.entity_name}</div>}
                    </div>
                    {t.urgency && (
                      <span className={`wr-urgency wr-urgency-${t.urgency}`}>{t.urgency}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
