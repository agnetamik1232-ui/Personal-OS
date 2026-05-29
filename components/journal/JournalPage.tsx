"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { localDateKey }                              from "@/lib/utils/localDate";
import type { JournalEntry }                         from "@/app/api/journal/route";

// ── Date helpers ──────────────────────────────────────────────────────────────

function fmtDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Europe/Vilnius",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function fmtShort(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", timeZone: "Europe/Vilnius",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function prevDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d - 1));
  return dt.toISOString().split("T")[0]!;
}
function nextDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return dt.toISOString().split("T")[0]!;
}

// ── Word count ────────────────────────────────────────────────────────────────
function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

// ── Mood picker ───────────────────────────────────────────────────────────────
const MOODS = ["😞","😕","😐","🙂","😊","😄","🥳","😤","😩","🤩"] as const;

// ── Main component ────────────────────────────────────────────────────────────

export function JournalPage() {
  const todayKey                    = localDateKey();
  const [activeDate, setActiveDate] = useState(todayKey);
  const [text, setText]             = useState("");
  const [mood, setMood]             = useState<number | null>(null);
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [saved, setSaved]           = useState(false);
  const [history, setHistory]       = useState<JournalEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const saveTimer                   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef                     = useRef<HTMLTextAreaElement>(null);

  // ── Load entry for active date ───────────────────────────────────────────
  const loadEntry = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/journal?date=${date}`);
      const j = await r.json() as { text: string; mood: number | null; error?: string };
      if (!j.error) {
        setText(j.text ?? "");
        setMood(j.mood ?? null);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadEntry(activeDate);
  }, [activeDate, loadEntry]);

  // ── Load history sidebar ─────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    const r = await fetch("/api/journal?days=60");
    const j = await r.json() as { entries: JournalEntry[] };
    setHistory(j.entries ?? []);
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  // ── Auto-save (debounced 1.5 s) ──────────────────────────────────────────
  const doSave = useCallback(async (t: string, m: number | null) => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/journal", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ date: activeDate, text: t, mood: m }),
      });
      setSaved(true);
      // Refresh history to include new/updated entry
      void loadHistory();
    } catch { /* ignore */ }
    setSaving(false);
  }, [activeDate, loadHistory]);

  function schedSave(t: string, m: number | null) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void doSave(t, m), 1500);
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const t = e.target.value;
    setText(t);
    setSaved(false);
    schedSave(t, mood);
  }

  function handleMoodClick(idx: number) {
    const m = idx + 1;
    setMood(m);
    schedSave(text, m);
  }

  const isToday = activeDate === todayKey;

  return (
    <div className="jrnl-layout">
      {/* ── Left: history sidebar ── */}
      <aside className={`jrnl-sidebar${showHistory ? " jrnl-sidebar-open" : ""}`}>
        <div className="jrnl-sidebar-head">
          <span className="jrnl-sidebar-title">Past entries</span>
          <button className="jrnl-sidebar-close" onClick={() => setShowHistory(false)}>✕</button>
        </div>
        {history.length === 0 ? (
          <p className="jrnl-sidebar-empty">No entries yet.</p>
        ) : (
          <ul className="jrnl-sidebar-list">
            {history.map((e) => (
              <li
                key={e.date}
                className={`jrnl-sidebar-item${e.date === activeDate ? " jrnl-sidebar-item-active" : ""}`}
                onClick={() => { setActiveDate(e.date); setShowHistory(false); }}
              >
                <span className="jrnl-sidebar-date">{fmtShort(e.date)}</span>
                <span className="jrnl-sidebar-preview">{e.text.slice(0, 60).trim()}{e.text.length > 60 ? "…" : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* ── Right: editor ── */}
      <main className="jrnl-main">
        {/* Header */}
        <div className="jrnl-top-bar">
          <div className="jrnl-nav">
            <button className="jrnl-nav-btn" onClick={() => setActiveDate(prevDay(activeDate))}>‹</button>
            <button
              className={`jrnl-date-pill${isToday ? " jrnl-date-pill-today" : ""}`}
              onClick={() => setActiveDate(todayKey)}
              title="Jump to today"
            >
              {isToday ? "Today" : fmtShort(activeDate)}
            </button>
            <button
              className="jrnl-nav-btn"
              onClick={() => setActiveDate(nextDay(activeDate))}
              disabled={activeDate >= todayKey}
            >›</button>
          </div>

          <div className="jrnl-meta">
            <button className="jrnl-history-btn" onClick={() => setShowHistory((s) => !s)}>
              📚 History ({history.length})
            </button>
            <span className="jrnl-status">
              {saving ? "saving…" : saved ? "✓ saved" : ""}
            </span>
          </div>
        </div>

        {/* Date heading */}
        <h1 className="jrnl-heading">{fmtDate(activeDate)}</h1>

        {/* Mood picker */}
        <div className="jrnl-mood-row">
          <span className="jrnl-mood-label">Mood</span>
          <div className="jrnl-mood-pills">
            {MOODS.map((emoji, i) => (
              <button
                key={i}
                className={`jrnl-mood-pill${mood === i + 1 ? " jrnl-mood-pill-active" : ""}`}
                onClick={() => handleMoodClick(i)}
                title={`${i + 1}/10`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        {loading ? (
          <div className="jrnl-loading">Loading…</div>
        ) : (
          <textarea
            ref={textRef}
            className="jrnl-textarea"
            value={text}
            onChange={handleTextChange}
            placeholder={isToday
              ? "What happened today? What are you thinking about?"
              : "No entry for this day."}
            disabled={!isToday && text === ""}
            spellCheck
          />
        )}

        {/* Footer stats */}
        <div className="jrnl-footer">
          <span className="jrnl-word-count">{wordCount(text)} words</span>
          {history.length > 0 && (
            <span className="jrnl-streak-note">
              {history.length} days written
            </span>
          )}
        </div>
      </main>
    </div>
  );
}
