"use client";

import { useState, useEffect, useRef } from "react";

// ── Notification types ────────────────────────────────────────────────────────

export interface Notification {
  id:       string;
  type:     "warning" | "info" | "success" | "urgent";
  title:    string;
  body:     string;
  href?:    string;
  time?:    string;
}

// ── Smart notification generator ──────────────────────────────────────────────

async function generateNotifications(): Promise<Notification[]> {
  const notes: Notification[] = [];
  const now   = new Date();
  const hour  = now.getHours();
  const today = now.toISOString().split("T")[0]!;
  const day   = now.getDay(); // 0=Sun, 1=Mon...

  try {
    const [tasks, shift, habits, supps, nutr, checklist] = await Promise.all([
      fetch("/api/tasks?status=open&limit=200").then(r => r.json()).catch(() => ({})),
      fetch("/api/work/shift-report").then(r => r.json()).catch(() => ({})),
      fetch("/api/habits?days=1").then(r => r.json()).catch(() => ({})),
      fetch("/api/supplements").then(r => r.json()).catch(() => ({})),
      fetch(`/api/nutrition?days=1`).then(r => r.json()).catch(() => ({})),
      fetch("/api/work/checklist").then(r => r.json()).catch(() => ({})),
    ]);

    // ── Tasks: overdue ──────────────────────────────────────────────────────
    const taskArr = (tasks as { tasks?: { id: string; title: string; due_date?: string | null }[] }).tasks ?? [];
    const overdue = taskArr.filter(t => t.due_date && t.due_date < today);
    const dueToday = taskArr.filter(t => t.due_date === today);

    if (overdue.length > 0) {
      notes.push({
        id: "overdue-tasks",
        type: "urgent",
        title: `${overdue.length} overdue task${overdue.length > 1 ? "s" : ""}`,
        body: overdue.slice(0, 2).map(t => t.title).join(", ") + (overdue.length > 2 ? ` +${overdue.length - 2} more` : ""),
        href: "/tasks",
        time: "Overdue",
      });
    }

    if (dueToday.length > 0) {
      notes.push({
        id: "due-today",
        type: "warning",
        title: `${dueToday.length} task${dueToday.length > 1 ? "s" : ""} due today`,
        body: dueToday.slice(0, 2).map(t => t.title).join(", ") + (dueToday.length > 2 ? ` +${dueToday.length - 2}` : ""),
        href: "/tasks",
        time: "Today",
      });
    }

    // ── Shift: not started by 7am on weekdays ───────────────────────────────
    const shiftReport = (shift as { report?: { status: string; ended_at?: string | null } }).report;
    if (hour >= 7 && hour < 20 && day >= 1 && day <= 5) {
      if (!shiftReport) {
        notes.push({
          id: "shift-not-started",
          type: "info",
          title: "Shift not started",
          body: "Don’t forget to start your shift when you arrive at work.",
          href: "/work",
          time: "Reminder",
        });
      } else if (shiftReport.status === "active" && hour >= 18) {
        notes.push({
          id: "shift-end-reminder",
          type: "info",
          title: "Remember to end your shift",
          body: "Generate your Lithuanian end-of-shift summary before you leave.",
          href: "/work",
          time: "End of day",
        });
      }
    }

    // ── Workout: reminder on training days ──────────────────────────────────
    const workoutDays: Record<number, string> = { 1: "Day A — Lower Body", 3: "Day B — Upper Body", 5: "Day C — Full Body" };
    const todayWorkout = workoutDays[day];
    if (todayWorkout && hour >= 16 && hour < 22) {
      // Check if they logged a workout today
      const fitnessLogs = await fetch(`/api/fitness/logs?days=1`).then(r => r.json()).catch(() => ({}));
      const logsArr = (fitnessLogs as { logs?: { log_date: string }[] }).logs ?? [];
      const didWorkout = logsArr.some(l => l.log_date === today);
      if (!didWorkout) {
        notes.push({
          id: "workout-reminder",
          type: "info",
          title: `Workout day: ${todayWorkout}`,
          body: "You haven’t logged a workout today. Head to Fitness → Log Workout.",
          href: "/fitness",
          time: "Training day",
        });
      }
    }

    // ── Supplements: untaken by 10am ────────────────────────────────────────
    const suppArr = (supps as { supplements?: { taken: boolean; timing: string }[] }).supplements ?? [];
    const morningSupps = suppArr.filter(s => s.timing === "morning" || s.timing === "with_meal");
    const morningUntaken = morningSupps.filter(s => !s.taken);
    if (hour >= 10 && morningUntaken.length > 0) {
      notes.push({
        id: "supplements-reminder",
        type: "warning",
        title: `${morningUntaken.length} supplement${morningUntaken.length > 1 ? "s" : ""} not taken`,
        body: "Check your morning supplement checklist.",
        href: "/supplements",
        time: `${morningUntaken.length} remaining`,
      });
    }

    // ── Bedtime supplements ──────────────────────────────────────────────────
    const bedtimeSupps = suppArr.filter(s => s.timing === "before_bed" && !s.taken);
    if (hour >= 21 && bedtimeSupps.length > 0) {
      notes.push({
        id: "bedtime-supps",
        type: "info",
        title: "Bedtime supplements",
        body: `Don’t forget your ${bedtimeSupps.length} before-bed supplement${bedtimeSupps.length > 1 ? "s" : ""} (e.g. Magnesium).`,
        href: "/supplements",
        time: "Tonight",
      });
    }

    // ── Protein goal ────────────────────────────────────────────────────────
    const dayLog = (nutr as { logs?: Record<string, { p: number; kcal: number }> }).logs?.[today];
    if (hour >= 19 && dayLog) {
      const proteinGap = 163 - (dayLog.p ?? 0);
      if (proteinGap > 25) {
        notes.push({
          id: "protein-gap",
          type: "warning",
          title: `Protein gap: ${Math.round(proteinGap)}g remaining`,
          body: `You’ve had ${Math.round(dayLog.p)}g / 163g today. Add a protein shake or cottage cheese before bed.`,
          href: "/health",
          time: "Tonight",
        });
      }
    }

    // ── Habits: not done by evening ─────────────────────────────────────────
    const habLog = (habits as { logs?: Record<string, { done: string[] }> }).logs?.[today];
    const habitsDone = habLog?.done.length ?? 0;
    if (hour >= 20 && habitsDone < 3) {
      notes.push({
        id: "habits-reminder",
        type: "info",
        title: `Only ${habitsDone}/6 habits done today`,
        body: "Log your remaining habits before the day ends.",
        href: "/habits",
        time: "Evening",
      });
    }

    // ── Work checklist not completed ────────────────────────────────────────
    const checkItems = (checklist as { items?: { done: boolean; title: string }[] }).items ?? [];
    const undone = checkItems.filter(i => !i.done);
    if (shiftReport?.status === "active" && undone.length > 0 && hour >= 15) {
      notes.push({
        id: "checklist-reminder",
        type: "info",
        title: `${undone.length} checklist item${undone.length > 1 ? "s" : ""} pending`,
        body: undone.slice(0,2).map(i => i.title).join(", "),
        href: "/work",
        time: "Before end of shift",
      });
    }

    // ── All good ─────────────────────────────────────────────────────────────
    if (notes.length === 0) {
      notes.push({
        id: "all-good",
        type: "success",
        title: "All good! 🎉",
        body: "No urgent notifications right now. Keep up the great work.",
      });
    }

  } catch {
    // silent fail
  }

  return notes;
}

