"use client";

/**
 * HabitsCard
 *
 * Shows a 7-column grid (last 7 days) for each of 6 configured habits.
 * State flow:
 *   1. On mount → paint from localStorage instantly, then fetch
 *      GET /api/habits?days=30 and merge (server wins for past days,
 *      local wins for today so optimistic toggles aren't overwritten).
 *   2. Toggle → optimistic local state + localStorage write →
 *      POST /api/habits/[date] (fire-and-forget, shows sync indicator).
 *   3. localDateKey() always uses the USER's clock so the day rolls over
 *      at midnight local time, never at UTC midnight.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { IconHabit }                                 from "@/components/ui/Icon";
import { HABITS, HABIT_IDS }                         from "@/lib/config/habits";
import type { HabitDayData, HabitsResponse }         from "@/app/api/habits/route";

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * "YYYY-MM-DD" using the user's LOCAL clock — not UTC.
 * This is the canonical day key everywhere in this component.
 */
function localDateKey(d: Date = new Date()): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** The 7 local date keys ending today, oldest → newest. */
function last7Keys(): string[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return localDateKey(d);
  });
}

/** Single letter day name from a "YYYY-MM-DD" key using local date parsing. */
function dayLetter(dateKey: string): string {
  const [y, mo, d] = dateKey.split("-").map(Number);
  // new Date(y, month-1, day) — local time, no timezone shift
  return new Date(y!, mo! - 1, d!).toLocaleDateString(undefined, { weekday: "narrow" });
}

function dayNum(dateKey: string): number {
  return parseInt(dateKey.split("-")[2]!, 10);
}

// ── localStorage cache ────────────────────────────────────────────────────────

const LS_KEY = "personal-os:habits-v1";

function lsRead(): Record<string, HabitDayData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, HabitDayData>) : {};
  } catch { return {}; }
}

function lsWrite(data: Record<string, HabitDayData>): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch { /* quota */ }
}

// ── Streak calculation ────────────────────────────────────────────────────────

function computeStreak(habitId: string, logs: Record<string, HabitDayData>): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key  = localDateKey(d);
    const done = logs[key]?.done ?? [];
    if (done.includes(habitId)) {
      streak++;
    } else if (i > 0) {
      // Allow today to be incomplete without breaking the streak
      break;
    }
  }
  return streak;
}

// ── Server sync ───────────────────────────────────────────────────────────────

async function syncDay(dateKey: string, data: HabitDayData): Promise<void> {
  await fetch(`/api/habits/${dateKey}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });
}

// ── HabitsCard ────────────────────────────────────────────────────────────────

export function HabitsCard() {
  const [logs,      setLogs]      = useState<Record<string, HabitDayData>>({});
  const [syncing,   setSyncing]   = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const initialized = useRef(false);

  const todayKey = localDateKey();
  const keys     = last7Keys();   // memoised per render; stable within a day

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Paint from localStorage immediately — zero-latency feedback
    const cached = lsRead();
    setLogs(cached);

    // Then reconcile with server
    void fetch("/api/habits?days=30")
      .then(async (res) => {
        const json = (await res.json()) as HabitsResponse & { error?: string };
        if (!res.ok) { setLoadError(json.error ?? "Load failed"); return; }

        setLogs((prev) => {
          // Server is truth for historical days; keep local value for today
          // so optimistic toggles are never overwritten.
          const merged: Record<string, HabitDayData> = { ...json.logs };
          const localToday = prev[todayKey];
          if (localToday) merged[todayKey] = localToday;
          lsWrite(merged);
          return merged;
        });
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Network error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // intentionally empty — runs once on mount

  // ── Toggle ────────────────────────────────────────────────────────────────
  const toggle = useCallback(
    (habitId: string) => {
      setLogs((prev) => {
        const today   = prev[todayKey] ?? { done: [], total: HABIT_IDS.length };
        const wasDone = today.done.includes(habitId);
        const nextDone = wasDone
          ? today.done.filter((id) => id !== habitId)
          : [...today.done, habitId];

        const nextData: HabitDayData = { done: nextDone, total: HABIT_IDS.length };
        const next = { ...prev, [todayKey]: nextData };

        lsWrite(next);

        // Fire-and-forget sync
        setSyncing(true);
        void syncDay(todayKey, nextData).finally(() => setSyncing(false));

        return next;
      });
    },
    [todayKey]
  );

  // ── Derived ───────────────────────────────────────────────────────────────
  const todayDone  = logs[todayKey]?.done ?? [];
  const doneCount  = todayDone.length;

  const weekNum = (() => {
    const now  = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    return Math.ceil(((now.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7);
  })();

  const pct = HABITS.length > 0 ? (doneCount / HABITS.length) * 100 : 0;

  return (
    <div className="card">
      {/* ── Header ── */}
      <div className="card-head">
        <div>
          <div className="card-eyebrow">
            <IconHabit size={12} /> Habit Tracker · Week {weekNum}
          </div>
          <h3 className="card-title">
            {doneCount} of {HABITS.length} done today
            {syncing && (
              <span className="habit-sync-dot" title="Syncing…" aria-label="Syncing" />
            )}
          </h3>
        </div>
        {loadError && (
          <span className="habit-err-badge" title={loadError}>⚠</span>
        )}
      </div>

      {/* ── Day column headers ── */}
      <div className="habit-days">
        <span />
        <div className="habit-days-grid">
          {keys.map((key) => (
            <span
              key={key}
              className={key === todayKey ? "habit-day-col habit-day-col-today" : "habit-day-col"}
            >
              <span className="habit-day-letter">{dayLetter(key)}</span>
              <span className="habit-day-num2">{dayNum(key)}</span>
            </span>
          ))}
        </div>
        <span className="habit-str-hdr">STR</span>
      </div>

      {/* ── Habit rows ── */}
      <div className="habit-grid">
        {HABITS.map((habit) => {
          const streak = computeStreak(habit.id, logs);

          return (
            <div className="habit-row" key={habit.id}>
              <div className="habit-name">
                <span className="habit-icon" aria-hidden>{habit.icon}</span>
                {habit.name}
              </div>

              <div className="habit-cells">
                {keys.map((key) => {
                  const isToday = key === todayKey;
                  const done    = (logs[key]?.done ?? []).includes(habit.id);
                  return (
                    <button
                      key={key}
                      className={[
                        "habit-cell",
                        done    && "habit-cell-done",
                        isToday && "habit-cell-today",
                      ].filter(Boolean).join(" ")}
                      onClick={isToday ? () => toggle(habit.id) : undefined}
                      disabled={!isToday}
                      aria-label={`${habit.name} — ${isToday ? (done ? "done, click to unmark" : "not done, click to mark") : key}`}
                      aria-pressed={done}
                    />
                  );
                })}
              </div>

              <div className={streak > 0 ? "habit-streak habit-streak-active" : "habit-streak"}>
                {streak > 0 ? `${streak}d` : "—"}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Daily progress bar ── */}
      <div
        className="habit-progress-wrap"
        role="progressbar"
        aria-valuenow={doneCount}
        aria-valuemin={0}
        aria-valuemax={HABITS.length}
        aria-label={`${doneCount} of ${HABITS.length} habits done`}
      >
        <div className="habit-progress-bar" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
