"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { TaskRow } from "@/app/api/tasks/route";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ["Work", "Health", "Finance", "Personal", "Learning"] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_ICON: Record<string, string> = {
  Work: "💼", Health: "💚", Finance: "💰", Personal: "🏠", Learning: "📚",
};

const URGENCY_OPTS = [
  { value: "today",     label: "Today",     color: "#dc2626" },
  { value: "high",      label: "High",      color: "#ea580c" },
  { value: "this_week", label: "This Week", color: "#d97706" },
  { value: "medium",    label: "Medium",    color: "#2563eb" },
  { value: "someday",   label: "Someday",   color: "#6b7280" },
];

const KANBAN_COLS = [
  { id: "inbox",       label: "Inbox",       icon: "📥" },
  { id: "next",        label: "Next",        icon: "⏭️" },
  { id: "today",       label: "Today",       icon: "🎯" },
  { id: "in_progress", label: "In Progress", icon: "⚡" },
  { id: "waiting",     label: "Waiting",     icon: "⏳" },
];

const DURATION_OPTS = [
  { value: 15,  label: "15m" },
  { value: 30,  label: "30m" },
  { value: 45,  label: "45m" },
  { value: 60,  label: "1h"  },
  { value: 90,  label: "1.5h"},
  { value: 120, label: "2h"  },
  { value: 180, label: "3h"  },
];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDate(d: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(d + "T00:00:00"));
}

