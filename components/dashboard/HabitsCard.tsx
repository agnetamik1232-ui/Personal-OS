"use client";

import { useState } from "react";
import { IconHabit } from "@/components/ui/Icon";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;
const TODAY_IDX = 3; // Thursday

interface HabitRow {
  name: string;
  icon: string;
  cells: number[];
  streak: number;
}

const INITIAL: HabitRow[] = [
  { name: "Read 30 min",   icon: "📖", cells: [1,1,1,1,0,0,0], streak: 14 },
  { name: "Workout",       icon: "◐",  cells: [1,0,1,1,0,0,0], streak: 6  },
  { name: "No phone < 1h", icon: "◌",  cells: [1,1,1,0,0,0,0], streak: 3  },
  { name: "Journal",       icon: "✎",  cells: [1,1,1,1,0,0,0], streak: 22 },
  { name: "Meditate 10",   icon: "◯",  cells: [0,1,1,1,0,0,0], streak: 9  },
];

export function HabitsCard() {
  const [habits, setHabits] = useState<HabitRow[]>(INITIAL);

  function toggle(hi: number, ci: number) {
    setHabits((prev) =>
      prev.map((row, i) =>
        i !== hi ? row : {
          ...row,
          cells: row.cells.map((c, j) => (j === ci ? (c ? 0 : 1) : c)),
        }
      )
    );
  }

  const doneToday = habits.filter((h) => h.cells[TODAY_IDX] === 1).length;

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-eyebrow"><IconHabit size={12} /> Habit Tracker · Week 22</div>
          <h3 className="card-title">{doneToday} of {habits.length} holding steady</h3>
        </div>
        <button className="card-action">Edit</button>
      </div>

      {/* Day headers */}
      <div className="habit-days">
        <span />
        <div className="habit-days-grid">
          {DAYS.map((d, i) => (
            <span
              key={`${d}-${i}`}
              style={{
                color:      i === TODAY_IDX ? "var(--ink-hex)" : undefined,
                fontWeight: i === TODAY_IDX ? 600 : 400,
                textAlign:  "center",
              }}
            >
              {d}
            </span>
          ))}
        </div>
        <span style={{ textAlign: "right" }}>STR</span>
      </div>

      {/* Habit rows */}
      <div className="habit-grid">
        {habits.map((row, hi) => (
          <div className="habit-row" key={row.name}>
            <div className="habit-name">
              <span className="habit-icon" aria-hidden>{row.icon}</span>
              {row.name}
            </div>
            <div className="habit-cells">
              {row.cells.map((c, ci) => {
                const isDone  = c === 1;
                const isToday = ci === TODAY_IDX;
                let cls = "habit-cell";
                if (isDone)  cls += " habit-cell-done";
                if (isToday) cls += " habit-cell-today";
                return (
                  <button
                    key={ci}
                    className={cls}
                    onClick={() => toggle(hi, ci)}
                    aria-label={`${row.name} ${DAYS[ci] ?? ""} ${isDone ? "done" : "not done"}`}
                    aria-pressed={isDone}
                  />
                );
              })}
            </div>
            <div className="habit-streak">{row.streak}d</div>
          </div>
        ))}
      </div>
    </div>
  );
}
