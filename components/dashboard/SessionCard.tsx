"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { IconFocus, IconPlay, IconPause }            from "@/components/ui/Icon";
import Link                                          from "next/link";
import type { TaskRow }                              from "@/app/api/tasks/route";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionState {
  taskName:    string;
  taskSub:     string;
  durationMin: number;
  /** Unix ms — adjusted on every resume so (now - startedAt) = elapsed ms */
  startedAt:   number;
  /** Unix ms when paused, null if running */
  pausedAt:    number | null;
  notes:       string;
}

const LS_KEY  = "personal-os:session-v1";
const RING_R  = 72;
const RING_C  = 2 * Math.PI * RING_R;

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionState;
  } catch { return null; }
}

function saveSession(s: SessionState | null) {
  if (s) localStorage.setItem(LS_KEY, JSON.stringify(s));
  else   localStorage.removeItem(LS_KEY);
}

function elapsedSeconds(s: SessionState): number {
  const anchor = s.pausedAt ?? Date.now();
  return Math.max(0, (anchor - s.startedAt) / 1000);
}

function remainingSeconds(s: SessionState): number {
  return Math.max(0, s.durationMin * 60 - elapsedSeconds(s));
}

function fmt2(n: number) { return String(Math.floor(n)).padStart(2, "0"); }

function urgencyDot(urgency: string | null, isKey: boolean): string {
  if (isKey) return "🔑";
  if (urgency === "today" || urgency === "high" || urgency === "urgent") return "🔥";
  return "·";
}

function fmtMin(min: number | null): string {
  if (!min || min <= 0) return "—";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ── Task list ─────────────────────────────────────────────────────────────────

function filterAndRank(tasks: TaskRow[]): TaskRow[] {
  return tasks
    .filter((t) =>
      t.urgency === "today" || t.urgency === "high" || t.urgency === "urgent" || t.key === true
    )
    .filter((t) => !t.completed_at)
    .sort((a, b) => {
      if (a.key && !b.key) return -1;
      if (!a.key && b.key) return 1;
      return (b.priority_score ?? 0) - (a.priority_score ?? 0);
    })
    .slice(0, 5);
}

function TaskList() {
  const [tasks,   setTasks]   = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/tasks?status=open");
      const json = await res.json() as { tasks?: TaskRow[]; error?: string };
      if (!res.ok) { setError(json.error ?? "Failed"); return; }
      setTasks(filterAndRank(json.tasks ?? []));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) return (
    <div className="sess-tasks-shell">
      {[0,1,2].map((i) => <div key={i} className="sess-task-skeleton" style={{ opacity: 1 - i * 0.25 }} />)}
    </div>
  );

  if (error) return (
    <div className="sess-tasks-shell sess-tasks-error">
      <span>⚠ {error}</span>
      <button className="sess-retry" onClick={() => void load()}>Retry</button>
    </div>
  );

  if (tasks.length === 0) return (
    <div className="sess-tasks-shell sess-tasks-empty">
      <span>✓ No urgent tasks — clear runway ahead</span>
    </div>
  );

  return (
    <div className="sess-tasks-shell">
      {tasks.map((task, idx) => (
        <Link
          key={task.id}
          href="/crm"
          className="sess-task-row"
          aria-label={`${task.title} — open in CRM`}
        >
          <span className="sess-task-rank">{idx + 1}</span>
          <span className="sess-task-dot" aria-hidden>{urgencyDot(task.urgency, task.key)}</span>
          <span className="sess-task-title">{task.title}</span>
          <span className="sess-task-time">{fmtMin(task.time_estimate_min)}</span>
          <span className="sess-task-arrow" aria-hidden>›</span>
        </Link>
      ))}
    </div>
  );
}

// ── Start form ────────────────────────────────────────────────────────────────

function StartForm({ onStart }: { onStart: (s: SessionState) => void }) {
  const [taskName,    setTaskName]    = useState("");
  const [taskSub,     setTaskSub]     = useState("");
  const [durationMin, setDurationMin] = useState(50);

  function start() {
    if (!taskName.trim()) return;
    const s: SessionState = {
      taskName:    taskName.trim(),
      taskSub:     taskSub.trim(),
      durationMin,
      startedAt:   Date.now(),
      pausedAt:    null,
      notes:       "",
    };
    saveSession(s);
    onStart(s);
  }

  return (
    <div className="sess-start-form">
      <div className="sess-start-tag"><IconFocus size={12} /> Deep Work Session</div>
      <input
        className="sess-start-input"
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") start(); }}
        placeholder="What are you working on?"
        autoFocus
      />
      <input
        className="sess-start-sub"
        value={taskSub}
        onChange={(e) => setTaskSub(e.target.value)}
        placeholder="Subtitle or context (optional)"
      />
      <div className="sess-start-row">
        <div className="sess-dur-group">
          {[25, 50, 90].map((d) => (
            <button
              key={d}
              className={`sess-dur-btn${durationMin === d ? " sess-dur-btn-active" : ""}`}
              onClick={() => setDurationMin(d)}
            >{d}m</button>
          ))}
          <input
            type="number"
            className="sess-dur-custom"
            value={durationMin}
            onChange={(e) => setDurationMin(Math.max(1, parseInt(e.target.value) || 25))}
            min={1} max={480}
          />
        </div>
        <button
          className="sess-start-btn"
          onClick={start}
          disabled={!taskName.trim()}
        >
          <IconPlay size={12} /> Start
        </button>
      </div>
    </div>
  );
}

