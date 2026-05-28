"use client";

import { useState, useEffect, useRef } from "react";
import type { TaskRow }                 from "@/app/api/tasks/route";
import { TIERS, tierToUrgency }         from "./tiers";

interface Props {
  task:       TaskRow | null;   // null = new task mode
  newTierId?: string | undefined;  // pre-fill tier for new tasks
  onClose:    () => void;
  onSaved:    (task: TaskRow) => void;
  onDeleted:  (id: string)    => void;
}

type DraftField = Partial<Omit<TaskRow, "id" | "created_at" | "updated_at" | "entity_name">>;

function initDraft(task: TaskRow | null, newTierId?: string): DraftField {
  if (!task) {
    const tier = TIERS.find((t) => t.id === newTierId) ?? TIERS[3]!;
    return { title: "", urgency: tierToUrgency(tier.id), key: false, tags: [], description: null,
             due_date: null, owner: null, entity_id: null, time_estimate_min: null,
             priority_score: null, completed_at: null };
  }
  return {
    title:             task.title,
    description:       task.description,
    urgency:           task.urgency,
    key:               task.key,
    priority_score:    task.priority_score,
    time_estimate_min: task.time_estimate_min,
    tags:              [...task.tags],
    due_date:          task.due_date,
    entity_id:         task.entity_id,
    owner:             task.owner,
    completed_at:      task.completed_at,
  };
}

