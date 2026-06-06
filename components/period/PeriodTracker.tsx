"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import type { PeriodLog } from "@/app/api/period/route";

const FLOW_OPTIONS = ["none","spotting","light","medium","heavy"] as const;
const FLOW_COLORS: Record<string, string> = { none:"#e5e7eb", spotting:"#fde8e8", light:"#fca5a5", medium:"#f87171", heavy:"#dc2626" };
const SYMPTOMS = ["cramps","bloating","mood_swings","fatigue","headache","acne","cravings","breast_tenderness"] as const;
const MOODS = [
  { value: "great", emoji: "😊", label: "Great" },
  { value: "good",  emoji: "🙂", label: "Good" },
  { value: "okay",  emoji: "😐", label: "Okay" },
  { value: "low",   emoji: "😔", label: "Low" },
  { value: "bad",   emoji: "😢", label: "Bad" },
];

function getLastNDates(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0]!;
  }).reverse();
}

export function PeriodTracker() {
  const [logs, setLogs]       = useState<PeriodLog[]>([]);
  const [, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]!);
  const [flow, setFlow]       = useState<string>("none");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [mood, setMood]       = useState<string>("");
  const [pain, setPain]       = useState<number>(0);
  const [notes, setNotes]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/period?days=120");
    const j = await r.json() as { logs?: PeriodLog[] };
    setLogs(j.logs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // When date changes, prefill from existing log
  useEffect(() => {
    const existing = logs.find(l => l.log_date === selectedDate);
    if (existing) {
      setFlow(existing.flow ?? "none");
      setSymptoms(existing.symptoms ?? []);
      setMood(existing.mood ?? "");
      setPain(existing.pain_level ?? 0);
      setNotes(existing.notes ?? "");
    } else {
      setFlow("none"); setSymptoms([]); setMood(""); setPain(0); setNotes("");
    }
  }, [selectedDate, logs]);

  function toggleSymptom(s: string) {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function save() {
    setSaving(true);
    await fetch("/api/period", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ log_date: selectedDate, flow, symptoms, mood: mood || null, pain_level: pain || null, notes: notes || null }) });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    void load();
  }

  // Last 28 days for calendar
  const last28 = getLastNDates(28);
  const logMap = Object.fromEntries(logs.map(l => [l.log_date, l]));

  // Cycle analysis
  const periodDays = logs.filter(l => l.flow && l.flow !== "none").map(l => l.log_date).sort();
  const lastPeriod = periodDays[periodDays.length - 1];
  const daysSinceLastPeriod = lastPeriod
    ? Math.round((new Date().getTime() - new Date(lastPeriod + "T12:00:00").getTime()) / 86400000)
    : null;

  return (
    <div className="pt-shell">
      <PageHeader title="Period Tracker" subtitle="Cycle tracking for PCOS management" />

      {/* Cycle overview */}
      <div className="pt-overview-row">
        <div className="pt-overview-card">
          <div className="pt-ov-label">Days since last period</div>
          <div className="pt-ov-value">{daysSinceLastPeriod !== null ? `${daysSinceLastPeriod}d` : "—"}</div>
        </div>
        <div className="pt-overview-card">
          <div className="pt-ov-label">Days tracked</div>
          <div className="pt-ov-value">{logs.length}</div>
        </div>
        <div className="pt-overview-card">
          <div className="pt-ov-label">Period days (last 4 months)</div>
          <div className="pt-ov-value">{periodDays.length}</div>
        </div>
        <div className="pt-overview-card pt-pcos-note">
          <div className="pt-ov-label">PCOS reminder</div>
          <div className="pt-ov-small">Irregular cycles are normal with PCOS. Track consistently to spot your patterns.</div>
        </div>
      </div>

      {/* 28-day visual calendar */}
      <div className="pt-calendar-card">
        <div className="pt-calendar-title">Last 28 days</div>
        <div className="pt-calendar-grid">
          {last28.map(date => {
            const log = logMap[date];
            const flowVal = log?.flow ?? "none";
            const isToday = date === new Date().toISOString().split("T")[0]!;
            return (
              <button key={date} className={`pt-cal-day${isToday ? " today" : ""}${date === selectedDate ? " selected" : ""}`}
                onClick={() => setSelectedDate(date)}
                style={{ background: FLOW_COLORS[flowVal] ?? "#e5e7eb" }}
                title={date}>
                <span className="pt-cal-num">{new Date(date + "T12:00:00").getDate()}</span>
                {log?.mood && <span className="pt-cal-mood">{MOODS.find(m => m.value === log.mood)?.emoji}</span>}
              </button>
            );
          })}
        </div>
        <div className="pt-legend">
          {FLOW_OPTIONS.map(f => <span key={f} className="pt-legend-item"><span className="pt-legend-dot" style={{ background: FLOW_COLORS[f] }} />{f}</span>)}
        </div>
      </div>

      {/* Log form for selected date */}
      <div className="pt-log-card">
        <div className="pt-log-title">
          Log for {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </div>

        {/* Flow */}
        <div className="pt-field">
          <label className="pt-label">Flow</label>
          <div className="pt-flow-row">
            {FLOW_OPTIONS.map(f => (
              <button key={f} className={`pt-flow-btn${flow === f ? " active" : ""}`}
                style={flow === f ? { background: FLOW_COLORS[f], borderColor: FLOW_COLORS[f] } : {}}
                onClick={() => setFlow(f)}>{f}</button>
            ))}
          </div>
        </div>

        {/* Mood */}
        <div className="pt-field">
          <label className="pt-label">Mood</label>
          <div className="pt-mood-row">
            {MOODS.map(m => (
              <button key={m.value} className={`pt-mood-btn${mood === m.value ? " active" : ""}`}
                onClick={() => setMood(m.value)}>
                <span className="pt-mood-emoji">{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Symptoms */}
        <div className="pt-field">
          <label className="pt-label">Symptoms</label>
          <div className="pt-symptoms-grid">
            {SYMPTOMS.map(s => (
              <button key={s} className={`pt-symptom-btn${symptoms.includes(s) ? " active" : ""}`}
                onClick={() => toggleSymptom(s)}>
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Pain */}
        <div className="pt-field">
          <label className="pt-label">Pain level: <strong>{pain}/10</strong></label>
          <input type="range" min={0} max={10} value={pain} onChange={e => setPain(parseInt(e.target.value))} className="pt-slider" />
        </div>

        {/* Notes */}
        <textarea className="pt-textarea" rows={2} placeholder="Any notes…" value={notes} onChange={e => setNotes(e.target.value)} />

        <button className="pt-save-btn" onClick={() => void save()} disabled={saving}>
          {saved ? "✓ Saved!" : saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