// ── Component ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  urgent:  { icon: "🔴", cls: "ntf-urgent"  },
  warning: { icon: "🟡", cls: "ntf-warning" },
  info:    { icon: "🔵", cls: "ntf-info"    },
  success: { icon: "✅", cls: "ntf-success"  },
};

export function NotificationBell() {
  const [open, setOpen]           = useState(false);
  const [notes, setNotes]         = useState<Notification[]>([]);
  const [loading, setLoading]     = useState(false);
  const [lastRefresh, setLast]    = useState<Date | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    setLoading(true);
    const n = await generateNotifications();
    setNotes(n);
    setLast(new Date());
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(t);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const urgentCount = notes.filter(n => n.type === "urgent" || n.type === "warning").length;
  const hasUrgent   = urgentCount > 0;

  return (
    <div className="ntf-wrap" ref={panelRef}>
      <button className="ntf-bell" onClick={() => setOpen(o => !o)} title="Notifications">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {hasUrgent && <span className="ntf-badge">{urgentCount}</span>}
      </button>

      {open && (
        <div className="ntf-panel">
          <div className="ntf-panel-header">
            <span className="ntf-panel-title">Notifications</span>
            <button className="ntf-refresh" onClick={() => void refresh()} title="Refresh">
              {loading ? "⟳" : "↺"}
            </button>
          </div>

          <div className="ntf-list">
            {loading && notes.length === 0 ? (
              <div className="ntf-loading">Checking…</div>
            ) : notes.map(n => {
              const cfg = TYPE_CONFIG[n.type];
              const content = (
                <div key={n.id} className={`ntf-item ${cfg.cls}`}>
                  <span className="ntf-item-icon">{cfg.icon}</span>
                  <div className="ntf-item-body">
                    <div className="ntf-item-title">{n.title}</div>
                    <div className="ntf-item-text">{n.body}</div>
                    {n.time && <div className="ntf-item-time">{n.time}</div>}
                  </div>
                </div>
              );
              return n.href ? (
                <a key={n.id} href={n.href} className="ntf-item-link" onClick={() => setOpen(false)}>
                  {content}
                </a>
              ) : content;
            })}
          </div>

          {lastRefresh && (
            <div className="ntf-footer">
              Updated {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
