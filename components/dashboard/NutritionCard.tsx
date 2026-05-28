"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { IconLeaf }   from "@/components/ui/Icon";
import { localDateKey } from "@/lib/utils/localDate";

// ── Types ────────────────────────────────────────────────────────────────────

export interface Meal {
  id:        string;
  t:         string;   // HH:MM
  n:         string;   // name
  kcal:      number;
  p:         number;   // protein g
  c:         number;   // carbs g
  f:         number;   // fat g
  estimated: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const KCAL_GOAL = 2100;
const P_GOAL    = 140;  // g
const C_GOAL    = 220;  // g
const F_GOAL    = 70;   // g
const WATER_GOAL = 8;

const RING_R = 42;
const RING_C = 2 * Math.PI * RING_R;

// ── Helpers ───────────────────────────────────────────────────────────────────

function lsKey(dateKey: string) {
  return `miles-nutrition-${dateKey}`;
}

function waterKey(dateKey: string) {
  return `miles-water-${dateKey}`;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function kcalFromMacros(p: number, c: number, f: number): number {
  return Math.round(4 * p + 4 * c + 9 * f);
}

function nowTime(): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Vilnius",
  }).format(new Date());
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface MacroRowProps {
  label: string;
  value: number;
  goal:  number;
  color: string;
  unit?: string;
}
function MacroRow({ label, value, goal, color, unit = "g" }: MacroRowProps) {
  const pct = Math.min(100, goal > 0 ? (value / goal) * 100 : 0);
  return (
    <div className="macro">
      <span className="macro-name">{label}</span>
      <div className="macro-bar">
        <div className="macro-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="macro-val">{Math.round(value)}/{goal}{unit}</span>
    </div>
  );
}

// ── Meal row with inline editor ───────────────────────────────────────────────

interface MealRowProps {
  meal:         Meal;
  isEditing:    boolean;
  onSelect:     () => void;
  onClose:      () => void;
  onUpdate:     (updated: Meal) => void;
  onDelete:     (id: string) => void;
}