// ── Active session ────────────────────────────────────────────────────────────

function ActiveSession({
  session,
  onUpdate,
  onEnd,
}: {
  session:  SessionState;
  onUpdate: (s: SessionState) => void;
  onEnd:    () => void;
}) {
  const [, tick]         = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const notesRef         = useRef<HTMLTextAreaElement>(null);
  const isRunning        = session.pausedAt === null;

  // Tick every second while running
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  // Auto-end when timer hits 0
  const rem = remainingSeconds(session);
  useEffect(() => {
    if (rem === 0) onEnd();
  }, [rem, onEnd]);

  const elapsed = elapsedSeconds(session);
  const pct     = Math.min(1, elapsed / (session.durationMin * 60));
  const mm      = fmt2(rem / 60);
  const ss      = fmt2(rem % 60);
  const elMin   = Math.floor(elapsed / 60);

  function togglePause() {
    const updated: SessionState = isRunning
      ? { ...session, pausedAt: Date.now() }
      : { ...session, startedAt: Date.now() - (session.pausedAt! - session.startedAt), pausedAt: null };
    saveSession(updated);
    onUpdate(updated);
  }

  function handleNotesChange(text: string) {
    const updated = { ...session, notes: text };
    saveSession(updated);
    onUpdate(updated);
  }

  function handleEnd() {
    saveSession(null);
    onEnd();
  }

  return (
    <div>
      <div className="session-layout">
        {/* Left */}
        <div className="session-left">
          <div className="session-tag">
            <IconFocus size={12} />
            Active Session · Deep Work
          </div>

          <h3 className="session-focus">
            {session.taskName}
            {session.taskSub && <><br /><span>— {session.taskSub}</span></>}
          </h3>

          <div className="session-meta-row">
            <span><b>{elMin}</b> min elapsed</span>
            {!isRunning && <><span>·</span><span className="sess-paused-badge">Paused</span></>}
          </div>

          <div className="session-actions">
            <button
              className="session-btn session-btn-primary"
              onClick={togglePause}
              aria-label={isRunning ? "Pause" : "Resume"}
            >
              {isRunning ? <IconPause size={11} /> : <IconPlay size={11} />}
              {isRunning ? "Pause" : "Resume"}
            </button>
            <button className="session-btn session-btn-ghost" onClick={handleEnd}>
              End early
            </button>
            <button
              className={`session-btn session-btn-ghost${showNotes ? " sess-btn-active" : ""}`}
              onClick={() => { setShowNotes((v) => !v); setTimeout(() => notesRef.current?.focus(), 50); }}
            >
              Notes {session.notes ? "·" : ""}
            </button>
          </div>

          {/* Inline notes */}
          {showNotes && (
            <textarea
              ref={notesRef}
              className="sess-notes-area"
              value={session.notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Capture thoughts, decisions, next steps…"
              rows={4}
            />
          )}
        </div>

        {/* Ring */}
        <div className="session-ring-wrap" aria-label={`${mm}:${ss} remaining`}>
          <svg width="168" height="168" viewBox="0 0 168 168" aria-hidden>
            <circle cx="84" cy="84" r={RING_R} fill="none" stroke="rgba(250,245,236,0.10)" strokeWidth="6"/>
            <circle
              cx="84" cy="84" r={RING_R}
              fill="none"
              stroke={isRunning ? "#F0E2A6" : "rgba(250,245,236,0.30)"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - pct)}
              transform="rotate(-90 84 84)"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="session-ring-inner">
            <div>
              <div className="session-ring-time">{mm}:{ss}</div>
              <div className="session-ring-lbl">{isRunning ? "remaining" : "paused"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Task list */}
      <div className="sess-tasks-header">
        <span className="sess-tasks-eyebrow">🔥 Today &amp; Key tasks</span>
        <Link href="/crm" className="sess-tasks-crm-link">Open CRM ›</Link>
      </div>
      <TaskList />
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function SessionCard() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [booted,  setBooted]  = useState(false);

  // Load from localStorage once on mount (avoid SSR mismatch)
  useEffect(() => {
    const s = loadSession();
    // Discard sessions where the timer already expired
    if (s && remainingSeconds(s) > 0) setSession(s);
    setBooted(true);
  }, []);

  function handleStart(s: SessionState) { setSession(s); }
  function handleEnd()                  { setSession(null); }
  function handleUpdate(s: SessionState){ setSession(s); }

  if (!booted) return <div className="card card-dark" style={{ minHeight: 200 }} />;

  return (
    <div className="card card-dark">
      <svg className="card-deco" style={{ right: -50, top: -50, width: 220, height: 220 }} viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="50" fill="rgba(250,245,236,0.025)" />
      </svg>

      {session
        ? <ActiveSession session={session} onUpdate={handleUpdate} onEnd={handleEnd} />
        : <StartForm onStart={handleStart} />
      }
    </div>
  );
}
