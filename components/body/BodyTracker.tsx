"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import type { BodyMeasurement } from "@/app/api/body/route";

const FIELDS: { key: keyof BodyMeasurement; label: string; unit: string; goal?: number }[] = [
  { key: "weight_kg", label: "Weight",     unit: "kg",  goal: 60 },
  { key: "waist_cm",  label: "Waist",      unit: "cm" },
  { key: "hips_cm",   label: "Hips",       unit: "cm" },
  { key: "chest_cm",  label: "Chest",      unit: "cm" },
  { key: "arm_cm",    label: "Arm",        unit: "cm" },
  { key: "thigh_cm",  label: "Thigh",      unit: "cm" },
];

export function BodyTracker() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState<Record<string, string>>({});
  const [saving, setSaving]             = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/body?days=180");
    const j = await r.json() as { measurements?: BodyMeasurement[] };
    setMeasurements((j.measurements ?? []).reverse());
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    setSaving(true);
    const body: Record<string, number | null | string> = {};
    for (const f of FIELDS) {
      const v = form[f.key as string];
      body[f.key as string] = v ? parseFloat(v) : null;
    }
    body["notes"] = form["notes"] ?? null;
    await fetch("/api/body", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setForm({});
    setShowForm(false);
    setSaving(false);
    void load();
  }

  // Latest measurement
  const latest  = measurements[measurements.length - 1];
  const previous = measurements[measurements.length - 2];

  function delta(key: keyof BodyMeasurement) {
    if (!latest || !previous) return null;
    const a = latest[key] as number | null;
    const b = previous[key] as number | null;
    if (a === null || b === null) return null;
    return Math.round((a - b) * 10) / 10;
  }

  // Progress to goal (weight: 85 → 60)
  const startWeight = 85;
  const goalWeight  = 60;
  const currentWeight = latest?.weight_kg ?? startWeight;
  const weightProgress = Math.max(0, Math.min(100, ((startWeight - currentWeight) / (startWeight - goalWeight)) * 100));

  return (
    <div className="bt-shell">
      <PageHeader
        title="Body Measurements"
        subtitle="Track progress beyond the scale"
        action={<button className="bt-btn-primary" onClick={() => setShowForm(true)}>+ Log today</button>}
      />

      {/* Goal progress */}
      <div className="bt-goal-card">
        <div className="bt-goal-header">
          <span className="bt-goal-label">Weight Goal Progress</span>
          <span className="bt-goal-pct">{Math.round(weightProgress)}%</span>
        </div>
        <div className="bt-goal-bar">
          <div className="bt-goal-fill" style={{ width: `${weightProgress}%` }} />
        </div>
        <div className="bt-goal-range">
          <span>Start: {startWeight} kg</span>
          <span className="bt-goal-current">{currentWeight} kg now</span>
          <span>Goal: {goalWeight} kg</span>
        </div>
        <p className="bt-goal-note">
          {startWeight - currentWeight > 0
            ? `${Math.round((startWeight - currentWeight) * 10) / 10} kg lost · ${Math.round((currentWeight - goalWeight) * 10) / 10} kg to go`
            : "Keep going — every session counts!"}
        </p>
      </div>

      {/* Latest snapshot */}
      {latest && (
        <div className="bt-latest-grid">
          {FIELDS.map(f => {
            const val = latest[f.key] as number | null;
            const d   = delta(f.key);
            if (val === null) return null;
            return (
              <div key={f.key as string} className="bt-metric-card">
                <div className="bt-metric-label">{f.label}</div>
                <div className="bt-metric-value">{val}<span className="bt-metric-unit">{f.unit}</span></div>
                {d !== null && (
                  <div className={`bt-metric-delta ${f.key === "weight_kg" ? (d < 0 ? "positive" : "negative") : ""}`}>
                    {d > 0 ? "+" : ""}{d} {f.unit} vs last
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Log form */}
      {showForm && (
        <div className="bt-form-card">
          <div className="bt-form-title">Log Measurements</div>
          <div className="bt-form-grid">
            {FIELDS.map(f => (
              <div key={f.key as string} className="bt-form-field">
                <label className="bt-form-label">{f.label} ({f.unit})</label>
                <input
                  className="bt-input"
                  type="number"
                  step="0.1"
                  placeholder={f.unit}
                  value={form[f.key as string] ?? ""}
                  onChange={e => setForm(prev => ({ ...prev, [f.key as string]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <input className="bt-input" placeholder="Notes (optional)" value={form["notes"] ?? ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={{ marginTop: 10 }} />
          <div className="bt-form-actions">
            <button className="bt-btn-primary" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button className="bt-btn" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* History table */}
      <div className="bt-history">
        <div className="bt-history-title">History</div>
        {loading ? <p className="bt-empty">Loading…</p> : measurements.length === 0 ? (
          <p className="bt-empty">No measurements yet. Log your first one above!</p>
        ) : (
          <div className="bt-table-wrap">
            <table className="bt-table">
              <thead>
                <tr>
                  <th>Date</th>
                  {FIELDS.map(f => <th key={f.key as string}>{f.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {[...measurements].reverse().map(m => (
                  <tr key={m.id}>
                    <td className="bt-td-date">{new Date(m.log_date + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                    {FIELDS.map(f => <td key={f.key as string}>{(m[f.key] as number | null) !== null ? `${m[f.key]} ${f.unit}` : "—"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
