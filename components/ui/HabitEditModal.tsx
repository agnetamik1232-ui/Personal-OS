"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { HabitConfig }                          from "@/lib/config/habits";

// ── Common emoji suggestions for habits ──────────────────────────────────────
const EMOJI_PRESETS = [
  "📖","🏋️","📵","✍️","🧘","😴","🥗","💧","🚶","🏃","🧠","💊",
  "🎯","🎨","🎸","🧹","📞","💰","🌿","☀️","🌙","❤️","🔥","⚡",
];

interface RowEditorProps {
  habit:    HabitConfig;
  index:    number;
  total:    number;
  onChange: (index: number, updated: HabitConfig) => void;
  onMove:   (from: number, dir: -1 | 1) => void;
  onRemove: (index: number) => void;
}

function RowEditor({ habit, index, total, onChange, onMove, onRemove }: RowEditorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    function handler(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  return (
    <div className="hedit-row">
      {/* Reorder arrows */}
      <div className="hedit-order">
        <button
          className="hedit-arrow"
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          aria-label="Move up"
        >▲</button>
        <button
          className="hedit-arrow"
          onClick={() => onMove(index, 1)}
          disabled={index === total - 1}
          aria-label="Move down"
        >▼</button>
      </div>

      {/* Emoji picker */}
      <div className="hedit-emoji-wrap" ref={pickerRef}>
        <button
          className="hedit-emoji-btn"
          onClick={() => setShowPicker((v) => !v)}
          aria-label="Pick icon"
          title="Pick icon"
        >
          {habit.icon || "●"}
        </button>
        {showPicker && (
          <div className="hedit-emoji-picker" role="listbox" aria-label="Emoji options">
            {EMOJI_PRESETS.map((e) => (
              <button
                key={e}
                className={`hedit-emoji-opt${habit.icon === e ? " hedit-emoji-opt-active" : ""}`}
                role="option"
                aria-selected={habit.icon === e}
                onClick={() => {
                  onChange(index, { ...habit, icon: e });
                  setShowPicker(false);
                }}
              >{e}</button>
            ))}
            {/* Custom emoji input */}
            <input
              className="hedit-emoji-custom"
              placeholder="Custom…"
              maxLength={2}
              defaultValue=""
              onKeyDown={(ev) => {
                if (ev.key === "Enter") {
                  const val = (ev.currentTarget.value).trim();
                  if (val) { onChange(index, { ...habit, icon: val }); setShowPicker(false); }
                }
              }}
              aria-label="Custom emoji"
            />
          </div>
        )}
      </div>

      {/* Name */}
      <input
        className="hedit-name-input"
        value={habit.name}
        maxLength={32}
        onChange={(e) => onChange(index, { ...habit, name: e.target.value })}
        placeholder="Habit name"
        aria-label={`Habit ${index + 1} name`}
      />

      {/* Remove */}
      <button
        className="hedit-remove"
        onClick={() => onRemove(index)}
        disabled={total <= 1}
        aria-label={`Remove ${habit.name}`}
      >×</button>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface HabitEditModalProps {
  initial:  HabitConfig[];
  onSave:   (habits: HabitConfig[]) => void;
  onClose:  () => void;
}

export function HabitEditModal({ initial, onSave, onClose }: HabitEditModalProps) {
  const [rows,   setRows]   = useState<HabitConfig[]>(() => initial.map((h) => ({ ...h })));
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Trap focus + Esc close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleChange = useCallback((i: number, updated: HabitConfig) => {
    setRows((prev) => prev.map((r, idx) => idx === i ? updated : r));
  }, []);

  const handleMove = useCallback((from: number, dir: -1 | 1) => {
    setRows((prev) => {
      const next = [...prev];
      const to   = from + dir;
      if (to < 0 || to >= next.length) return prev;
      [next[from], next[to]] = [next[to]!, next[from]!];
      return next;
    });
  }, []);

  const handleRemove = useCallback((i: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const handleAdd = () => {
    if (rows.length >= 6) return;
    const newId = `habit-${Date.now()}`;
    setRows((prev) => [...prev, { id: newId, name: "", icon: "●" }]);
  };

  const handleSave = async () => {
    const valid = rows.filter((r) => r.name.trim());
    if (valid.length === 0) { setError("Add at least one habit name."); return; }

    setSaving(true);
    setError(null);
    try {
      const res  = await fetch("/api/habits/config", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ habits: valid }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; habits?: HabitConfig[] };
      if (!res.ok) { setError(json.error ?? "Save failed"); return; }
      onSave(json.habits ?? valid);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose} aria-hidden />

      {/* Dialog */}
      <div
        className="modal-dialog hedit-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Edit habits"
        ref={dialogRef}
      >
        <div className="modal-header">
          <h2 className="modal-title">Edit Habits</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <p className="hedit-hint">Up to 6 habits. Drag the arrows to reorder.</p>

        <div className="hedit-rows">
          {rows.map((habit, i) => (
            <RowEditor
              key={habit.id}
              habit={habit}
              index={i}
              total={rows.length}
              onChange={handleChange}
              onMove={handleMove}
              onRemove={handleRemove}
            />
          ))}
        </div>

        {rows.length < 6 && (
          <button className="hedit-add" onClick={handleAdd}>
            + Add habit
          </button>
        )}

        {error && <p className="hedit-error">{error}</p>}

        <div className="modal-footer">
          <button className="modal-btn modal-btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="modal-btn modal-btn-primary" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save habits"}
          </button>
        </div>
      </div>
    </>
  );
}
