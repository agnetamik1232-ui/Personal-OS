"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { GoalsResponse } from "@/app/api/goals/route";
import type { CheckinStats } from "@/lib/checkin/types";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function scoreColor(s: number) {
  if (s >= 80) return "#16a34a";
  if (s >= 60) return "#d97706";
  return "#dc2626";
}

function scoreLabel(s: number) {
  if (s >= 90) return "Excellent";
  if (s >= 75) return "Great";
  if (s >= 60) return "Good";
  if (s >= 45) return "Fair";
  return "Needs Attention";
}

function Ring({ score, size = 80 }: { score: number; size?: number }) {
  const stroke = 6;
  const r      = (size - stroke) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(score / 100, 1));
  const color  = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
    </svg>
  );
}

interface Pillar { label: string; score: number; icon: string }

export function MomentumCard() {
  const [score,   setScore]   = useState<number | null>(null);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = todayKey();
    void Promise.all([
      fetch(`/api/habits/${today}`).then(r => r.json() as Promise<{ done?: string[]; total?: number }>).catch(() => ({})),
      fetch(`/api/checkin/stats`).then(r => r.json() as Promise<{ stats?: CheckinStats }>).catch(() => ({ stats: undefined })),
      fetch(`/api/checkin?date=${today}`).then(r => r.json() as Promise<{ checkin?: { mood?: number | null; energy?: number | null; completed?: boolean } | null }>).catch(() => ({})),
      fetch(`/api/goals`).then(r => r.json() as Promise<GoalsResponse>).catch(() => ({ week: [], month: [] })),
      fetch(`/api/tasks?status=open&limit=200`).then(r => r.json() as Promise<{ tasks?: { due_date?: string | null; completed_at?: string | null }[] }>).catch(() => ({})),
      fetch(`/api/finance/summary`).then(r => r.json() as Promise<{ summary?: { health_score?: number } }>).catch(() => ({})),
    ]).then(([hab, ciStats, ci, goals, tx, fin]) => {
      // Habits score
      const habDone  = (hab as { done?: string[] }).done?.length ?? 0;
      const habTotal = (hab as { total?: number }).total ?? 5;
      const habitScore = habTotal > 0 ? Math.round((habDone / habTotal) * 100) : 50;

      // Health score from today's check-in
      const ciData  = (ci as { checkin?: { mood?: number | null; energy?: number | null; completed?: boolean } | null }).checkin;
      const mood    = ciData?.mood ?? null;
      const energy  = ciData?.energy ?? null;
      let healthScore = 50;
      const ciStatsData = (ciStats as { stats?: CheckinStats }).stats;
      if (mood !== null && energy !== null) {
        healthScore = Math.round(((mood + energy) / 2) * 10);
      } else if (ciStatsData) {
        const avgM = ciStatsData.avgMood ?? 5;
        const avgE = ciStatsData.avgEnergy ?? 5;
        healthScore = Math.round(((avgM + avgE) / 2) * 10);
      }

      // Goals score
      const weekGoals = (goals as GoalsResponse).week ?? [];
      const goalScore = weekGoals.length > 0
        ? Math.round((weekGoals.filter(g => g.done).length / weekGoals.length) * 100)
        : 50;

      // Tasks score
      const now   = new Date();
      const today2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tasks = (tx as { tasks?: { due_date?: string | null; completed_at?: string | null }[] }).tasks ?? [];
      const overdue = tasks.filter(t => t.due_date && !t.completed_at && new Date(t.due_date) < today2).length;
      const taskScore = Math.max(0, 100 - overdue * 20);

      // Finance score
      const finScore = (fin as { summary?: { health_score?: number } }).summary?.health_score ?? 50;

      const ps: Pillar[] = [
        { label: "Habits",  score: habitScore, icon: "🔁" },
        { label: "Health",  score: healthScore, icon: "💚" },
        { label: "Goals",   score: goalScore,  icon: "🎯" },
        { label: "Tasks",   score: taskScore,  icon: "✅" },
        { label: "Finance", score: finScore,   icon: "💰" },
      ];

      const momentum = Math.round(
        habitScore * 0.25 + healthScore * 0.25 + goalScore * 0.20 + taskScore * 0.15 + finScore * 0.15
      );

      setScore(momentum);
      setPillars(ps);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="card mm-card">
      <div className="mm-header">
        <div>
          <div className="card-eyebrow">⚡ Daily Momentum</div>
          <div className="mm-label">{score !== null ? scoreLabel(score) : "Calculating…"}</div>
        </div>
        {!loading && score !== null && (
          <div className="mm-ring-wrap">
            <div className="mm-ring-inner">
              <Ring score={score} size={80} />
              <div className="mm-ring-score" style={{ color: scoreColor(score) }}>{score}</div>
            </div>
          </div>
        )}
        {loading && <div className="kpi-skeleton mm-ring-skeleton" />}
      </div>

      {!loading && pillars.length > 0 && (
        <div className="mm-pillars">
          {pillars.map(p => (
            <div key={p.label} className="mm-pillar">
              <div className="mm-pillar-top">
                <span>{p.icon} {p.label}</span>
                <span style={{ color: scoreColor(p.score), fontWeight: 600 }}>{p.score}</span>
              </div>
              <div className="mm-bar-track">
                <div className="mm-bar-fill" style={{ width: `${p.score}%`, background: scoreColor(p.score) }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Link href="/habits" className="mm-link">View details →</Link>
    </div>
  );
}
