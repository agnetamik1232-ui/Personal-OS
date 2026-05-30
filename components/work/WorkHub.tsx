"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { WorkIssue }  from "@/app/api/work/issues/route";
import type { WorkNote }   from "@/app/api/work/notes/route";
import type { WorkIdea }   from "@/app/api/work/ideas/route";
import type { WorkDefect } from "@/app/api/work/defects/route";
import type { ChecklistItem } from "@/app/api/work/checklist/route";

// ── helpers ──────────────────────────────────────────────────────────────────

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function shiftLabel() {
  const h = new Date().getHours();
  if (h >= 6  && h < 14) return "Morning Shift";
  if (h >= 14 && h < 22) return "Afternoon Shift";
  return "Night Shift";
}

function priorityColor(p: string) {
  if (p === "critical") return "#ef4444";
  if (p === "high")     return "#f97316";
  if (p === "medium")   return "#eab308";
  return "#6b7280";
}

function impactBadge(i: string) {
  if (i === "high")   return "wh-badge-red";
  if (i === "medium") return "wh-badge-yellow";
  return "wh-badge-gray";
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    open: "wh-badge-red", in_progress: "wh-badge-yellow", resolved: "wh-badge-green",
    closed: "wh-badge-gray", pending: "wh-badge-gray", approved: "wh-badge-green",
    implemented: "wh-badge-green", rejected: "wh-badge-gray",
  };
  return map[s] ?? "wh-badge-gray";
}

// ── Tab type ─────────────────────────────────────────────────────────────────

type Tab = "today" | "issues" | "notes" | "ideas" | "defects";

// ── Main component ───────────────────────────────────────────────────────────

