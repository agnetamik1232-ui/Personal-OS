"use client";

import { useState, useEffect } from "react";
import type { DayLog, NutritionResponse } from "@/app/api/nutrition/route";
import type { Meal } from "@/components/dashboard/NutritionCard";
import { WeightSection } from "./WeightSection";

// ── Constants ─────────────────────────────────────────────────────────────────

const KCAL_GOAL = 1675;  // fat-loss target (PCOS plan: 1600–1750 kcal)
const P_GOAL    = 163;   // g — 1.9g/kg body weight
const C_GOAL    = 150;   // g — moderate carb for PCOS insulin sensitivity
const F_GOAL    = 60;    // g — hormone-supportive fats

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short", month: "short", day: "numeric", timeZone: "Europe/Vilnius",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function pctBar(value: number, goal: number, color: string) {
  const pct = Math.min(100, goal > 0 ? (value / goal) * 100 : 0);
  const over = value > goal;
  return (
    <div className="hlth-bar-wrap" title={`${Math.round(value)} / ${goal}`}>
      <div
        className="hlth-bar-fill"
        style={{ width: `${pct}%`, background: over ? "#B85C5C" : color }}
      />
    </div>
  );
}

// ── Meal expandable list ──────────────────────────────────────────────────────

function MealList({ meals }: { meals: Meal[] }) {
  if (meals.length === 0) return <p className="hlth-no-meals">No meals logged.</p>;
  return (
    <div className="hlth-meal-list">
      {meals.map((m) => (
        <div key={m.id} className="hlth-meal-row">
          <span className="hlth-meal-time">{m.t}</span>
          <span className="hlth-meal-name">
            {m.n}
            {m.estimated && <span className="hlth-est"> est.</span>}
          </span>
          <span className="hlth-meal-num">{Math.round(m.kcal)}</span>
          <span className="hlth-meal-num">{Math.round(m.p)}g</span>
          <span className="hlth-meal-num">{Math.round(m.c)}g</span>
          <span className="hlth-meal-num">{Math.round(m.f)}g</span>
        </div>
      ))}
    </div>
  );
}

// ── Average row ───────────────────────────────────────────────────────────────