export function TaskDrawer({ task, newTierId, onClose, onSaved, onDeleted }: Props) {
  const isNew   = task === null;
  const [draft,   setDraft]   = useState<DraftField>(() => initDraft(task, newTierId));
  const [saving,  setSaving]  = useState(false);
  const [deleting,setDeleting]= useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const firstInputRef         = useRef<HTMLInputElement>(null);

  // Re-initialise when task prop changes
  useEffect(() => {
    setDraft(initDraft(task, newTierId));
    setError(null);
    setConfirm(false);
  }, [task, newTierId]);

  // Focus first field & Esc handler
  useEffect(() => {
    firstInputRef.current?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function set<K extends keyof DraftField>(k: K, v: DraftField[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  async function save() {
    if (!draft.title?.trim()) { setError("Title is required"); return; }
    setSaving(true); setError(null);
    try {
      const body: Record<string, unknown> = {
        title:             draft.title?.trim(),
        description:       draft.description || null,
        urgency:           draft.urgency || null,
        key:               draft.key ?? false,
        priority_score:    draft.priority_score ?? null,
        time_estimate_min: draft.time_estimate_min ?? null,
        tags:              draft.tags ?? [],
        due_date:          draft.due_date || null,
        entity_id:         draft.entity_id || null,
        owner:             draft.owner || null,
        completed_at:      draft.completed_at ?? null,
      };

      const url    = isNew ? "/api/tasks" : `/api/tasks/${task.id}`;
      const method = isNew ? "POST"       : "PATCH";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json   = await res.json() as { task?: TaskRow; error?: string };
      if (!res.ok) { setError(json.error ?? "Save failed"); return; }
      onSaved(json.task!);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!task) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json() as { error?: string }; setError(j.error ?? "Delete failed"); return; }
      onDeleted(task.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setDeleting(false);
    }
  }

  async function toggleComplete() {
    if (!task) return;
    const completed_at = draft.completed_at ? null : new Date().toISOString();
    set("completed_at", completed_at);
    setSaving(true);
    try {
      const res  = await fetch(`/api/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed_at }) });
      const json = await res.json() as { task?: TaskRow; error?: string };
      if (!res.ok) { setError(json.error ?? "Failed"); return; }
      onSaved(json.task!);
    } finally {
      setSaving(false);
    }
  }

  const tagString = (draft.tags ?? []).join(", ");

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden />
      <aside className="drawer" role="dialog" aria-modal aria-label={isNew ? "New task" : "Edit task"}>

        {/* Header */}
        <div className="drawer-header">
          <h2 className="drawer-title">{isNew ? "New Task" : "Edit Task"}</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {!isNew && (
              <button
                className={`drawer-complete-btn${draft.completed_at ? " drawer-complete-btn-done" : ""}`}
                onClick={() => void toggleComplete()}
                disabled={saving}
              >
                {draft.completed_at ? "↺ Reopen" : "✓ Complete"}
              </button>
            )}
            <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="drawer-body">

          <div className="drawer-field">
            <label className="drawer-label">Title</label>
            <input
              ref={firstInputRef}
              className="drawer-input"
              value={draft.title ?? ""}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Task title"
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void save(); }}
            />
          </div>

          <div className="drawer-field">
            <label className="drawer-label">Description</label>
            <textarea
              className="drawer-textarea"
              value={draft.description ?? ""}
              onChange={(e) => set("description", e.target.value || null)}
              placeholder="Notes, context, links…"
              rows={3}
            />
          </div>

          <div className="drawer-row-2">
            <div className="drawer-field">
              <label className="drawer-label">Urgency</label>
              <select
                className="drawer-select"
                value={draft.urgency ?? "someday"}
                onChange={(e) => set("urgency", e.target.value)}
              >
                {TIERS.map((t) => (
                  <option key={t.id} value={tierToUrgency(t.id)}>{t.dot} {t.label}</option>
                ))}
              </select>
            </div>

            <div className="drawer-field">
              <label className="drawer-label">Due date</label>
              <input
                type="date"
                className="drawer-input"
                value={draft.due_date ?? ""}
                onChange={(e) => set("due_date", e.target.value || null)}
              />
            </div>
          </div>

          <div className="drawer-row-2">
            <div className="drawer-field">
              <label className="drawer-label">Owner</label>
              <input
                className="drawer-input"
                value={draft.owner ?? ""}
                onChange={(e) => set("owner", e.target.value || null)}
                placeholder="e.g. me, John"
              />
            </div>
            <div className="drawer-field">
              <label className="drawer-label">Time estimate (min)</label>
              <input
                type="number"
                className="drawer-input"
                value={draft.time_estimate_min ?? ""}
                onChange={(e) => set("time_estimate_min", e.target.value ? Number(e.target.value) : null)}
                placeholder="e.g. 30"
                min={0}
              />
            </div>
          </div>

          <div className="drawer-row-2">
            <div className="drawer-field">
              <label className="drawer-label">Priority score</label>
              <input
                type="number"
                className="drawer-input"
                value={draft.priority_score ?? ""}
                onChange={(e) => set("priority_score", e.target.value ? Number(e.target.value) : null)}
                placeholder="0–100"
                min={0} max={100} step={0.1}
              />
            </div>
            <div className="drawer-field">
              <label className="drawer-label">Key task</label>
              <button
                className={`drawer-key-btn${draft.key ? " drawer-key-btn-on" : ""}`}
                onClick={() => set("key", !draft.key)}
                aria-pressed={draft.key}
              >
                🔑 {draft.key ? "Key task" : "Not key"}
              </button>
            </div>
          </div>

          <div className="drawer-field">
            <label className="drawer-label">Tags <span className="drawer-label-hint">(comma-separated)</span></label>
            <input
              className="drawer-input"
              value={tagString}
              onChange={(e) => set("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="e.g. fundraising, q2, urgent"
            />
          </div>

          <div className="drawer-field">
            <label className="drawer-label">Entity ID <span className="drawer-label-hint">(UUID)</span></label>
            <input
              className="drawer-input"
              value={draft.entity_id ?? ""}
              onChange={(e) => set("entity_id", e.target.value || null)}
              placeholder="Linked entity"
            />
          </div>

          {error && <p className="drawer-error">{error}</p>}
        </div>

        {/* Footer */}
        <div className="drawer-footer">
          {!isNew && (
            confirm
              ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="modal-btn modal-btn-ghost" onClick={() => setConfirm(false)}>Cancel</button>
                  <button
                    className="drawer-delete-confirm-btn"
                    onClick={() => void doDelete()}
                    disabled={deleting}
                  >{deleting ? "Deleting…" : "Confirm delete"}</button>
                </div>
              )
              : (
                <button className="drawer-delete-btn" onClick={() => setConfirm(true)}>
                  Delete
                </button>
              )
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="modal-btn modal-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="modal-btn modal-btn-primary" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : isNew ? "Create task" : "Save"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
