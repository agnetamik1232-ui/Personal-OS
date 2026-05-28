"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { GoalItem, GoalsResponse } from "@/app/api/goals/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Single goal item ──────────────────────────────────────────────────────────

interface GoalRowProps {
  item:     GoalItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function GoalRow({ item, onToggle, onDelete }: GoalRowProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`goal-row${item.done ? " goal-row-done" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        className={`goal-check${item.done ? " goal-check-on" : ""}`}
        onClick={() => onToggle(item.id)}
        aria-label={item.done ? "Mark incomplete" : "Mark complete"}
        aria-pressed={item.done}
      >
        {item.done && <span aria-hidden>✓</span>}
      </button>
      <span className="goal-text">{item.text}</span>
      {hovered && (
        <button
          className="goal-del"
          onClick={() => onDelete(item.id)}
          aria-label="Delete goal"
        >×</button>
      )}
    </div>
  );
}

// ── Section (week or month) ───────────────────────────────────────────────────

interface SectionProps {
  label:    string;
  items:    GoalItem[];
  saving:   boolean;
  onChange: (items: GoalItem[]) => void;
}

function Section({ label, items, saving, onChange }: SectionProps) {
  const [draft, setDraft]   = useState("");
  const inputRef            = useRef<HTMLInputElement>(null);

  function toggle(id: string) {
    onChange(items.map((it) => it.id === id ? { ...it, done: !it.done } : it));
  }

  function del(id: string) {
    onChange(items.filter((it) => it.id !== id));
  }

  function add() {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, { id: uid(), text, done: false }]);
    setDraft("");
    inputRef.current?.focus();
  }

  const done  = items.filter((i) => i.done).length;
  const total = items.length;

  return (
    <div className="goals-section">
      <div className="goals-section-head">
        <span className="goals-section-label">{label}</span>
        {total > 0 && (
          <span className="goals-section-count">
            {done}/{total}
            {saving && <span className="goals-sync-dot" aria-label="Saving" />}
          </span>
        )}
      </div>

      <div className="goals-list">
        {items.length === 0 && (
          <p className="goals-empty">No goals yet — add one below.</p>
        )}
        {items.map((item) => (
          <GoalRow key={item.id} item={item} onToggle={toggle} onDelete={del} />
        ))}
      </div>

      <div className="goals-add-row">
        <input
          ref={inputRef}
          className="goals-add-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder="Add a goal…"
        />
        <button
          className="goals-add-btn"
          onClick={add}
          disabled={!draft.trim()}
          aria-label="Add goal"
        >+</button>
      </div>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function GoalsCard() {
  const [week,     setWeek]     = useState<GoalItem[]>([]);
  const [month,    setMonth]    = useState<GoalItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [savingW,  setSavingW]  = useState(false);
  const [savingM,  setSavingM]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const weekTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const monthTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch on mount ──
  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json() as Promise<GoalsResponse & { error?: string }>)
      .then((j) => {
        if (j.error) { setError(j.error); return; }
        setWeek(j.week);
        setMonth(j.month);
      })
      .catch(() => setError("Failed to load goals"))
      .finally(() => setLoading(false));
  }, []);

  // ── Debounced save ──
  const save = useCallback((scope: "week" | "month", items: GoalItem[]) => {
    const setSaving = scope === "week" ? setSavingW : setSavingM;
    const timer     = scope === "week" ? weekTimer  : monthTimer;
    setSaving(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fetch("/api/goals", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ scope, items }),
      })
        .catch(() => setError("Save failed"))
        .finally(() => setSaving(false));
    }, 800);
  }, []);

  function handleWeek(items: GoalItem[]) {
    setWeek(items);
    save("week", items);
  }

  function handleMonth(items: GoalItem[]) {
    setMonth(items);
    save("month", items);
  }

  return (
    <div className="card card-butter">
      <div className="card-head">
        <div>
          <div className="card-eyebrow">🎯 Goals</div>
          <h3 className="card-title">This week &amp; month</h3>
        </div>
      </div>

      {loading && <p className="goals-loading">Loading…</p>}
      {error   && <p className="goals-error">⚠ {error}</p>}

      {!loading && (
        <>
          <Section
            label="THIS WEEK"
            items={week}
            saving={savingW}
            onChange={handleWeek}
          />
          <div className="goals-divider" />
          <Section
            label="THIS MONTH"
            items={month}
            saving={savingM}
            onChange={handleMonth}
          />
        </>
      )}
    </div>
  );
}
