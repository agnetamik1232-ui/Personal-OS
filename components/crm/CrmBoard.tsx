"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { TaskRow }                              from "@/app/api/tasks/route";
import { KanbanView }                                from "./KanbanView";
import { SmartView }                                 from "./SmartView";
import { CategoryView }                              from "./CategoryView";
import { TaskDrawer }                                from "./TaskDrawer";
import type { TierId }                               from "./tiers";

const LS_VIEW_KEY = "personal-os:crm-view";
type ViewId = "kanban" | "smart" | "category";

const VIEWS: { id: ViewId; label: string; icon: string }[] = [
  { id: "kanban",   label: "Kanban",   icon: "⬛" },
  { id: "smart",    label: "Smart ✦",  icon: "✦"  },
  { id: "category", label: "Category", icon: "🏷"  },
];

function lsGetView(): ViewId {
  if (typeof window === "undefined") return "kanban";
  const v = localStorage.getItem(LS_VIEW_KEY);
  return (VIEWS.find((x) => x.id === v)?.id) ?? "kanban";
}

interface DrawerState {
  task:       TaskRow | null;   // null = new task
  newTierId?: TierId;
}

export function CrmBoard() {
  const [view,        setView]       = useState<ViewId>("kanban");
  const [tasks,       setTasks]      = useState<TaskRow[]>([]);
  const [loading,     setLoading]    = useState(true);
  const [loadError,   setLoadError]  = useState<string | null>(null);
  const [drawer,      setDrawer]     = useState<DrawerState | null>(null);
  const [showDone,    setShowDone]   = useState(false);
  const initialized                  = useRef(false);

  // Hydrate view from localStorage after mount
  useEffect(() => { setView(lsGetView()); }, []);

  function switchView(v: ViewId) {
    setView(v);
    localStorage.setItem(LS_VIEW_KEY, v);
  }

  // ── Load tasks ─────────────────────────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try {
      const status = showDone ? "all" : "open";
      const res    = await fetch(`/api/tasks?status=${status}&limit=500`);
      const json   = await res.json() as { tasks?: TaskRow[]; error?: string };
      if (!res.ok) { setLoadError(json.error ?? "Load failed"); return; }
      setTasks(json.tasks ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [showDone]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!initialized.current) return;
    void loadTasks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDone]);

  // ── Drawer handlers ────────────────────────────────────────────────────────
  function openDrawer(task: TaskRow) { setDrawer({ task }); }
  function openNew(tierId: TierId)   { setDrawer({ task: null, newTierId: tierId }); }
  function closeDrawer()             { setDrawer(null); }

  function handleSaved(saved: TaskRow) {
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === saved.id);
      return exists
        ? prev.map((t) => t.id === saved.id ? saved : t)
        : [saved, ...prev];
    });
    setDrawer(null);
  }

  function handleDeleted(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setDrawer(null);
  }

  function handleReorder(reordered: TaskRow[]) {
    setTasks(reordered);
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const openCount = tasks.filter((t) => !t.completed_at).length;
  const keyCount  = tasks.filter((t) => t.key && !t.completed_at).length;
  const doneCount = tasks.filter((t) =>  t.completed_at).length;

  return (
    <div className="crm-board">
      {/* ── Toolbar ── */}
      <div className="crm-toolbar">
        <div className="crm-toolbar-left">
          <h1 className="crm-heading">CRM</h1>
          <div className="crm-stats">
            <span className="crm-stat">{openCount} open</span>
            {keyCount > 0 && <span className="crm-stat crm-stat-key">🔑 {keyCount} key</span>}
            {doneCount > 0 && <span className="crm-stat crm-stat-done">{doneCount} done</span>}
          </div>
        </div>

        <div className="crm-toolbar-right">
          {/* View tabs */}
          <div className="crm-tabs" role="tablist">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                role="tab"
                aria-selected={view === v.id}
                className={`crm-tab${view === v.id ? " crm-tab-active" : ""}`}
                onClick={() => switchView(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>

          <label className="crm-done-toggle">
            <input
              type="checkbox"
              checked={showDone}
              onChange={(e) => setShowDone(e.target.checked)}
            />
            Show done
          </label>

          <button
            className="crm-refresh"
            onClick={() => void loadTasks()}
            disabled={loading}
            aria-label="Refresh tasks"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
              style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}
              aria-hidden>
              <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5c1.8 0 3.4.86 4.4 2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M11 4.5 12.5 5 13.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button className="crm-new-btn" onClick={() => openNew("today")}>
            + New task
          </button>
        </div>
      </div>

      {/* ── Error bar ── */}
      {loadError && (
        <div className="crm-error-bar">
          ⚠ {loadError}
          <button onClick={() => void loadTasks()}>Retry</button>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && tasks.length === 0 && (
        <div className="crm-loading">
          {[0,1,2,3].map((i) => (
            <div key={i} className="crm-loading-col">
              {[0,1,2].map((j) => (
                <div key={j} className="crm-loading-card" style={{ opacity: 1 - j * 0.25 }} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Views ── */}
      {!loading || tasks.length > 0 ? (
        <div className="crm-view-wrap">
          {view === "kanban" && (
            <KanbanView
              tasks={tasks}
              onOpen={openDrawer}
              onNewTask={openNew}
              onUpdate={(t) => setTasks((prev) => prev.map((x) => x.id === t.id ? t : x))}
              onReorder={handleReorder}
            />
          )}
          {view === "smart" && (
            <SmartView tasks={tasks.filter((t) => !t.completed_at)} onOpen={openDrawer} />
          )}
          {view === "category" && (
            <CategoryView tasks={tasks} onOpen={openDrawer} />
          )}
        </div>
      ) : null}

      {/* ── Drawer ── */}
      {drawer !== null && (
        <TaskDrawer
          task={drawer.task}
          newTierId={drawer.newTierId}
          onClose={closeDrawer}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