export function WorkHub() {
  const [tab, setTab] = useState<Tab>("today");

  return (
    <div className="wh-shell">
      {/* Header */}
      <div className="wh-header">
        <div>
          <h1 className="wh-title">Work Hub</h1>
          <p className="wh-subtitle">{todayLabel()} · {shiftLabel()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="wh-tabs">
        {(["today","issues","notes","ideas","defects"] as Tab[]).map(t => (
          <button key={t} className={`wh-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
            {t === "today" ? "Today" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="wh-body">
        {tab === "today"   && <TodayPanel />}
        {tab === "issues"  && <IssuesPanel />}
        {tab === "notes"   && <NotesPanel />}
        {tab === "ideas"   && <IdeasPanel />}
        {tab === "defects" && <DefectsPanel />}
      </div>
    </div>
  );
}

// ── TODAY PANEL ───────────────────────────────────────────────────────────────

function TodayPanel() {
  return (
    <div className="wh-today-grid">
      <ChecklistSection />
      <QuickCaptureSection />
    </div>
  );
}

function ChecklistSection() {
  const [items, setItems]     = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding]   = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/work/checklist");
    const j = await r.json() as { items?: ChecklistItem[] };
    setItems(j.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggle(item: ChecklistItem) {
    const action = item.done ? "uncomplete" : "complete";
    await fetch("/api/work/checklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, item_id: item.id }) });
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, done: !i.done } : i));
  }

  async function addItem() {
    if (!newTitle.trim()) return;
    const r = await fetch("/api/work/checklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", title: newTitle.trim(), period: "daily" }) });
    const j = await r.json() as { item?: ChecklistItem };
    if (j.item) { setItems(prev => [...prev, j.item!]); setNewTitle(""); setAdding(false); }
  }

  async function remove(id: string) {
    await fetch(`/api/work/checklist?id=${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
  }

  const done  = items.filter(i => i.done).length;
  const total = items.length;

  return (
    <div className="wh-card">
      <div className="wh-card-header">
        <span className="wh-card-title">Shift Checklist</span>
        <span className="wh-badge wh-badge-blue">{done}/{total}</span>
      </div>
      {total > 0 && (
        <div className="wh-progress-bar">
          <div className="wh-progress-fill" style={{ width: `${total > 0 ? Math.round(done/total*100) : 0}%` }} />
        </div>
      )}
      {loading ? <p className="wh-empty">Loading…</p> : (
        <ul className="wh-checklist">
          {items.map(item => (
            <li key={item.id} className={`wh-check-item${item.done ? " done" : ""}`}>
              <button className="wh-check-box" onClick={() => toggle(item)}>
                {item.done ? "✓" : ""}
              </button>
              <span className="wh-check-label">{item.title}</span>
              <button className="wh-check-del" onClick={() => remove(item.id)} title="Remove">×</button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <div className="wh-inline-form">
          <input className="wh-input" autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void addItem(); if (e.key === "Escape") setAdding(false); }}
            placeholder="New checklist item…" />
          <button className="wh-btn wh-btn-primary" onClick={() => void addItem()}>Add</button>
          <button className="wh-btn" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      ) : (
        <button className="wh-add-link" onClick={() => setAdding(true)}>+ Add item</button>
      )}
    </div>
  );
}

function QuickCaptureSection() {
  const [text, setText]       = useState("");
  const [category, setCategory] = useState("observation");
  const [saving, setSaving]   = useState(false);
  const [recent, setRecent]   = useState<WorkNote[]>([]);

  const loadRecent = useCallback(async () => {
    const r = await fetch("/api/work/notes?days=1");
    const j = await r.json() as { notes?: WorkNote[] };
    setRecent((j.notes ?? []).slice(0, 5));
  }, []);

  useEffect(() => { void loadRecent(); }, [loadRecent]);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    await fetch("/api/work/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text.trim(), category }) });
    setText("");
    setSaving(false);
    void loadRecent();
  }

  return (
    <div className="wh-card">
      <div className="wh-card-header">
        <span className="wh-card-title">Quick Capture</span>
      </div>
      <textarea className="wh-textarea" rows={3} value={text} onChange={e => setText(e.target.value)}
        placeholder="Log an observation, issue, or note…" />
      <div className="wh-row">
        <select className="wh-select" value={category} onChange={e => setCategory(e.target.value)}>
          {["observation","issue","defect","training","material","machine","quality","handover"].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button className="wh-btn wh-btn-primary" onClick={() => void save()} disabled={saving || !text.trim()}>
          {saving ? "Saving…" : "Save Note"}
        </button>
      </div>
      {recent.length > 0 && (
        <div className="wh-recent">
          <p className="wh-recent-label">Today so far</p>
          {recent.map(n => (
            <div key={n.id} className="wh-recent-item">
              <span className="wh-badge wh-badge-gray">{n.category}</span>
              <span className="wh-recent-text">{n.content}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ISSUES PANEL ──────────────────────────────────────────────────────────────

function IssuesPanel() {
  const [issues, setIssues]   = useState<WorkIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("open");
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/work/issues?status=${filter}`);
    const j = await r.json() as { issues?: WorkIssue[] };
    setIssues(j.issues ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    const patch: Record<string, string> = { status };
    if (status === "resolved") patch["resolved_at"] = new Date().toISOString();
    await fetch(`/api/work/issues/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    void load();
  }

  async function del(id: string) {
    await fetch(`/api/work/issues/${id}`, { method: "DELETE" });
    setIssues(prev => prev.filter(i => i.id !== id));
  }

  return (
    <div>
      <div className="wh-panel-header">
        <div className="wh-filter-row">
          {["open","in_progress","resolved","all"].map(s => (
            <button key={s} className={`wh-filter-btn${filter === s ? " active" : ""}`} onClick={() => setFilter(s)}>
              {s.replace("_"," ")}
            </button>
          ))}
        </div>
        <button className="wh-btn wh-btn-primary" onClick={() => setShowForm(true)}>+ New Issue</button>
      </div>

      {showForm && <IssueForm onSave={() => { setShowForm(false); void load(); }} onCancel={() => setShowForm(false)} />}

      {loading ? <p className="wh-empty">Loading…</p> : issues.length === 0 ? (
        <p className="wh-empty">No {filter === "all" ? "" : filter} issues.</p>
      ) : (
        <div className="wh-list">
          {issues.map(issue => (
            <div key={issue.id} className="wh-issue-card">
              <div className="wh-issue-top">
                <span className="wh-priority-dot" style={{ background: priorityColor(issue.priority) }} />
                <span className="wh-issue-title">{issue.title}</span>
                <span className={`wh-badge ${statusBadge(issue.status)}`}>{issue.status.replace("_"," ")}</span>
              </div>
              {issue.description && <p className="wh-issue-desc">{issue.description}</p>}
              <div className="wh-issue-meta">
                {issue.owner       && <span>👤 {issue.owner}</span>}
                {issue.workstation && <span>🏭 {issue.workstation}</span>}
                {issue.due_date    && <span>📅 {issue.due_date}</span>}
              </div>
              <div className="wh-issue-actions">
                {issue.status === "open"        && <button className="wh-link" onClick={() => updateStatus(issue.id, "in_progress")}>Start</button>}
                {issue.status === "in_progress" && <button className="wh-link" onClick={() => updateStatus(issue.id, "resolved")}>Resolve</button>}
                {issue.status !== "closed"      && <button className="wh-link" onClick={() => updateStatus(issue.id, "closed")}>Close</button>}
                <button className="wh-link wh-link-danger" onClick={() => del(issue.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IssueForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [title, setTitle]         = useState("");
  const [description, setDesc]    = useState("");
  const [priority, setPriority]   = useState("medium");
  const [owner, setOwner]         = useState("");
  const [workstation, setWS]      = useState("");
  const [saving, setSaving]       = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    await fetch("/api/work/issues", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), description: description || null, priority, owner: owner || null, workstation: workstation || null }) });
    setSaving(false);
    onSave();
  }

  return (
    <div className="wh-form-card">
      <h3 className="wh-form-title">New Issue</h3>
      <input className="wh-input" placeholder="Issue title *" value={title} onChange={e => setTitle(e.target.value)} />
      <textarea className="wh-textarea" rows={2} placeholder="Description (optional)" value={description} onChange={e => setDesc(e.target.value)} />
      <div className="wh-form-row">
        <select className="wh-select" value={priority} onChange={e => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <input className="wh-input" placeholder="Owner" value={owner} onChange={e => setOwner(e.target.value)} />
        <input className="wh-input" placeholder="Workstation" value={workstation} onChange={e => setWS(e.target.value)} />
      </div>
      <div className="wh-form-actions">
        <button className="wh-btn wh-btn-primary" onClick={() => void save()} disabled={saving || !title.trim()}>
          {saving ? "Saving…" : "Create Issue"}
        </button>
        <button className="wh-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── NOTES PANEL ───────────────────────────────────────────────────────────────

function NotesPanel() {
  const [notes, setNotes]     = useState<WorkNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [showForm, setShowForm] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    const params = new URLSearchParams({ days: "30" });
    if (q) params.set("q", q);
    const r = await fetch(`/api/work/notes?${params}`);
    const j = await r.json() as { notes?: WorkNote[] };
    setNotes(j.notes ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(""); }, [load]);

  function onSearch(v: string) {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void load(v), 300);
  }

  async function togglePin(note: WorkNote) {
    await fetch("/api/work/notes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: note.id, pinned: !note.pinned }) });
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, pinned: !n.pinned } : n));
  }

  return (
    <div>
      <div className="wh-panel-header">
        <input className="wh-input wh-search" placeholder="Search notes…" value={search} onChange={e => onSearch(e.target.value)} />
        <button className="wh-btn wh-btn-primary" onClick={() => setShowForm(true)}>+ New Note</button>
      </div>
      {showForm && <NoteForm onSave={() => { setShowForm(false); void load(search); }} onCancel={() => setShowForm(false)} />}
      {loading ? <p className="wh-empty">Loading…</p> : notes.length === 0 ? (
        <p className="wh-empty">No notes found.</p>
      ) : (
        <div className="wh-list">
          {notes.map(note => (
            <div key={note.id} className={`wh-note-card${note.pinned ? " pinned" : ""}`}>
              <div className="wh-note-top">
                <span className={`wh-badge wh-badge-gray`}>{note.category}</span>
                <span className="wh-note-date">{note.shift_date}</span>
                <button className="wh-pin-btn" onClick={() => togglePin(note)} title={note.pinned ? "Unpin" : "Pin"}>
                  {note.pinned ? "📌" : "📍"}
                </button>
              </div>
              <p className="wh-note-content">{note.content}</p>
              {note.tags.length > 0 && (
                <div className="wh-tag-row">
                  {note.tags.map(t => <span key={t} className="wh-tag">{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NoteForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [content, setContent]   = useState("");
  const [category, setCategory] = useState("observation");
  const [saving, setSaving]     = useState(false);

  async function save() {
    if (!content.trim()) return;
    setSaving(true);
    await fetch("/api/work/notes", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim(), category }) });
    setSaving(false);
    onSave();
  }

  return (
    <div className="wh-form-card">
      <textarea className="wh-textarea" rows={4} autoFocus placeholder="Note content *" value={content} onChange={e => setContent(e.target.value)} />
      <div className="wh-form-row">
        <select className="wh-select" value={category} onChange={e => setCategory(e.target.value)}>
          {["observation","issue","defect","training","material","machine","quality","handover"].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="wh-form-actions">
        <button className="wh-btn wh-btn-primary" onClick={() => void save()} disabled={saving || !content.trim()}>
          {saving ? "Saving…" : "Save Note"}
        </button>
        <button className="wh-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── IDEAS PANEL ───────────────────────────────────────────────────────────────

function IdeasPanel() {
  const [ideas, setIdeas]     = useState<WorkIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/work/ideas");
    const j = await r.json() as { ideas?: WorkIdea[] };
    setIdeas(j.ideas ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updateStatus(id: string, status: string) {
    await fetch("/api/work/ideas", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    void load();
  }

  return (
    <div>
      <div className="wh-panel-header">
        <span className="wh-panel-title">Improvement Ideas</span>
        <button className="wh-btn wh-btn-primary" onClick={() => setShowForm(true)}>+ New Idea</button>
      </div>
      {showForm && <IdeaForm onSave={() => { setShowForm(false); void load(); }} onCancel={() => setShowForm(false)} />}
      {loading ? <p className="wh-empty">Loading…</p> : ideas.length === 0 ? (
        <p className="wh-empty">No ideas yet. Start capturing improvements!</p>
      ) : (
        <div className="wh-list">
          {ideas.map(idea => (
            <div key={idea.id} className="wh-idea-card">
              <div className="wh-idea-top">
                <span className="wh-idea-title">{idea.title}</span>
                <span className={`wh-badge ${impactBadge(idea.impact)}`}>{idea.impact} impact</span>
                <span className={`wh-badge ${statusBadge(idea.status)}`}>{idea.status}</span>
              </div>
              {idea.description && <p className="wh-idea-desc">{idea.description}</p>}
              <div className="wh-idea-meta">
                <span className="wh-badge wh-badge-gray">{idea.category}</span>
                {idea.owner && <span>👤 {idea.owner}</span>}
              </div>
              <div className="wh-issue-actions">
                {idea.status === "pending"     && <button className="wh-link" onClick={() => updateStatus(idea.id, "approved")}>Approve</button>}
                {idea.status === "approved"    && <button className="wh-link" onClick={() => updateStatus(idea.id, "in_progress")}>Start</button>}
                {idea.status === "in_progress" && <button className="wh-link" onClick={() => updateStatus(idea.id, "implemented")}>Complete</button>}
                {idea.status !== "rejected"    && <button className="wh-link wh-link-danger" onClick={() => updateStatus(idea.id, "rejected")}>Reject</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IdeaForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [title, setTitle]       = useState("");
  const [description, setDesc]  = useState("");
  const [category, setCategory] = useState("process");
  const [impact, setImpact]     = useState("medium");
  const [saving, setSaving]     = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    await fetch("/api/work/ideas", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), description: description || null, category, impact }) });
    setSaving(false);
    onSave();
  }

  return (
    <div className="wh-form-card">
      <input className="wh-input" autoFocus placeholder="Idea title *" value={title} onChange={e => setTitle(e.target.value)} />
      <textarea className="wh-textarea" rows={2} placeholder="Description (optional)" value={description} onChange={e => setDesc(e.target.value)} />
      <div className="wh-form-row">
        <select className="wh-select" value={category} onChange={e => setCategory(e.target.value)}>
          {["process","quality","cost","automation","safety"].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="wh-select" value={impact} onChange={e => setImpact(e.target.value)}>
          <option value="low">Low Impact</option>
          <option value="medium">Medium Impact</option>
          <option value="high">High Impact</option>
        </select>
      </div>
      <div className="wh-form-actions">
        <button className="wh-btn wh-btn-primary" onClick={() => void save()} disabled={saving || !title.trim()}>
          {saving ? "Saving…" : "Submit Idea"}
        </button>
        <button className="wh-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── DEFECTS PANEL ─────────────────────────────────────────────────────────────

function DefectsPanel() {
  const [defects, setDefects] = useState<WorkDefect[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/work/defects?days=7");
    const j = await r.json() as { defects?: WorkDefect[] };
    setDefects(j.defects ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function resolve(id: string) {
    await fetch("/api/work/defects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "resolved" }) });
    void load();
  }

  const totalQty = defects.filter(d => d.status === "open").reduce((s, d) => s + d.quantity, 0);

  return (
    <div>
      <div className="wh-panel-header">
        <div>
          <span className="wh-panel-title">Defects</span>
          {totalQty > 0 && <span className="wh-badge wh-badge-red" style={{ marginLeft: 8 }}>{totalQty} open</span>}
          <span className="wh-panel-sub"> · Last 7 days</span>
        </div>
        <button className="wh-btn wh-btn-primary" onClick={() => setShowForm(true)}>+ Log Defect</button>
      </div>
      {showForm && <DefectForm onSave={() => { setShowForm(false); void load(); }} onCancel={() => setShowForm(false)} />}
      {loading ? <p className="wh-empty">Loading…</p> : defects.length === 0 ? (
        <p className="wh-empty">No defects logged in the last 7 days.</p>
      ) : (
        <div className="wh-list">
          {defects.map(d => (
            <div key={d.id} className={`wh-defect-card${d.status === "resolved" ? " resolved" : ""}`}>
              <div className="wh-defect-top">
                <span className="wh-defect-type">{d.defect_type}</span>
                <span className="wh-defect-qty">×{d.quantity}</span>
                <span className={`wh-badge ${d.status === "resolved" ? "wh-badge-green" : "wh-badge-red"}`}>{d.status}</span>
              </div>
              <div className="wh-defect-meta">
                {d.workstation && <span>🏭 {d.workstation}</span>}
                {d.operator    && <span>👤 {d.operator}</span>}
                <span>📅 {d.shift_date}</span>
              </div>
              {d.root_cause        && <p className="wh-defect-detail"><strong>Root cause:</strong> {d.root_cause}</p>}
              {d.corrective_action && <p className="wh-defect-detail"><strong>Action:</strong> {d.corrective_action}</p>}
              {d.status === "open" && (
                <div className="wh-issue-actions">
                  <button className="wh-link" onClick={() => resolve(d.id)}>Mark Resolved</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DefectForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [defectType, setType]   = useState("");
  const [quantity, setQty]      = useState(1);
  const [workstation, setWS]    = useState("");
  const [operator, setOp]       = useState("");
  const [rootCause, setRC]      = useState("");
  const [corrAction, setCA]     = useState("");
  const [saving, setSaving]     = useState(false);

  async function save() {
    if (!defectType.trim()) return;
    setSaving(true);
    await fetch("/api/work/defects", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defect_type: defectType.trim(), quantity, workstation: workstation || null, operator: operator || null, root_cause: rootCause || null, corrective_action: corrAction || null }) });
    setSaving(false);
    onSave();
  }

  return (
    <div className="wh-form-card">
      <div className="wh-form-row">
        <input className="wh-input" autoFocus placeholder="Defect type *" value={defectType} onChange={e => setType(e.target.value)} style={{ flex: 2 }} />
        <input className="wh-input" type="number" min={1} placeholder="Qty" value={quantity} onChange={e => setQty(parseInt(e.target.value) || 1)} style={{ flex: 0.5 }} />
      </div>
      <div className="wh-form-row">
        <input className="wh-input" placeholder="Workstation" value={workstation} onChange={e => setWS(e.target.value)} />
        <input className="wh-input" placeholder="Operator" value={operator} onChange={e => setOp(e.target.value)} />
      </div>
      <input className="wh-input" placeholder="Root cause" value={rootCause} onChange={e => setRC(e.target.value)} />
      <input className="wh-input" placeholder="Corrective action" value={corrAction} onChange={e => setCA(e.target.value)} />
      <div className="wh-form-actions">
        <button className="wh-btn wh-btn-primary" onClick={() => void save()} disabled={saving || !defectType.trim()}>
          {saving ? "Saving…" : "Log Defect"}
        </button>
        <button className="wh-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