function MealRow({ meal, isEditing, onSelect, onClose, onUpdate, onDelete }: MealRowProps) {
  const [draft, setDraft]           = useState<Meal>(meal);
  const [redistributing, setRedist] = useState(false);
  const redistTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync draft when meal changes externally (e.g. optimistic update)
  useEffect(() => { setDraft(meal); }, [meal]);

  function setField<K extends keyof Meal>(k: K, v: Meal[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  // When a macro changes → recompute kcal instantly
  function handleMacroChange(k: "p" | "c" | "f", raw: string) {
    const val = parseFloat(raw) || 0;
    setDraft((d) => {
      const next = { ...d, [k]: val };
      next.kcal  = kcalFromMacros(next.p, next.c, next.f);
      return next;
    });
  }

  // When kcal changes → debounce 600ms then redistribute
  function handleKcalChange(raw: string) {
    const val = parseFloat(raw) || 0;
    setDraft((d) => ({ ...d, kcal: val }));

    if (redistTimer.current) clearTimeout(redistTimer.current);
    redistTimer.current = setTimeout(() => {
      void redistribute(draft.n || meal.n, val);
    }, 600);
  }

  async function redistribute(name: string, kcal: number) {
    if (!name.trim() || kcal <= 0) return;
    setRedist(true);
    try {
      const res  = await fetch("/api/nutrition/redistribute", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, kcal }),
      });
      const json = await res.json() as { p?: number; c?: number; f?: number; error?: string };
      if (res.ok && json.p != null) {
        setDraft((d) => ({
          ...d,
          kcal,
          p: Math.round(json.p!),
          c: Math.round(json.c!),
          f: Math.round(json.f!),
        }));
      }
    } finally {
      setRedist(false);
    }
  }

  function save() {
    onUpdate({ ...draft });
    onClose();
  }

  if (!isEditing) {
    return (
      <div className="meal" onClick={onSelect} style={{ cursor: "pointer" }}>
        <span className="meal-time">{meal.t}</span>
        <div className="meal-name">
          {meal.n || <span className="meal-sub">Unnamed</span>}
          <span className="meal-sub">
            P {meal.p}g · C {meal.c}g · F {meal.f}g
            {meal.estimated && <span className="nut-est-badge"> · est.</span>}
          </span>
        </div>
        <span className="meal-kcal">{meal.kcal} kcal</span>
      </div>
    );
  }

  return (
    <div className="nut-meal-editor">
      <div className="nut-editor-row">
        <input
          className="nut-input nut-input-time"
          type="time"
          value={draft.t}
          onChange={(e) => setField("t", e.target.value)}
        />
        <input
          className="nut-input nut-input-name"
          value={draft.n}
          onChange={(e) => setField("n", e.target.value)}
          placeholder="Meal name"
        />
      </div>
      <div className="nut-editor-macros">
        <label className="nut-macro-field">
          <span>kcal</span>
          <input
            className="nut-input nut-input-num"
            type="number"
            value={draft.kcal}
            onChange={(e) => handleKcalChange(e.target.value)}
            min={0}
          />
          {redistributing && <span className="nut-spin">↻</span>}
        </label>
        <label className="nut-macro-field">
          <span>P g</span>
          <input className="nut-input nut-input-num" type="number" value={draft.p}
            onChange={(e) => handleMacroChange("p", e.target.value)} min={0} />
        </label>
        <label className="nut-macro-field">
          <span>C g</span>
          <input className="nut-input nut-input-num" type="number" value={draft.c}
            onChange={(e) => handleMacroChange("c", e.target.value)} min={0} />
        </label>
        <label className="nut-macro-field">
          <span>F g</span>
          <input className="nut-input nut-input-num" type="number" value={draft.f}
            onChange={(e) => handleMacroChange("f", e.target.value)} min={0} />
        </label>
      </div>
      <div className="nut-editor-footer">
        <button className="nut-del-btn" onClick={() => { onDelete(meal.id); onClose(); }}>Delete</button>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="nut-cancel-btn" onClick={onClose}>Cancel</button>
          <button className="nut-save-btn" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function NutritionCard() {
  const todayKey              = localDateKey();
  const [meals, setMeals]     = useState<Meal[]>([]);
  const [water, setWater]     = useState(0);
  const [editId, setEditId]   = useState<string | null>(null);
  const [addText, setAddText] = useState("");
  const [adding, setAdding]   = useState(false);
  const [addErr, setAddErr]   = useState<string | null>(null);
  const syncTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load from localStorage on mount ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(lsKey(todayKey));
      if (raw) setMeals(JSON.parse(raw) as Meal[]);
      const w = localStorage.getItem(waterKey(todayKey));
      if (w) setWater(parseInt(w, 10));
    } catch { /* ignore */ }
  }, [todayKey]);

  // ── Persist meals to localStorage + debounce Supabase sync ──
  const persist = useCallback((next: Meal[]) => {
    localStorage.setItem(lsKey(todayKey), JSON.stringify(next));
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      void fetch(`/api/nutrition/${todayKey}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ meals: next }),
      });
    }, 1200);
  }, [todayKey]);

  function saveMeals(next: Meal[]) {
    setMeals(next);
    persist(next);
  }

  function updateMeal(updated: Meal) {
    saveMeals(meals.map((m) => m.id === updated.id ? updated : m));
  }

  function deleteMeal(id: string) {
    saveMeals(meals.filter((m) => m.id !== id));
  }

  // ── Water ──
  function handleWater(i: number) {
    const next = i < water ? i : i + 1;
    setWater(next);
    localStorage.setItem(waterKey(todayKey), String(next));
  }

  // ── Add meal via estimate ──
  async function handleAdd() {
    if (!addText.trim()) return;
    setAdding(true);
    setAddErr(null);
    try {
      const res  = await fetch("/api/nutrition/estimate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: addText.trim() }),
      });
      const json = await res.json() as { kcal?: number; p?: number; c?: number; f?: number; error?: string };
      if (!res.ok) { setAddErr(json.error ?? "Estimate failed"); return; }
      const meal: Meal = {
        id:        uid(),
        t:         nowTime(),
        n:         addText.trim(),
        kcal:      json.kcal ?? 0,
        p:         json.p    ?? 0,
        c:         json.c    ?? 0,
        f:         json.f    ?? 0,
        estimated: true,
      };
      const next = [...meals, meal];
      saveMeals(next);
      setAddText("");
      setEditId(meal.id); // open editor immediately so user can tweak
    } catch {
      setAddErr("Network error");
    } finally {
      setAdding(false);
    }
  }

  // ── Totals ──
  const total = meals.reduce(
    (acc, m) => ({ kcal: acc.kcal + m.kcal, p: acc.p + m.p, c: acc.c + m.c, f: acc.f + m.f }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );
  const pct = Math.min(1, total.kcal / KCAL_GOAL);

  return (
    <div className="card card-butter">
      <svg className="card-deco" style={{ right: -30, bottom: -30, width: 160, height: 160 }} viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="50" fill="rgba(28,26,23,0.03)"/>
        <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(28,26,23,0.05)" strokeWidth="1"/>
      </svg>

      <div className="card-head">
        <div>
          <div className="card-eyebrow"><IconLeaf size={12} /> Nutrition · Today</div>
          <h3 className="card-title">
            {total.kcal === 0
              ? `Goal: ${KCAL_GOAL.toLocaleString()} kcal`
              : `${total.kcal.toLocaleString()} / ${KCAL_GOAL.toLocaleString()} kcal`}
          </h3>
        </div>
      </div>

      {/* Calorie ring + macro bars */}
      <div className="nut-top">
        <div className="cal-ring-wrap" aria-label={`${total.kcal} of ${KCAL_GOAL} kcal`}>
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
              <div className="cal-ring-val">{total.kcal.toLocaleString()}</div>
              <div className="cal-ring-lbl">of {KCAL_GOAL}</div>
            </div>
          </div>
        </div>

        <div className="nut-macros">
          <MacroRow label="Protein" value={total.p} goal={P_GOAL} color="#B85C5C" />
          <MacroRow label="Carbs"   value={total.c} goal={C_GOAL} color="#C99C4A" />
          <MacroRow label="Fat"     value={total.f} goal={F_GOAL} color="#7A8F6B" />
        </div>
      </div>

      {/* Water tracker */}
      <div className="water">
        <div className="water-top">
          <span className="water-label">
            <span aria-hidden style={{ fontSize: 14 }}>💧</span> Hydration
          </span>
          <span className="water-count">{water}/{WATER_GOAL} · {water * 250} ml</span>
        </div>
        <div className="water-glasses" role="group" aria-label="Water intake tracker">
          {Array.from({ length: WATER_GOAL }).map((_, i) => (
            <button
              key={i}
              className={`glass${i < water ? " glass-full" : ""}`}
              onClick={() => handleWater(i)}
              aria-label={`Glass ${i + 1}${i < water ? " — filled" : ""}`}
              aria-pressed={i < water}
            />
          ))}
        </div>
      </div>

      {/* Meal list */}
      <div className="meals">
        {meals.length === 0 && (
          <p className="nut-empty">No meals logged yet — add one below.</p>
        )}
        {meals.map((m) => (
          <MealRow
            key={m.id}
            meal={m}
            isEditing={editId === m.id}
            onSelect={() => setEditId(m.id)}
            onClose={() => setEditId(null)}
            onUpdate={updateMeal}
            onDelete={deleteMeal}
          />
        ))}
      </div>

      {/* Add meal input */}
      <div className="nut-add">
        <input
          className="nut-add-input"
          value={addText}
          onChange={(e) => setAddText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); }}
          placeholder="What did you eat? e.g. oat porridge with banana"
          disabled={adding}
        />
        <button
          className="nut-add-btn"
          onClick={() => void handleAdd()}
          disabled={adding || !addText.trim()}
        >
          {adding ? "…" : "+"}
        </button>
      </div>
      {addErr && <p className="nut-add-err">{addErr}</p>}
    </div>
  );
}
