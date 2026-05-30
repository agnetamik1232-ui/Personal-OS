"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { TaskRow } from "@/app/api/tasks/route";
import type { GoalsResponse } from "@/app/api/goals/route";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface FocusItem {
  icon:  string;
  label: string;
  text:  string;
  href:  string;
  urgent?: boolean;
}

export function TodayFocusCard() {
  const [items,   setItems]   = useState<FocusItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = todayKey();
    const now   = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    void Promise.all([
      fetch(`/api/tasks?status=open&limit=100`).then(r => r.json() as Promise<{ tasks?: TaskRow[] }>).catch(() => ({})),
      fetch(`/api/goals`).then(r => r.json() as Promise<GoalsResponse>).catch(() => ({ week: [], month: [] })),
      fetch(`/api/habits/${today}`).then(r => r.json() as Promise<{ done?: string[]; total?: number; pending?: string[] }>).catch(() => ({})),
    ]).then(([tx, goals, hab]) => {
      const built: FocusItem[] = [];

      // Most important task: key=true first, then overdue, then due today
      const tasks = (tx as { tasks?: TaskRow[] }).tasks ?? [];
      const keyTask = tasks.find(t => t.key && !t.completed_at);
      const overdueTask = tasks.find(t => t.due_date && !t.completed_at && new Date(t.due_date) < todayDate);
      const todayTask = tasks.find(t => t.due_date === today && !t.completed_at);
      const topTask = keyTask ?? overdueTask ?? todayTask;

      if (topTask) {
        built.push({
          icon:   "🎯",
          label:  "Most Important Task",
          text:   topTask.title,
          href:   "/tasks",
          urgent: !!(overdueTask && topTask === overdueTask),
        });
      }

      // Most important goal: first incomplete week goal
      const weekGoals = (goals as GoalsResponse).week ?? [];
      const topGoal = weekGoals.find(g => !g.done);
      if (topGoal) {
        built.push({ icon: "🏆", label: "This Week's Goal", text: topGoal.text, href: "/goals" });
      }

      // Habit reminder
      const habData = hab as { done?: string[]; total?: number };
      const habDone  = habData.done?.length ?? 0;
      const habTotal = habData.total ?? 0;
      if (habTotal > 0) {
        const remaining = habTotal - habDone;
        if (remaining > 0) {
          built.push({
            icon:  "🔁",
            label: "Habits",
            text:  remaining === 1 ? "1 habit remaining today" : `${remaining} habits remaining today`,
            href:  "/habits",
          });
        } else {
          built.push({ icon: "✅", label: "Habits", text: "All habits complete — great work!", href: "/habits" });
        }
      }

      if (built.length === 0) {
        built.push({ icon: "🌟", label: "Focus", text: "Plan your day — add tasks and goals", href: "/tasks" });
      }

      setItems(built);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="card tf-card">
      <div className="tf-header">
        <div className="card-eyebrow">🎯 Today&apos;s Focus</div>
        <div className="tf-title">Your Top Priorities</div>
      </div>

      {loading && (
        <div className="tf-loading">
          <div className="kpi-skeleton" style={{ height: 40, marginBottom: 10 }} />
          <div className="kpi-skeleton" style={{ height: 40, marginBottom: 10 }} />
          <div className="kpi-skeleton" style={{ height: 40 }} />
        </div>
      )}

      {!loading && (
        <div className="tf-items">
          {items.map((item, i) => (
            <Link key={i} href={item.href} className={`tf-item${item.urgent ? " tf-item-urgent" : ""}`}>
              <span className="tf-item-icon">{item.icon}</span>
              <div className="tf-item-body">
                <div className="tf-item-label">{item.label}</div>
                <div className="tf-item-text">{item.text}</div>
              </div>
              <span className="tf-item-arrow">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