function AverageRow({ logs }: { logs: Record<string, DayLog> }) {
  const activeDays = Object.values(logs).filter((d) => d.meals.length > 0);
  if (activeDays.length === 0) return null;

  const avg = activeDays.reduce(
    (acc, d) => ({ kcal: acc.kcal + d.kcal, p: acc.p + d.p, c: acc.c + d.c, f: acc.f + d.f }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );
  const n = activeDays.length;
  const a = { kcal: avg.kcal / n, p: avg.p / n, c: avg.c / n, f: avg.f / n };

  const proteinGap = Math.round(P_GOAL - a.p);
  const kcalStatus = a.kcal < 1500 ? "low" : a.kcal > 1800 ? "high" : "ok";

  return (
    <div className="hlth-avg-block">
      <div className="hlth-avg-label">
        Averages <span className="hlth-avg-sub">({n} day{n !== 1 ? "s" : ""} logged)</span>
      </div>
      {kcalStatus === "low" && (
        <div className="hlth-avg-alert hlth-alert-warn">⚠️ Average calories below 1,500 — too low for PCOS. Risk of metabolic slowdown. Aim for 1,600–1,750 kcal.</div>
      )}
      {kcalStatus === "high" && (
        <div className="hlth-avg-alert hlth-alert-info">📊 Average calories above 1,800 — slightly above your fat loss target of 1,675 kcal. Try to reduce by 100–200 kcal.</div>
      )}
      {proteinGap > 20 && (
        <div className="hlth-avg-alert hlth-alert-protein">🥩 Protein gap: {proteinGap}g below target. Add a protein shake, Greek yoghurt, or extra chicken to close this gap.</div>
      )}
      <div className="hlth-avg-stats">
        <div className="hlth-avg-stat">
          <span className="hlth-avg-val">{Math.round(a.kcal).toLocaleString()}</span>
          <span className="hlth-avg-key">kcal / day</span>
          {pctBar(a.kcal, KCAL_GOAL, "#1C1A17")}
        </div>
        <div className="hlth-avg-stat">
          <span className="hlth-avg-val">{Math.round(a.p)}g</span>
          <span className="hlth-avg-key">protein</span>
          {pctBar(a.p, P_GOAL, "#B85C5C")}
        </div>
        <div className="hlth-avg-stat">
          <span className="hlth-avg-val">{Math.round(a.c)}g</span>
          <span className="hlth-avg-key">carbs</span>
          {pctBar(a.c, C_GOAL, "#C99C4A")}
        </div>
        <div className="hlth-avg-stat">
          <span className="hlth-avg-val">{Math.round(a.f)}g</span>
          <span className="hlth-avg-key">fat</span>
          {pctBar(a.f, F_GOAL, "#7A8F6B")}
        </div>
      </div>
    </div>
  );
}

// ── Main board ────────────────────────────────────────────────────────────────

export function HealthBoard() {
  const [logs,    setLogs]    = useState<Record<string, DayLog>>({});
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [days,    setDays]    = useState(30);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/nutrition?days=${days}`)
      .then((r) => r.json() as Promise<NutritionResponse & { error?: string }>)
      .then((j) => {
        if (j.error) { setError(j.error); return; }
        setLogs(j.logs);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Network error"))
      .finally(() => setLoading(false));
  }, [days]);

  // Build sorted list of date keys (desc) for the window, filling in empty days
  const dateKeys = (() => {
    const keys: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      keys.push(d.toISOString().split("T")[0]!);
    }
    return keys;
  })();

  return (
    <div className="hlth-board">
      {/* Weight section — always shown, uses its own days prop */}
      <WeightSection days={Math.max(days, 30)} />

      {/* Fitness plan goals reminder */}
      <div className="hlth-fitness-banner">
        <div className="hlth-fb-title">🎯 Your Fat Loss Targets</div>
        <div className="hlth-fb-goals">
          <div className="hlth-fb-goal">
            <span className="hlth-fb-val">1,600–1,750</span>
            <span className="hlth-fb-key">kcal / day</span>
          </div>
          <div className="hlth-fb-sep" />
          <div className="hlth-fb-goal">
            <span className="hlth-fb-val">155–170g</span>
            <span className="hlth-fb-key">protein / day</span>
          </div>
          <div className="hlth-fb-sep" />
          <div className="hlth-fb-goal">
            <span className="hlth-fb-val">130–170g</span>
            <span className="hlth-fb-key">carbs / day</span>
          </div>
          <div className="hlth-fb-sep" />
          <div className="hlth-fb-goal">
            <span className="hlth-fb-val">55–65g</span>
            <span className="hlth-fb-key">fat / day</span>
          </div>
          <div className="hlth-fb-sep" />
          <div className="hlth-fb-goal">
            <span className="hlth-fb-val">10,000</span>
            <span className="hlth-fb-key">steps / day</span>
          </div>
        </div>
        <div className="hlth-fb-tips">
          <span>💡 Never go below 1,500 kcal — this crashes metabolism and worsens PCOS</span>
          <span>·</span>
          <span>🥩 Protein keeps muscle while you lose fat — hit 155g+ on rest days too</span>
          <span>·</span>
          <span>🍚 Eat your biggest carb meal around your workout</span>
        </div>
      </div>

      <div className="hlth-section-divider" />

      {/* Page header */}
      <div className="hlth-header">
        <div>
          <p className="hlth-eyebrow">Health</p>
          <h1 className="hlth-title">Nutrition log</h1>
        </div>
        <div className="hlth-range-tabs">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              className={`hlth-range-tab${days === d ? " hlth-range-tab-active" : ""}`}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Averages */}
      {!loading && !error && <AverageRow logs={logs} />}

      {/* Table */}
      {loading && <div className="hlth-loading">Loading…</div>}
      {error   && <div className="hlth-error">⚠ {error}</div>}

      {!loading && !error && (
        <div className="hlth-table">
          {/* Table header */}
          <div className="hlth-thead">
            <span>Date</span>
            <span className="hlth-col-num">kcal</span>
            <span className="hlth-col-num">protein</span>
            <span className="hlth-col-num">carbs</span>
            <span className="hlth-col-num">fat</span>
            <span className="hlth-col-num">meals</span>
          </div>

          {dateKeys.map((key) => {
            const log     = logs[key];
            const isEmpty = !log || log.meals.length === 0;
            const isOpen  = expanded === key;

            return (
              <div key={key} className={`hlth-row-wrap${isEmpty ? " hlth-row-empty" : ""}`}>
                <div
                  className={`hlth-row${isOpen ? " hlth-row-open" : ""}${isEmpty ? "" : " hlth-row-clickable"}`}
                  onClick={() => !isEmpty && setExpanded(isOpen ? null : key)}
                  role={isEmpty ? undefined : "button"}
                  tabIndex={isEmpty ? undefined : 0}
                  onKeyDown={(e) => { if (!isEmpty && (e.key === "Enter" || e.key === " ")) setExpanded(isOpen ? null : key); }}
                  aria-expanded={isEmpty ? undefined : isOpen}
                >
                  <span className="hlth-cell-date">
                    <span className={`hlth-chevron${isOpen ? " hlth-chevron-open" : ""}${isEmpty ? " hlth-chevron-hidden" : ""}`}>›</span>
                    {fmtDate(key)}
                  </span>

                  {isEmpty ? (
                    <>
                      <span className="hlth-cell-num hlth-cell-empty">—</span>
                      <span className="hlth-cell-num hlth-cell-empty">—</span>
                      <span className="hlth-cell-num hlth-cell-empty">—</span>
                      <span className="hlth-cell-num hlth-cell-empty">—</span>
                      <span className="hlth-cell-num hlth-cell-empty">0</span>
                    </>
                  ) : (
                    <>
                      <span className="hlth-cell-num">
                        {Math.round(log.kcal).toLocaleString()}
                        {pctBar(log.kcal, KCAL_GOAL, "#1C1A17")}
                      </span>
                      <span className="hlth-cell-num">
                        {Math.round(log.p)}g
                        {pctBar(log.p, P_GOAL, "#B85C5C")}
                      </span>
                      <span className="hlth-cell-num">
                        {Math.round(log.c)}g
                        {pctBar(log.c, C_GOAL, "#C99C4A")}
                      </span>
                      <span className="hlth-cell-num">
                        {Math.round(log.f)}g
                        {pctBar(log.f, F_GOAL, "#7A8F6B")}
                      </span>
                      <span className="hlth-cell-num hlth-cell-meals">{log.meals.length}</span>
                    </>
                  )}
                </div>

                {/* Expanded meal detail */}
                {isOpen && log && (
                  <div className="hlth-detail">
                    <div className="hlth-detail-head">
                      <span>Time</span>
                      <span>Meal</span>
                      <span className="hlth-col-num">kcal</span>
                      <span className="hlth-col-num">P</span>
                      <span className="hlth-col-num">C</span>
                      <span className="hlth-col-num">F</span>
                    </div>
                    <MealList meals={log.meals} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
