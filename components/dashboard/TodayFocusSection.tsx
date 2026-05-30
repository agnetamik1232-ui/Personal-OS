"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { TaskRow } from "@/app/api/tasks/route";
import type { GoalsResponse } from "@/app/api/goals/route";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface FocusItem { icon: string; label: string; text: string; href: string; urgent?: boolean }

export function TodayFocusSection() {
  const [items,   setItems]   = useState<FocusItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today     = todayKey();
    const now       = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    void Promise.all([
      fetch("/api/tasks?status=open&limit=100").then(r => r.json() as Promise<{ tasks?: TaskRow[] }>).catch(() => ({})),
      fetch("/api/goals").then(r => r.json() as Promise<GoalsResponse>).catch(() => ({ week: [], month: [] })),
      fetch(`/api/habits/${today}`).then(r => r.json() as Promise<{ done?: string[]; total?: number }>).catch(() => ({})),
    ]).then(([tx, goals, hab]) => {
      const items: FocusItem[] = [];
      const tasks = (tx as { tasks?: TaskRow[] }).tasks ?? [];

      // #1 Most important task
      const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < todayDate && !t.completed_at);
      const keyTask = tasks.find(t => t.key && !t.completed_at);
      const top = keyTask ?? overdue[0] ?? tasks.find(t => t.due_date === today && !t.completed_at) ?? tasks.find(t => !t.completed_at);
      if (top) items.push({ icon: "🎯", label: "Most Important Task", text: top.title, href: "/tasks", urgent: overdue.length > 0 && top === overdue[0] });

      // #2 Most important goal
      const weekGoals = (goals as GoalsResponse).week ?? [];
      const topGoal = weekGoals.find(g => !g.done);
      if (topGoal) items.push({ icon: "🏆", label: "Weekly Goal", text: topGoal.text, href: "/goals" });

      // #3 Habit status
      const habDone  = (hab as { done?: string[] }).done?.length ?? 0;
      const habTotal = (hab as { total?: number }).total ?? 0;
      if (habTotal > 0) {
        const rem = habTotal - habDone;
        items.push({
          icon:  rem === 0 ? "✅" : "🔁",
          label: "Habits",
          text:  rem === 0 ? "All habits complete" : `${rem} habit${rem > 1 ? "s" : ""} remaining`,
          href:  "/habits",
        });
      }

      setItems(items.slice(0, 4));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="card tfs-card">
      <div className="tfs-header">
        <div className="tfs-title">Today&apos;s Focus</div>
        <Link href="/tasks" className="tfs-link">View all →</Link>
      </div>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1,2,3].map(i => <div key={i} className="kpi2-skeleton" style={{ height: 52 }} />)}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="tfs-empty">
          <span className="tfs-empty-icon">🌟</span>
          <span>Nothing due — a great day to get ahead</span>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="tfs-items">
          {items.map((item, i) => (
            <Link key={i} href={item.href} className={`tfs-item${item.urgent ? " tfs-urgent" : ""}`}>
              <div className="tfs-item-num">{i + 1}</div>
              <div className="tfs-item-body">
                <div className="tfs-item-label">{item.label}</div>
                <div className="tfs-item-text">{item.icon} {item.text}</div>
              </div>
              <span className="tfs-arrow">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
