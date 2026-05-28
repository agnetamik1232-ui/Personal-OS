"use client";

import { useState } from "react";
import { IconLeaf } from "@/components/ui/Icon";

const KCAL = 1420;
const KCAL_GOAL = 2100;
const RING_R = 42;
const RING_C = 2 * Math.PI * RING_R;

const MACROS = [
  { name: "Protein", v: 92,  goal: 140, color: "#B85C5C" },
  { name: "Carbs",   v: 168, goal: 220, color: "#C99C4A" },
  { name: "Fat",     v: 48,  goal: 70,  color: "#7A8F6B" },
  { name: "Fiber",   v: 22,  goal: 35,  color: "#6B7A8F" },
] as const;

const MEALS = [
  { time: "07:20", name: "Greek yogurt + berries", sub: "oats, almond, blueberry", kcal: 380,  pending: false },
  { time: "12:40", name: "Grain bowl, salmon",     sub: "quinoa, kale, miso",      kcal: 620,  pending: false },
  { time: "15:30", name: "Apple + almond butter",  sub: "snack",                   kcal: 220,  pending: false },
  { time: "19:30", name: "Dinner — planned",        sub: "roast chicken, greens",   kcal: 540,  pending: true  },
] as const;

const WATER_GOAL = 8;

export function NutritionCard() {
  const [water, setWater] = useState(5);
  const pct = KCAL / KCAL_GOAL;

  return (
    <div className="card card-butter">
      <svg className="card-deco" style={{ right: -30, bottom: -30, width: 160, height: 160 }} viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="50" fill="rgba(28,26,23,0.03)"/>
        <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(28,26,23,0.05)" strokeWidth="1"/>
      </svg>

      <div className="card-head">
        <div>
          <div className="card-eyebrow"><IconLeaf size={12} /> Nutrition · Today</div>
          <h3 className="card-title">On track for {KCAL_GOAL.toLocaleString()}</h3>
        </div>
        <button className="card-action">Log</button>
      </div>

      {/* Calorie ring + macros */}
      <div className="nut-top">
        <div className="cal-ring-wrap" aria-label={`${KCAL} of ${KCAL_GOAL} kcal`}>
          <svg width="102" height="102" viewBox="0 0 102 102" aria-hidden>
            <circle cx="51" cy="51" r={RING_R} fill="none" stroke="rgba(28,26,23,0.10)" strokeWidth="7"/>
            <circle
              cx="51" cy="51" r={RING_R}
              fill="none"
              stroke="#1C1A17"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - pct)}
              transform="rotate(-90 51 51)"
            />
          </svg>
          <div className="cal-ring-inner">
            <div>
              <div className="cal-ring-val">{KCAL.toLocaleString()}</div>
              <div className="cal-ring-lbl">of {KCAL_GOAL}</div>
            </div>
          </div>
        </div>

        <div className="nut-macros">
          {MACROS.map((m) => (
            <div className="macro" key={m.name}>
              <span className="macro-name">{m.name}</span>
              <div className="macro-bar">
                <div
                  className="macro-fill"
                  style={{ width: `${Math.min(100, (m.v / m.goal) * 100)}%`, background: m.color }}
                />
              </div>
              <span className="macro-val">{m.v}/{m.goal}g</span>
            </div>
          ))}
        </div>
      </div>

      {/* Water */}
      <div className="water">
        <div className="water-top">
          <span className="water-label">
            <span aria-hidden style={{ fontSize: 14 }}>💧</span>
            Hydration
          </span>
          <span className="water-count">
            {water}/{WATER_GOAL} · {(water * 250).toLocaleString()} ml
          </span>
        </div>
        <div className="water-glasses" role="group" aria-label="Water intake tracker">
          {Array.from({ length: WATER_GOAL }).map((_, i) => (
            <button
              key={i}
              className={`glass${i < water ? " glass-full" : ""}`}
              onClick={() => setWater(i < water ? i : i + 1)}
              aria-label={`Glass ${i + 1}${i < water ? " — filled" : ""}`}
              aria-pressed={i < water}
            />
          ))}
        </div>
      </div>

      {/* Meals */}
      <div className="meals">
        {MEALS.map((m) => (
          <div className={`meal${m.pending ? " meal-pending" : ""}`} key={m.time}>
            <span className="meal-time">{m.time}</span>
            <div className="meal-name">
              {m.name}
              <span className="meal-sub">{m.sub}</span>
            </div>
            <span className="meal-kcal">{m.kcal} kcal</span>
          </div>
        ))}
      </div>
    </div>
  );
}
