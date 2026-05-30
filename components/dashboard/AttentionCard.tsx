"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { TaskRow } from "@/app/api/tasks/route";
import type { FinSummary } from "@/lib/finance/types";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface AlertItem {
  icon:  string;
  text:  string;
  sub?:  string;
  href:  string;
  level: "high" | "medium" | "low";
}

export function AttentionCard() {
  const [alerts,  setAlerts]  = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today    = todayKey();
    const now      = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in7      = new Date(todayDate.getTime() + 7 * 86400000);

    void Promise.all([
      fetch(`/api/tasks?status=open&limit=200`).then(r => r.json() as Promise<{ tasks?: TaskRow[] }>).catch(() => ({})),
      fetch(`/api/finance/summary`).then(r => r.json() as Promise<{ summary?: FinSummary }>).catch(() => ({})),
      fetch(`/api/checkin?date=${today}`).then(r => r.json() as Promise<{ checkin?: { completed?: boolean } | null }>).catch(() => ({})),
    ]).then(([tx, fin, ci]) => {
      const built: AlertItem[] = [];

      // Overdue tasks (max 2)
      const tasks = (tx as { tasks?: TaskRow[] }).tasks ?? [];
      const overdue = tasks.filter(t => t.due_date && !t.completed_at && new Date(t.due_date) < todayDate);
      if (overdue.length === 1) {
        built.push({ icon: "🔴", text: overdue[0]!.title, sub: "Overdue task", href: "/tasks", level: "high" });
      } else if (overdue.length > 1) {
        built.push({ icon: "🔴", text: `${overdue.length} overdue tasks`, sub: "Need immediate attention", href: "/tasks", level: "high" });
      }

      // Due today
      const dueToday = tasks.filter(t => t.due_date === today && !t.completed_at);
      if (dueToday.length > 0) {
        built.push({ icon: "🟡", text: `${dueToday.length} task${dueToday.length > 1 ? "s" : ""} due today`, href: "/tasks", level: "medium" });
      }

      // Upcoming bills (≤7 days)
      const bills = (fin as { summary?: FinSummary }).summary?.upcoming_bills ?? [];
      const upcomingBills = bills.filter(b => {
        const bd = new Date(b.due_date);
        return bd >= todayDate && bd <= in7;
      });
      if (upcomingBills.length > 0) {
        const total = upcomingBills.reduce((s, b) => s + b.amount, 0);
        built.push({
          icon:  "💳",
          text:  `${upcomingBills.length} bill${upcomingBills.length > 1 ? "s" : ""} due within 7 days`,
          sub:   `€${Math.round(total)} total`,
          href:  "/finance",
          level: "medium",
        });
      }

      // Check-in not done
      const checkinDone = (ci as { checkin?: { completed?: boolean } | null }).checkin?.completed;
      if (!checkinDone) {
        built.push({ icon: "💬", text: "Daily check-in pending", sub: "Log your mood & energy", href: "/", level: "low" });
      }

      setAlerts(built.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="card at-card">
      <div className="at-header">
        <div className="card-eyebrow">🔔 Attention Required</div>
        <div className="at-count">{loading ? "…" : alerts.length === 0 ? "All clear" : `${alerts.length} item${alerts.length > 1 ? "s" : ""}`}</div>
      </div>

      {loading && <div className="kpi-skeleton" style={{ height: 100 }} />}

      {!loading && alerts.length === 0 && (
        <div className="at-clear">
          <div className="at-clear-icon">✅</div>
          <div className="at-clear-text">Nothing urgent — you&apos;re on top of everything</div>
        </div>
      )}

      {!loading && alerts.length > 0 && (
        <div className="at-list">
          {alerts.map((a, i) => (
            <Link key={i} href={a.href} className={`at-item at-item-${a.level}`}>
              <span className="at-icon">{a.icon}</span>
              <div className="at-body">
                <div className="at-text">{a.text}</div>
                {a.sub && <div className="at-sub">{a.sub}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