function fmtDuration(min: number | null) {
  if (!min) return null;
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ""}`;
}

function urgencyColor(u: string | null) {
  return URGENCY_OPTS.find(o => o.value === u)?.color ?? "#6b7280";
}

function isOverdue(t: TaskRow) {
  if (!t.due_date || t.completed_at) return false;
  return t.due_date < todayKey();
}

function isDueToday(t: TaskRow) {
  return t.due_date === todayKey() && !t.completed_at;
}

// ── Add Task Form ─────────────────────────────────────────────────────────────

interface AddTaskFormProps {
  onAdd: (task: TaskRow) => void;
  defaultKanban?: string | undefined;
}

function AddTaskForm({ onAdd, defaultKanban = "inbox" }: AddTaskFormProps) {
  const [open,     setOpen]     = useState(false);
  const [title,    setTitle]    = useState("");
  const [category, setCategory] = useState<string>("");
  const [urgency,  setUrgency]  = useState<string>("medium");
  const [dueDate,  setDueDate]  = useState("");
  const [duration, setDuration] = useState<number | "">("");
  const [isKey,    setIsKey]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/tasks", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        category:          category   || null,
        urgency:           urgency    || null,
        due_date:          dueDate    || null,
        time_estimate_min: duration   || null,
        key:               isKey,
        kanban_status:     defaultKanban,
      }),
    }).then(r => r.json() as Promise<{ task?: TaskRow }>);
    setSaving(false);
    if (res.task) {
      onAdd(res.task);
      setTitle(""); setCategory(""); setUrgency("medium");
      setDueDate(""); setDuration(""); setIsKey(false);
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button className="tx-add-btn" onClick={() => setOpen(true)}>
        + Add Task
      </button>
    );
  }

  return (
    <form className="tx-add-form" onSubmit={e => void submit(e)}>
      <input
        ref={inputRef}
        className="tx-add-input"
        placeholder="Task title…"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}
      />
      <div className="tx-add-row">
        <select className="tx-select" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Category</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICON[c]} {c}</option>)}
        </select>
        <select className="tx-select" value={urgency} onChange={e => setUrgency(e.target.value)}>
          {URGENCY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input type="date" className="tx-select" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        <select className="tx-select" value={duration} onChange={e => setDuration(Number(e.target.value) || "")}>
          <option value="">Duration</option>
          {DURATION_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className="tx-key-check">
          <input type="checkbox" checked={isKey} onChange={e => setIsKey(e.target.checked)} />
          <span>⭐ Key</span>
        </label>
      </div>
      <div className="tx-add-actions">
        <button type="button" className="tx-btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
        <button type="submit" className="tx-btn-primary" disabled={!title.trim() || saving}>
          {saving ? "Saving…" : "Add Task"}
        </button>
      </div>
    </form>
  );
}

// ── Task Row ──────────────────────────────────────────────────────────────────

interface TaskItemProps {
  task:       TaskRow;
  onComplete: (id: string) => void;
  onUpdate:   (task: TaskRow) => void;
  onDelete:   (id: string) => void;
  onClick:    (task: TaskRow) => void;
}

function TaskItem({ task, onComplete, onClick }: TaskItemProps) {
  const overdue = isOverdue(task);
  const today   = isDueToday(task);
  const done    = !!task.completed_at;

  return (
    <div className={`tx-item${done ? " tx-item-done" : ""}${overdue ? " tx-item-overdue" : ""}`}>
      <button
        type="button"
        className={`tx-check${done ? " tx-check-done" : ""}`}
        onClick={() => onComplete(task.id)}
        aria-label={done ? "Mark incomplete" : "Mark complete"}
      >
        {done ? "✓" : ""}
      </button>

      <div className="tx-item-body" onClick={() => onClick(task)} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && onClick(task)}>
        <div className="tx-item-top">
          {task.key && <span className="tx-star">⭐</span>}
          <span className={`tx-title${done ? " tx-title-done" : ""}`}>{task.title}</span>
          {task.category && (
            <span className="tx-cat-badge">{CATEGORY_ICON[task.category] ?? ""} {task.category}</span>
          )}
        </div>
        <div className="tx-item-meta">
          {task.urgency && (
            <span className="tx-meta-chip" style={{ color: urgencyColor(task.urgency) }}>
              {URGENCY_OPTS.find(o => o.value === task.urgency)?.label}
            </span>
          )}
          {task.due_date && (
            <span className={`tx-meta-chip${overdue ? " tx-meta-overdue" : today ? " tx-meta-today" : ""}`}>
              📅 {fmtDate(task.due_date)}
            </span>
          )}
          {task.time_estimate_min && (
            <span className="tx-meta-chip">⏱ {fmtDuration(task.time_estimate_min)}</span>
          )}
          {task.entity_name && (
            <span className="tx-meta-chip">🏢 {task.entity_name}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Task Section ──────────────────────────────────────────────────────────────

interface TaskSectionProps {
  title:      string;
  icon:       string;
  tasks:      TaskRow[];
  onComplete: (id: string) => void;
  onUpdate:   (task: TaskRow) => void;
  onDelete:   (id: string) => void;
  onTaskClick:(task: TaskRow) => void;
  onAdd?:     (task: TaskRow) => void;
  defaultKanban?: string;
  accent?:    string;
  collapsible?: boolean;
}

function TaskSection({ title, icon, tasks, onComplete, onUpdate, onDelete, onTaskClick, onAdd, defaultKanban, accent, collapsible }: TaskSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="tx-section">
      <div className="tx-section-header" onClick={() => collapsible && setCollapsed(c => !c)} style={{ cursor: collapsible ? "pointer" : "default" }}>
        <div className="tx-section-title" style={accent ? { color: accent } : undefined}>
          <span>{icon}</span> {title}
          <span className="tx-section-count">{tasks.length}</span>
        </div>
        {collapsible && <span className="tx-collapse-icon">{collapsed ? "▸" : "▾"}</span>}
      </div>

      {!collapsed && (
        <>
          {tasks.length === 0 && (
            <div className="tx-section-empty">No tasks — {title.toLowerCase()} is clear ✓</div>
          )}
          {tasks.map(t => (
            <TaskItem
              key={t.id} task={t}
              onComplete={onComplete} onUpdate={onUpdate}
              onDelete={onDelete} onClick={onTaskClick}
            />
          ))}
          {onAdd && <AddTaskForm onAdd={onAdd} defaultKanban={defaultKanban} />}
        </>
      )}
    </div>
  );
}

// ── Task Detail Modal ─────────────────────────────────────────────────────────

interface TaskModalProps {
  task:     TaskRow;
  onClose:  () => void;
  onUpdate: (task: TaskRow) => void;
  onDelete: (id: string) => void;
}

function TaskModal({ task, onClose, onUpdate, onDelete }: TaskModalProps) {
  const [draft,   setDraft]   = useState(task);
  const [saving,  setSaving]  = useState(false);
  const [deleting,setDeleting]= useState(false);

  function set<K extends keyof TaskRow>(k: K, v: TaskRow[K]) {
    setDraft(p => ({ ...p, [k]: v }));
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:             draft.title,
        description:       draft.description,
        notes:             draft.notes,
        urgency:           draft.urgency,
        category:          draft.category,
        kanban_status:     draft.kanban_status,
        due_date:          draft.due_date,
        time_estimate_min: draft.time_estimate_min,
        key:               draft.key,
        tags:              draft.tags,
      }),
    }).then(r => r.json() as Promise<{ task?: TaskRow }>);
    setSaving(false);
    if (res.task) { onUpdate(res.task); onClose(); }
  }

  async function remove() {
    setDeleting(true);
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    onDelete(task.id);
    onClose();
  }

  return (
    <div className="tx-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tx-modal">
        <div className="tx-modal-header">
          <input
            className="tx-modal-title-input"
            value={draft.title}
            onChange={e => set("title", e.target.value)}
          />
          <button className="tx-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tx-modal-body">
          <div className="tx-modal-row">
            <div className="tx-modal-field">
              <label>Category</label>
              <select className="tx-select" value={draft.category ?? ""} onChange={e => set("category", e.target.value || null)}>
                <option value="">None</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICON[c]} {c}</option>)}
              </select>
            </div>
            <div className="tx-modal-field">
              <label>Priority</label>
              <select className="tx-select" value={draft.urgency ?? ""} onChange={e => set("urgency", e.target.value || null)}>
                <option value="">None</option>
                {URGENCY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="tx-modal-field">
              <label>Status</label>
              <select className="tx-select" value={draft.kanban_status} onChange={e => set("kanban_status", e.target.value)}>
                {KANBAN_COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div className="tx-modal-row">
            <div className="tx-modal-field">
              <label>Due Date</label>
              <input type="date" className="tx-select" value={draft.due_date ?? ""} onChange={e => set("due_date", e.target.value || null)} />
            </div>
            <div className="tx-modal-field">
              <label>Duration</label>
              <select className="tx-select" value={draft.time_estimate_min ?? ""} onChange={e => set("time_estimate_min", Number(e.target.value) || null)}>
                <option value="">None</option>
                {DURATION_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="tx-modal-field tx-modal-key">
              <label>Key Task</label>
              <label className="tx-toggle-label">
                <input type="checkbox" checked={draft.key} onChange={e => set("key", e.target.checked)} />
                <span>{draft.key ? "⭐ Yes" : "No"}</span>
              </label>
            </div>
          </div>

          <div className="tx-modal-field tx-modal-field-full">
            <label>Description</label>
            <textarea className="tx-textarea" rows={2} value={draft.description ?? ""} onChange={e => set("description", e.target.value || null)} placeholder="What needs to be done?" />
          </div>

          <div className="tx-modal-field tx-modal-field-full">
            <label>Notes</label>
            <textarea className="tx-textarea" rows={3} value={draft.notes ?? ""} onChange={e => set("notes", e.target.value || null)} placeholder="Additional context, links, ideas…" />
          </div>
        </div>

        <div className="tx-modal-footer">
          <button className="tx-btn-danger" onClick={() => void remove()} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <div style={{ flex: 1 }} />
          <button className="tx-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="tx-btn-primary" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Kanban Board ──────────────────────────────────────────────────────────────

interface KanbanProps {
  tasks:      TaskRow[];
  onComplete: (id: string) => void;
  onUpdate:   (task: TaskRow) => void;
  onDelete:   (id: string) => void;
  onClick:    (task: TaskRow) => void;
  onAdd:      (task: TaskRow) => void;
}

function KanbanBoard({ tasks, onComplete, onUpdate, onClick, onAdd }: KanbanProps) {
  async function moveToCol(taskId: string, kanban_status: string) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kanban_status }),
    }).then(r => r.json() as Promise<{ task?: TaskRow }>);
    if (res.task) onUpdate(res.task);
  }

  return (
    <div className="tx-kanban">
      {KANBAN_COLS.map(col => {
        const colTasks = tasks.filter(t => t.kanban_status === col.id && !t.completed_at);
        return (
          <div key={col.id} className="tx-kanban-col">
            <div className="tx-kanban-col-header">
              <span>{col.icon} {col.label}</span>
              <span className="tx-section-count">{colTasks.length}</span>
            </div>
            <div className="tx-kanban-cards">
              {colTasks.map(t => (
                <div key={t.id} className={`tx-kanban-card${isOverdue(t) ? " tx-kanban-overdue" : ""}`}>
                  <div className="tx-kanban-card-top" onClick={() => onClick(t)} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && onClick(t)}>
                    {t.key && <span className="tx-star">⭐</span>}
                    <span className="tx-kanban-title">{t.title}</span>
                  </div>
                  <div className="tx-kanban-card-meta">
                    {t.due_date && <span className={`tx-meta-chip${isOverdue(t) ? " tx-meta-overdue" : ""}`}>📅 {fmtDate(t.due_date)}</span>}
                    {t.time_estimate_min && <span className="tx-meta-chip">⏱ {fmtDuration(t.time_estimate_min)}</span>}
                    {t.category && <span className="tx-meta-chip">{CATEGORY_ICON[t.category]}</span>}
                  </div>
                  <div className="tx-kanban-card-actions">
                    <button className="tx-kbtn" onClick={() => onComplete(t.id)}>✓</button>
                    {KANBAN_COLS.filter(c => c.id !== col.id).map(c => (
                      <button key={c.id} className="tx-kbtn" onClick={() => void moveToCol(t.id, c.id)} title={`Move to ${c.label}`}>{c.icon}</button>
                    ))}
                  </div>
                </div>
              ))}
              <AddTaskForm onAdd={onAdd} defaultKanban={col.id} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── AI Assistant ──────────────────────────────────────────────────────────────

interface AIAssistantProps { tasks: TaskRow[] }

function AIAssistant({ tasks }: AIAssistantProps) {
  const [focused, setFocused] = useState<TaskRow[]>([]);
  const [method,  setMethod]  = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [query,   setQuery]   = useState("most important tasks based on deadlines and urgency");

  const run = useCallback(async () => {
    if (!tasks.length) return;
    setLoading(true);
    const open = tasks.filter(t => !t.completed_at);
    const res = await fetch("/api/tasks/smart", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, tasks: open }),
    }).then(r => r.json() as Promise<{ ids?: string[]; method?: string }>).catch(() => ({}));
    const ids = (res as { ids?: string[] }).ids ?? [];
    setFocused(open.filter(t => ids.includes(t.id)).slice(0, 6));
    setMethod((res as { method?: string }).method ?? "");
    setLoading(false);
  }, [tasks, query]);

  useEffect(() => { void run(); }, [run]);

  return (
    <div className="tx-ai">
      <div className="tx-ai-header">
        <div className="tx-ai-title">🤖 AI Task Assistant</div>
        <span className="tx-ai-method">{method === "claude" ? "✨ Claude" : method === "keyword" ? "Keyword" : ""}</span>
      </div>

      <div className="tx-ai-query-row">
        <input
          className="tx-ai-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ask: what should I focus on?"
          onKeyDown={e => e.key === "Enter" && void run()}
        />
        <button className="tx-btn-primary tx-ai-run" onClick={() => void run()} disabled={loading}>
          {loading ? "…" : "→"}
        </button>
      </div>

      {loading && <div className="tx-ai-loading">Analysing your tasks…</div>}

      {!loading && focused.length === 0 && (
        <div className="tx-section-empty">No matching tasks found for that query.</div>
      )}

      {!loading && focused.length > 0 && (
        <div className="tx-ai-results">
          {focused.map((t, i) => (
            <div key={t.id} className="tx-ai-result">
              <span className="tx-ai-rank">#{i + 1}</span>
              <div className="tx-ai-result-body">
                <div className="tx-ai-result-title">{t.key ? "⭐ " : ""}{t.title}</div>
                <div className="tx-item-meta">
                  {t.urgency && <span className="tx-meta-chip" style={{ color: urgencyColor(t.urgency) }}>{URGENCY_OPTS.find(o => o.value === t.urgency)?.label}</span>}
                  {t.due_date && <span className={`tx-meta-chip${isOverdue(t) ? " tx-meta-overdue" : ""}`}>📅 {fmtDate(t.due_date)}</span>}
                  {t.category && <span className="tx-meta-chip">{CATEGORY_ICON[t.category]} {t.category}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Overview Bar ──────────────────────────────────────────────────────────────

function OverviewBar({ tasks, completedToday }: { tasks: TaskRow[]; completedToday: TaskRow[] }) {
  const today    = todayKey();
  const now      = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const open     = tasks.filter(t => !t.completed_at);
  const dueToday = open.filter(t => t.due_date === today).length;
  const overdue  = open.filter(t => t.due_date && new Date(t.due_date) < todayDate).length;

  // Weekly rate: last 7 days
  const weekAgo = new Date(todayDate.getTime() - 6 * 86400000).toISOString().split("T")[0]!;
  const weekDone = completedToday.filter(t => t.completed_at && t.completed_at >= weekAgo).length;

  const tiles = [
    { label: "Due Today",       value: dueToday,  icon: "🎯", color: dueToday  > 0 ? "#d97706" : "#16a34a" },
    { label: "Overdue",         value: overdue,   icon: "🔴", color: overdue   > 0 ? "#dc2626" : "#16a34a" },
    { label: "Completed Today", value: completedToday.filter(t => t.completed_at?.startsWith(today)).length, icon: "✅", color: "#16a34a" },
    { label: "Done This Week",  value: weekDone,  icon: "📈", color: "#2563eb" },
  ];

  return (
    <div className="tx-overview">
      {tiles.map(t => (
        <div key={t.label} className="tx-overview-tile">
          <div className="tx-overview-icon">{t.icon}</div>
          <div className="tx-overview-val" style={{ color: t.color }}>{t.value}</div>
          <div className="tx-overview-label">{t.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Top Focus Card ────────────────────────────────────────────────────────────

function TopFocusCard({ tasks, onComplete, onClick }: { tasks: TaskRow[]; onComplete: (id: string) => void; onClick: (t: TaskRow) => void }) {
  const today    = todayKey();
  const open     = tasks.filter(t => !t.completed_at);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const overdue  = open.filter(t => t.due_date && new Date(t.due_date) < todayDate);
  const keyTasks = open.filter(t => t.key);
  const top = keyTasks[0] ?? overdue[0] ?? open.find(t => t.due_date === today) ?? open[0];

  if (!top) return null;

  return (
    <div className="tx-top-focus">
      <div className="card-eyebrow">🎯 Today&apos;s Single Focus</div>
      <div className="tx-focus-task" onClick={() => onClick(top)} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && onClick(top)}>
        <div className="tx-focus-title">{top.key ? "⭐ " : ""}{top.title}</div>
        <div className="tx-item-meta" style={{ marginTop: 6 }}>
          {top.urgency && <span className="tx-meta-chip" style={{ color: urgencyColor(top.urgency) }}>{URGENCY_OPTS.find(o => o.value === top.urgency)?.label}</span>}
          {top.due_date && <span className="tx-meta-chip">📅 {fmtDate(top.due_date)}</span>}
          {top.category && <span className="tx-meta-chip">{CATEGORY_ICON[top.category]} {top.category}</span>}
          {top.time_estimate_min && <span className="tx-meta-chip">⏱ {fmtDuration(top.time_estimate_min)}</span>}
        </div>
      </div>
      <button className="tx-btn-primary tx-focus-complete" onClick={() => onComplete(top.id)}>
        Mark Complete ✓
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type View = "list" | "kanban" | "ai";

export function TasksPage() {
  const [tasks,     setTasks]     = useState<TaskRow[]>([]);
  const [completed, setCompleted] = useState<TaskRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [view,      setView]      = useState<View>("list");
  const [selected,  setSelected]  = useState<TaskRow | null>(null);
  const [catFilter, setCatFilter] = useState<Category | "">("");

  const load = useCallback(async () => {
    const [open, done] = await Promise.all([
      fetch("/api/tasks?status=open&limit=500").then(r => r.json() as Promise<{ tasks?: TaskRow[] }>),
      fetch("/api/tasks?status=done&limit=100").then(r => r.json() as Promise<{ tasks?: TaskRow[] }>),
    ]);
    setTasks(open.tasks ?? []);
    setCompleted(done.tasks ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleTasks = catFilter ? tasks.filter(t => t.category === catFilter) : tasks;

  const today       = todayKey();
  const now         = new Date();
  const todayDate   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const open        = visibleTasks.filter(t => !t.completed_at);
  const overdueTasks   = open.filter(t => t.due_date && new Date(t.due_date) < todayDate);
  const todayTasks     = open.filter(t => t.due_date === today && !overdueTasks.includes(t));
  const upcomingTasks  = open.filter(t => t.due_date && t.due_date > today);
  const workTasks      = open.filter(t => t.category === "Work" || !!t.entity_id);
  const goalTasks      = open.filter(t => t.key || t.category === "Learning");
  const inboxTasks     = open.filter(t => !overdueTasks.includes(t) && !todayTasks.includes(t) && !upcomingTasks.includes(t));

  async function completeTask(id: string) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    const completing = !t.completed_at;
    const completed_at = completing ? new Date().toISOString() : null;
    const res = await fetch(`/api/tasks/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed_at, kanban_status: completing ? "done" : "inbox" }),
    }).then(r => r.json() as Promise<{ task?: TaskRow }>);
    if (res.task) {
      if (completing) {
        setTasks(prev => prev.filter(x => x.id !== id));
        setCompleted(prev => [res.task!, ...prev]);
      } else {
        setCompleted(prev => prev.filter(x => x.id !== id));
        setTasks(prev => [res.task!, ...prev]);
      }
    }
  }

  function addTask(task: TaskRow) { setTasks(prev => [task, ...prev]); }

  function updateTask(updated: TaskRow) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setCompleted(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelected(null);
  }

  function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
    setCompleted(prev => prev.filter(t => t.id !== id));
  }

  return (
    <div className="tx-page">
      {/* Page header */}
      <div className="tx-page-header">
        <div>
          <h1 className="tx-page-title">Execution Center</h1>
          <p className="tx-page-sub">Your mission control for tasks, goals &amp; daily execution</p>
        </div>
        <AddTaskForm onAdd={addTask} />
      </div>

      {/* Overview bar */}
      {!loading && <OverviewBar tasks={[...tasks, ...completed]} completedToday={completed} />}

      {/* Today's focus */}
      {!loading && <TopFocusCard tasks={tasks} onComplete={completeTask} onClick={setSelected} />}

      {/* Category filter */}
      <div className="tx-cat-filters">
        <button className={`tx-cat-btn${catFilter === "" ? " tx-cat-active" : ""}`} onClick={() => setCatFilter("")}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} className={`tx-cat-btn${catFilter === c ? " tx-cat-active" : ""}`} onClick={() => setCatFilter(c)}>
            {CATEGORY_ICON[c]} {c}
          </button>
        ))}
      </div>

      {/* View tabs */}
      <div className="tx-tabs">
        {(["list", "kanban", "ai"] as View[]).map(v => (
          <button key={v} className={`tx-tab${view === v ? " tx-tab-active" : ""}`} onClick={() => setView(v)}>
            {v === "list" ? "📋 List" : v === "kanban" ? "📌 Kanban" : "🤖 AI Focus"}
          </button>
        ))}
      </div>

      {loading && <div className="tx-loading">Loading tasks…</div>}

      {/* LIST VIEW */}
      {!loading && view === "list" && (
        <div className="tx-list-view">
          {overdueTasks.length > 0 && (
            <TaskSection title="Overdue" icon="🔴" tasks={overdueTasks} accent="#dc2626"
              onComplete={completeTask} onUpdate={updateTask} onDelete={deleteTask} onTaskClick={setSelected} />
          )}
          <TaskSection title="Today" icon="🎯" tasks={todayTasks}
            onComplete={completeTask} onUpdate={updateTask} onDelete={deleteTask} onTaskClick={setSelected}
            onAdd={addTask} defaultKanban="today" />
          <TaskSection title="Upcoming" icon="📅" tasks={upcomingTasks} collapsible
            onComplete={completeTask} onUpdate={updateTask} onDelete={deleteTask} onTaskClick={setSelected}
            onAdd={addTask} defaultKanban="next" />
          <TaskSection title="Work" icon="💼" tasks={workTasks} collapsible
            onComplete={completeTask} onUpdate={updateTask} onDelete={deleteTask} onTaskClick={setSelected}
            onAdd={addTask} defaultKanban="next" />
          <TaskSection title="Goal-Related" icon="⭐" tasks={goalTasks} collapsible
            onComplete={completeTask} onUpdate={updateTask} onDelete={deleteTask} onTaskClick={setSelected}
            onAdd={addTask} defaultKanban="next" />
          <TaskSection title="Inbox" icon="📥" tasks={inboxTasks} collapsible
            onComplete={completeTask} onUpdate={updateTask} onDelete={deleteTask} onTaskClick={setSelected}
            onAdd={addTask} defaultKanban="inbox" />
          <TaskSection title="Completed" icon="✅" tasks={completed.slice(0, 20)} collapsible
            onComplete={completeTask} onUpdate={updateTask} onDelete={deleteTask} onTaskClick={setSelected} />
        </div>
      )}

      {/* KANBAN VIEW */}
      {!loading && view === "kanban" && (
        <KanbanBoard
          tasks={visibleTasks}
          onComplete={completeTask} onUpdate={updateTask} onDelete={deleteTask}
          onClick={setSelected} onAdd={addTask}
        />
      )}

      {/* AI VIEW */}
      {!loading && view === "ai" && <AIAssistant tasks={visibleTasks} />}

      {/* Task detail modal */}
      {selected && (
        <TaskModal
          task={selected}
          onClose={() => setSelected(null)}
          onUpdate={updateTask}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
}
