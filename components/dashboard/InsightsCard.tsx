"use client";

import { useState, useEffect } from "react";
import type { FinSummary, FinInsight } from "@/lib/finance/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface InsightItem {
  type: FinInsight["type"];
  text: string;
}

function icon(type: InsightItem["type"]) {
  if (type === "positive") return "✅";
  if (type === "warning")  return "⚠️";
  if (type === "negative") return "❌";
  return "💡";
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function InsightsCard() {
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    void Promise.all([
      fetch("/api/finance/summary").then(r => r.json() as Promise<{ summary?: FinSummary }>),
      fetch(`/api/habits/${todayKey()}`).then(r => r.json() as Promise<{ done?: string[]; total?: number }>),
      fetch("/api/tasks?status=open&limit=200").then(r => r.json() as Promise<{ tasks?: { due_date?: string | null; completed_at?: string | null }[] }>),
    ]).then(([fin, hab, tx]) => {
      const all: InsightItem[] = [];

      // Finance insights
      if (fin.summary?.insights) {
        for (const ins of fin.summary.insights.slice(0, 3)) {
          all.push({ type: ins.type, text: ins.text });
        }
      }

      // Habits insight
      if (hab.done !== undefined && hab.total) {
        const pct = Math.round((hab.done.length / hab.total) * 100);
        if (pct === 100) {
          all.push({ type: "positive", text: "All habits completed today 🎉" });
        } else if (pct >= 50) {
          all.push({ type: "neutral", text: `${hab.done.length} of ${hab.total} habits done today (${pct}%)` });
        } else {
          all.push({ type: "warning", text: `Only ${pct}% of habits done — still time to catch up` });
        }
      }

      // Tasks insight
      if (tx.tasks) {
        const today = todayKey();
        const now   = new Date();
        const overdue = tx.tasks.filter(t => {
          if (!t.due_date || t.completed_at) return false;
          return new Date(t.due_date) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }).length;
        const dueToday = tx.tasks.filter(t => t.due_date === today).length;

        if (overdue > 0) {
          all.push({ type: "warning", text: `${overdue} overdue task${overdue > 1 ? "s" : ""} need attention` });
        } else if (dueToday === 0) {
          all.push({ type: "positive", text: "No tasks due today — great runway for deep work" });
        } else {
          all.push({ type: "neutral", text: `${dueToday} task${dueToday > 1 ? "s" : ""} due today` });
        }
      }

      setInsights(all.slice(0, 6));
    }).catch(() => {
      /* silent */
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="card card-butter ins-card">
      <div className="card-head">
        <div>
          <div className="card-eyebrow">✨ AI Insights</div>
          <h3 className="card-title">Your personal life analyst</h3>
        </div>
      </div>

      {loading && (
        <div className="ins-list">
          {[0, 1, 2].map(i => (
            <div key={i} className="ins-skeleton" style={{ opacity: 1 - i * 0.3 }} />
          ))}
        </div>
      )}

      {!loading && insights.length === 0 && (
        <div className="ins-empty">
          Add transactions, habits and goals to see insights here.
        </div>
      )}

      {!loading && insights.length > 0 && (
        <div className="ins-list">
          {insights.map((ins, i) => (
            <div key={i} className={`ins-row ins-row-${ins.type}`}>
              <span className="ins-icon">{icon(ins.type)}</span>
              <span className="ins-text">{ins.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
