"use client";

import { useState, useEffect } from "react";
import type { CheckinStats } from "@/lib/checkin/types";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Win { emoji: string; headline: string; sub: string }

export function BiggestWinCard() {
  const [win,     setWin]     = useState<Win | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = todayKey();
    void Promise.all([
      fetch(`/api/checkin?date=${today}`).then(r => r.json() as Promise<{ checkin?: { biggest_win?: string | null; completed?: boolean } | null }>).catch(() => ({})),
      fetch(`/api/checkin/stats`).then(r => r.json() as Promise<{ stats?: CheckinStats }>).catch(() => ({})),
      fetch(`/api/habits/${today}`).then(r => r.json() as Promise<{ done?: string[]; total?: number }>).catch(() => ({})),
    ]).then(([ci, ciStats, hab]) => {
      const ciData  = (ci as { checkin?: { biggest_win?: string | null; completed?: boolean } | null }).checkin;
      const stats   = (ciStats as { stats?: CheckinStats }).stats;
      const habDone = (hab as { done?: string[] }).done?.length ?? 0;
      const habTotal = (hab as { total?: number }).total ?? 5;

      // Priority 1: today's self-reported win
      if (ciData?.completed && ciData.biggest_win) {
        setWin({ emoji: "🏆", headline: ciData.biggest_win, sub: "Today's biggest win" });
        return;
      }

      // Priority 2: check-in streak
      if (stats?.currentStreak && stats.currentStreak >= 3) {
        setWin({
          emoji: "🔥",
          headline: `${stats.currentStreak}-day check-in streak`,
          sub: "Consistency is your superpower",
        });
        return;
      }

      // Priority 3: all habits done
      if (habTotal > 0 && habDone >= habTotal) {
        setWin({ emoji: "⚡", headline: "All habits complete today", sub: "Building momentum" });
        return;
      }

      // Priority 4: good mood from stats
      if (stats?.avgMood && stats.avgMood >= 7) {
        setWin({
          emoji: "😊",
          headline: `Avg mood ${stats.avgMood}/10 this month`,
          sub: "You're in a great place",
        });
        return;
      }

      // Default positive
      setWin({ emoji: "🌟", headline: "Keep showing up", sub: "Every day of effort counts" });
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="card bw-card">
      <div className="card-eyebrow">🎉 Biggest Win</div>
      {loading && <div className="kpi-skeleton" style={{ height: 60, marginTop: 10 }} />}
      {!loading && win && (
        <div className="bw-body">
          <div className="bw-emoji">{win.emoji}</div>
          <div className="bw-content">
            <div className="bw-headline">{win.headline}</div>
            <div className="bw-sub">{win.sub}</div>
          </div>
        </div>
      )}
    </div>
  );
}
