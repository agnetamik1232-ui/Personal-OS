"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { IconHabit }                                 from "@/components/ui/Icon";
import { HABITS as DEFAULT_HABITS }                  from "@/lib/config/habits";
import type { HabitConfig }                          from "@/lib/config/habits";
import { HabitEditModal }                            from "@/components/ui/HabitEditModal";
import type { HabitDayData, HabitsResponse }         from "@/app/api/habits/route";
import { localDateKey }                              from "@/lib/utils/localDate";

// ── Date helpers ──────────────────────────────────────────────────────────────

function last7Keys(): string[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return localDateKey(d);
  });
}

function dayLetter(dateKey: string): string {
  const [y, mo, d] = dateKey.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("en-GB", { weekday: "narrow", timeZone: "Europe/Vilnius" })
    .format(new Date(Date.UTC(y, mo - 1, d)));
}

function dayNum(dateKey: string): number {
  return parseInt(dateKey.split("-")[2]!, 10);
}

// ── localStorage ──────────────────────────────────────────────────────────────

const LS_LOGS_KEY    = "personal-os:habits-v1";
const LS_CONFIG_KEY  = "personal-os:habits-config-v1";

function lsReadLogs(): Record<string, HabitDayData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_LOGS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, HabitDayData>) : {};
  } catch { return {}; }
}
function lsWriteLogs(data: Record<string, HabitDayData>): void {
  try { localStorage.setItem(LS_LOGS_KEY, JSON.stringify(data)); } catch { /* quota */ }
}

function lsReadConfig(): HabitConfig[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HabitConfig[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch { return null; }
}
function lsWriteConfig(habits: HabitConfig[]): void {
  try { localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(habits)); } catch { /* quota */ }
}

// ── Streak ────────────────────────────────────────────────────────────────────

function computeStreak(habitId: string, logs: Record<string, HabitDayData>): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key  = localDateKey(d);
    const done = logs[key]?.done ?? [];
    if (done.includes(habitId)) { streak++; }
    else if (i > 0) break;
  }
  return streak;
}

// ── Server ────────────────────────────────────────────────────────────────────

async function syncDay(dateKey: string, data: HabitDayData): Promise<void> {
  await fetch(`/api/habits/${dateKey}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });
}

// ── HabitsCard ────────────────────────────────────────────────────────────────

export function HabitsCard() {
  // habits config — starts from localStorage or file default, server reconciles on mount
  const [habits,    setHabits]    = useState<HabitConfig[]>(() => lsReadConfig() ?? DEFAULT_HABITS);
  const [logs,      setLogs]      = useState<Record<string, HabitDayData>>({});
  const [syncing,   setSyncing]   = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing,   setEditing]   = useState(false);
  const initialized = useRef(false);

  const todayKey = localDateKey();
  const keys     = last7Keys();

  // ── Boot: load config + logs from server ─────────────────────────────────
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Paint logs from localStorage immediately
    setLogs(lsReadLogs());

    // Fetch config and logs in parallel
    void Promise.all([
      fetch("/api/habits/config").then((r) => r.json() as Promise<{ habits?: HabitConfig[]; error?: string }>),
      fetch("/api/habits?days=30").then((r) => r.json() as Promise<HabitsResponse & { error?: string }>),
    ]).then(([cfgJson, logsJson]) => {
      // Config
      if (cfgJson.habits && Array.isArray(cfgJson.habits) && cfgJson.habits.length > 0) {
        setHabits(cfgJson.habits);
        lsWriteConfig(cfgJson.habits);
      }
      // Logs — server wins for history, local today is preserved
      if (logsJson.logs) {
        setLogs((prev) => {
          const merged = { ...logsJson.logs };
          const localToday = prev[todayKey];
          if (localToday) merged[todayKey] = localToday;
          lsWriteLogs(merged);
          return merged;
        });
      } else if (logsJson.error) {
        setLoadError(logsJson.error);
      }
    }).catch((e: unknown) => {
      setLoadError(e instanceof Error ? e.message : "Network error");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toggle ────────────────────────────────────────────────────────────────
  const toggle = useCallback((habitId: string) => {
    setLogs((prev) => {
      const today    = prev[todayKey] ?? { done: [], total: habits.length };
      const wasDone  = today.done.includes(habitId);
      const nextDone = wasDone
        ? today.done.filter((id) => id !== habitId)
        : [...today.done, habitId];

      const nextData: HabitDayData = { done: nextDone, total: habits.length };
      const next = { ...prev, [todayKey]: nextData };
      lsWriteLogs(next);

      setSyncing(true);
      void syncDay(todayKey, nextData).finally(() => setSyncing(false));

      return next;
    });
  }, [todayKey, habits.length]);

  // ── Edit save ─────────────────────────────────────────────────────────────
  const handleSave = useCallback((updated: HabitConfig[]) => {
    setHabits(updated);
    lsWriteConfig(updated);
    setEditing(false);
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const todayDone = logs[todayKey]?.done ?? [];
  const doneCount = todayDone.length;
  const pct       = habits.length > 0 ? (doneCount / habits.length) * 100 : 0;

  const weekNum = (() => {
    const now  = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    return Math.ceil(((now.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7);
  })();

  return (
    <>
      <div className="card">
        {/* ── Header ── */}
        <div className="card-head">
          <div>
            <div className="card-eyebrow">
              <IconHabit size={12} /> Habit Tracker · Week {weekNum}
            </div>
            <h3 className="card-title">
              {doneCount} of {habits.length} done today
              {syncing && <span className="habit-sync-dot" title="Syncing…" aria-label="Syncing" />}
            </h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {loadError && <span className="habit-err-badge" title={loadError}>⚠</span>}
            <button className="card-action" onClick={() => setEditing(true)}>Edit</button>
          </div>
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
          {habits.map((habit) => {
            const streak = computeStreak(habit.id, logs);
            return (
              <div className="habit-row" key={habit.id}>
                <div className="habit-name">
                  <span className="habit-icon" aria-hidden>{habit.icon}</span>
                  <span className="habit-name-text">{habit.name}</span>
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

        {/* ── Progress bar ── */}
        <div
          className="habit-progress-wrap"
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={habits.length}
          aria-label={`${doneCount} of ${habits.length} habits done`}
        >
          <div className="habit-progress-bar" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* ── Edit modal (portal-like, rendered outside card) ── */}
      {editing && (
        <HabitEditModal
          initial={habits}
          onSave={handleSave}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
