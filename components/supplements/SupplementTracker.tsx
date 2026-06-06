"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Supplement } from "@/app/api/supplements/route";

const TIMING_LABELS: Record<string, string> = {
  morning: "☀️ Morning", afternoon: "🕐 Afternoon", evening: "🌆 Evening",
  with_meal: "🍽️ With Meal", before_bed: "🌙 Before Bed",
};

const PCOS_DEFAULTS = [
  { name: "Inositol (Myo + D-Chiro)", dose: "2g + 200mg", timing: "morning" },
  { name: "Vitamin D3 + K2",          dose: "2000 IU",    timing: "morning" },
  { name: "Magnesium Glycinate",       dose: "400mg",      timing: "before_bed" },
  { name: "Omega-3 Fish Oil",          dose: "1000mg",     timing: "with_meal" },
  { name: "Creatine Monohydrate",      dose: "5g",         timing: "morning" },
];

export function SupplementTracker() {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [newName, setNewName]         = useState("");
  const [newDose, setNewDose]         = useState("");
  const [newTiming, setNewTiming]     = useState("morning");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/supplements");
    const j = await r.json() as { supplements?: Supplement[] };
    setSupplements(j.supplements ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggle(s: Supplement) {
    const action = s.taken ? "untake" : "take";
    await fetch("/api/supplements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id: s.id }) });
    setSupplements(prev => prev.map(x => x.id === s.id ? { ...x, taken: !x.taken } : x));
  }

  async function addSupplement() {
    if (!newName.trim()) return;
    const r = await fetch("/api/supplements", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", name: newName.trim(), dose: newDose || null, timing: newTiming }) });
    const j = await r.json() as { supplement?: Supplement };
    if (j.supplement) { setSupplements(prev => [...prev, j.supplement!]); setNewName(""); setNewDose(""); setShowAdd(false); }
  }

  async function remove(id: string) {
    await fetch(`/api/supplements?id=${id}`, { method: "DELETE" });
    setSupplements(prev => prev.filter(s => s.id !== id));
  }

  async function addDefaults() {
    for (const s of PCOS_DEFAULTS) {
      await fetch("/api/supplements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", ...s }) });
    }
    void load();
  }

  const taken = supplements.filter(s => s.taken).length;
  const total = supplements.length;
  const byTiming = supplements.reduce<Record<string, Supplement[]>>((acc, s) => {
    (acc[s.timing] ??= []).push(s); return acc;
  }, {});

  return (
    <div className="sp-shell">
      <PageHeader title="Supplements" subtitle="Daily PCOS supplement tracker"
        action={<button className="sp-btn-primary" onClick={() => setShowAdd(true)}>+ Add</button>} />

      {/* Progress */}
      {total > 0 && (
        <div className="sp-progress-card">
          <div className="sp-progress-header">
            <span>Today&apos;s progress</span>
            <span className="sp-progress-count">{taken} / {total} taken</span>
          </div>
          <div className="sp-progress-bar"><div className="sp-progress-fill" style={{ width: `${total > 0 ? (taken/total)*100 : 0}%` }} /></div>
          {taken === total && total > 0 && <p className="sp-all-done">✅ All supplements taken today!</p>}
        </div>
      )}

      {/* Empty state with PCOS defaults */}
      {!loading && total === 0 && (
        <div className="sp-empty-card">
          <p className="sp-empty-text">No supplements added yet.</p>
          <button className="sp-btn-primary" onClick={() => void addDefaults()}>Add PCOS defaults</button>
          <p className="sp-empty-sub">Adds: Inositol, Vitamin D3, Magnesium, Omega-3, Creatine</p>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="sp-form-card">
          <div className="sp-form-row">
            <input className="sp-input" placeholder="Supplement name *" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 2 }} />
            <input className="sp-input" placeholder="Dose (e.g. 400mg)" value={newDose} onChange={e => setNewDose(e.target.value)} />
            <select className="sp-select" value={newTiming} onChange={e => setNewTiming(e.target.value)}>
              {Object.entries(TIMING_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="sp-form-actions">
            <button className="sp-btn-primary" onClick={() => void addSupplement()} disabled={!newName.trim()}>Add</button>
            <button className="sp-btn" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Supplements grouped by timing */}
      {loading ? <p className="sp-loading">Loading…</p> : (
        Object.entries(TIMING_LABELS).map(([timing, label]) => {
          const items = byTiming[timing] ?? [];
          if (items.length === 0) return null;
          return (
            <div key={timing} className="sp-group">
              <div className="sp-group-label">{label}</div>
              {items.map(s => (
                <div key={s.id} className={`sp-item${s.taken ? " taken" : ""}`}>
                  <button className="sp-check" onClick={() => void toggle(s)}>
                    {s.taken ? "✓" : ""}
                  </button>
                  <div className="sp-item-info">
                    <span className="sp-item-name">{s.name}</span>
                    {s.dose && <span className="sp-item-dose">{s.dose}</span>}
                  </div>
                  <button className="sp-remove" onClick={() => void remove(s.id)}>×</button>
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
