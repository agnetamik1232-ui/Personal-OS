"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TodaySummary {
  shiftActive:  boolean;
  workoutDay:   string;
  caloriesKcal: number;
  proteinG:     number;
  tasksDue:     number;
  habitsDone:   number;
  habitsTotal:  number;
  suppTaken:    number;
  suppTotal:    number;
}

function getWorkoutDay(): string {
  const day = new Date().getDay();
  const map: Record<number, string> = { 1: "Day A — Lower Body", 3: "Day B — Upper Body", 5: "Day C — Full Body" };
  return map[day] ?? "Rest Day";
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function TodaySummaryBar() {
  const [data, setData] = useState<TodaySummary | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]!;
    void Promise.all([
      fetch("/api/work/shift-report").then(r => r.json()).catch(() => ({})),
      fetch(`/api/nutrition?days=1`).then(r => r.json()).catch(() => ({})),
      fetch("/api/tasks?status=open&limit=200").then(r => r.json()).catch(() => ({})),
      fetch("/api/habits?days=1").then(r => r.json()).catch(() => ({})),
      fetch("/api/supplements").then(r => r.json()).catch(() => ({})),
    ]).then(([shift, nutr, tasks, habits, supps]) => {
      const report  = (shift as { report?: { status: string } }).report;
      const dayLog  = (nutr as { logs?: Record<string, { kcal: number; p: number }> }).logs?.[today];
      const taskArr = (tasks as { tasks?: { due_date?: string | null }[] }).tasks ?? [];
      const habLog  = (habits as { logs?: Record<string, { done: string[] }> }).logs?.[today];
      const suppArr = (supps as { supplements?: { taken: boolean }[] }).supplements ?? [];

      setData({
        shiftActive:  report?.status === "active",
        workoutDay:   getWorkoutDay(),
        caloriesKcal: Math.round(dayLog?.kcal ?? 0),
        proteinG:     Math.round(dayLog?.p ?? 0),
        tasksDue:     taskArr.filter(t => t.due_date === today).length,
        habitsDone:   habLog?.done.length ?? 0,
        habitsTotal:  6,
        suppTaken:    suppArr.filter(s => s.taken).length,
        suppTotal:    suppArr.length,
      });
    });
  }, []);

  const isRest = getWorkoutDay() === "Rest Day";

  return (
    <div className="tsb-bar">
      <div className="tsb-greeting">
        <span className="tsb-hi">{greeting()}, Agneta 👋</span>
        <span className="tsb-date">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
      </div>
      <div className="tsb-chips">
        <Link href="/work" className={`tsb-chip${data?.shiftActive ? " tsb-chip-green" : ""}`}>
          {data?.shiftActive ? "🟢 Shift active" : "⚪ No shift started"}
        </Link>
        <Link href="/fitness" className={`tsb-chip${!isRest ? " tsb-chip-blue" : ""}`}>
          🏋️ {data?.workoutDay ?? getWorkoutDay()}
        </Link>
        {data && (
          <Link href="/health" className={`tsb-chip${data.caloriesKcal >= 1400 ? " tsb-chip-green" : ""}`}>
            🍽️ {data.caloriesKcal} / 1,675 kcal · {data.proteinG}g protein
          </Link>
        )}
        {data && (
          <Link href="/tasks" className={`tsb-chip${data.tasksDue > 0 ? " tsb-chip-red" : " tsb-chip-green"}`}>
            ✓ {data.tasksDue > 0 ? `${data.tasksDue} tasks due` : "No tasks due"}
          </Link>
        )}
        {data && data.habitsTotal > 0 && (
          <Link href="/habits" className="tsb-chip">
            🔥 {data.habitsDone}/{data.habitsTotal} habits
          </Link>
        )}
        {data && data.suppTotal > 0 && (
          <Link href="/supplements" className={`tsb-chip${data.suppTaken === data.suppTotal ? " tsb-chip-green" : ""}`}>
            💊 {data.suppTaken}/{data.suppTotal} supplements
          </Link>
        )}
      </div>
    </div>
  );
}
