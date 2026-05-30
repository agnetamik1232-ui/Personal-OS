"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { CheckinStats } from "@/lib/checkin/types";

function scoreColor(s: number) {
  if (s >= 7) return "#16a34a";
  if (s >= 5) return "#d97706";
  return "#dc2626";
}

function pctColor(p: number) {
  if (p >= 75) return "#16a34a";
  if (p >= 50) return "#d97706";
  return "#dc2626";
}

export function HealthSnapshotCard() {
  const [stats,   setStats]   = useState<CheckinStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`/api/checkin/stats`)
      .then(r => r.json() as Promise<{ stats?: CheckinStats }>)
      .then(d => { if (d.stats) setStats(d.stats); })
      .catch(() => {/* silent */})
      .finally(() => setLoading(false));
  }, []);

  const healthScore = stats
    ? Math.round(((stats.avgMood ?? 5) + (stats.avgEnergy ?? 5) + (stats.avgSleepQual ?? 5)) / 3 * 10)
    : null;

  return (
    <Link href="/" className="card hs-card card-link-wrap">
      <div className="hs-header">
        <div className="card-eyebrow">💚 Health Snapshot</div>
        {healthScore !== null && (
          <div className="hs-score" style={{ color: pctColor(healthScore) }}>
            {healthScore}<span className="hs-score-max">/100</span>
          </div>
        )}
      </div>

      {loading && <div className="kpi-skeleton" style={{ height: 100, marginTop: 10 }} />}

      {!loading && !stats && (
        <div className="hs-empty">Complete check-ins to see health trends</div>
      )}

      {!loading && stats && (
        <div className="hs-grid">
          {stats.avgMood !== null && (
            <div className="hs-stat">
              <div className="hs-stat-icon">😊</div>
              <div className="hs-stat-val" style={{ color: scoreColor(stats.avgMood) }}>{stats.avgMood}</div>
              <div className="hs-stat-label">Avg Mood</div>
            </div>
          )}
          {stats.avgEnergy !== null && (
            <div className="hs-stat">
              <div className="hs-stat-icon">⚡</div>
              <div className="hs-stat-val" style={{ color: scoreColor(stats.avgEnergy) }}>{stats.avgEnergy}</div>
              <div className="hs-stat-label">Energy</div>
            </div>
          )}
          {stats.avgSleep !== null && (
            <div className="hs-stat">
              <div className="hs-stat-icon">😴</div>
              <div className="hs-stat-val" style={{ color: stats.avgSleep >= 7 ? "#16a34a" : stats.avgSleep >= 6 ? "#d97706" : "#dc2626" }}>
                {stats.avgSleep}h
              </div>
              <div className="hs-stat-label">Avg Sleep</div>
            </div>
          )}
          {stats.workoutPct !== null && (
            <div className="hs-stat">
              <div className="hs-stat-icon">💪</div>
              <div className="hs-stat-val" style={{ color: pctColor(stats.workoutPct) }}>{stats.workoutPct}%</div>
              <div className="hs-stat-label">Workout</div>
            </div>
          )}
          {stats.latestWeight !== null && (
            <div className="hs-stat">
              <div className="hs-stat-icon">⚖️</div>
              <div className="hs-stat-val">{stats.latestWeight}kg</div>
              <div className="hs-stat-label">Weight</div>
            </div>
          )}
          {stats.currentStreak > 0 && (
            <div className="hs-stat">
              <div className="hs-stat-icon">🔥</div>
              <div className="hs-stat-val" style={{ color: "#f97316" }}>{stats.currentStreak}</div>
              <div className="hs-stat-label">Streak</div>
            </div>
          )}
        </div>
      )}

      {!loading && stats && stats.totalCheckins > 0 && (
        <div className="hs-footer">{stats.totalCheckins} check-ins logged</div>
      )}
    </Link>
  );
}
