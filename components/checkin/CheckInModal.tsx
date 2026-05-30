"use client";

import { useState, useCallback } from "react";
import { X, ChevronRight, Check } from "lucide-react";
import {
  MOOD_SCALE, ENERGY_SCALE, SYMPTOMS, WORKOUT_TYPES, CHECKIN_STEPS,
} from "@/lib/checkin/types";
import type { DailyCheckin, CheckinStep } from "@/lib/checkin/types";

// ── Helpers ────────────────────────────────────────────────────────────────────
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Slider component ───────────────────────────────────────────────────────────
function ScaleSlider({
  label, value, onChange, scale, hint,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  scale: Record<number, { label: string; color: string; emoji?: string }>;
  hint?: string;
}) {
  const info = value !== null ? scale[value] : null;
  return (
    <div className="ci-slider-wrap">
      <div className="ci-slider-head">
        <span className="ci-slider-label">{label}</span>
        {info && (
          <span className="ci-slider-val" style={{ color: info.color }}>
            {value} — {"emoji" in info && info.emoji ? `${info.emoji} ` : ""}{info.label}
          </span>
        )}
        {!info && hint && <span className="ci-slider-hint">{hint}</span>}
      </div>
      <input
        type="range" min={1} max={10} step={1}
        value={value ?? 5}
        onChange={e => onChange(parseInt(e.target.value, 10))}
        className="ci-range"
        style={info ? { accentColor: info.color } : undefined}
      />
      <div className="ci-range-labels">
        <span>1</span><span>5</span><span>10</span>
      </div>
    </div>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange, labelOn = "Yes", labelOff = "No" }: {
  value: boolean | null; onChange: (v: boolean) => void;
  labelOn?: string; labelOff?: string;
}) {
  return (
    <div className="ci-toggle-row">
      <button type="button"
        className={`ci-toggle-btn${value === true ? " ci-toggle-active" : ""}`}
        onClick={() => onChange(true)}>
        <Check size={13} /> {labelOn}
      </button>
      <button type="button"
        className={`ci-toggle-btn${value === false ? " ci-toggle-no" : ""}`}
        onClick={() => onChange(false)}>
        <X size={13} /> {labelOff}
      </button>
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface CheckInModalProps {
  existing: DailyCheckin | null;
  onClose: () => void;
  onSaved: (c: DailyCheckin) => void;
}

// ── Main component ─────────────────────────────────────────────────────────────
export function CheckInModal({ existing, onClose, onSaved }: CheckInModalProps) {
  const today = todayKey();
  const [step, setStep] = useState<CheckinStep>("mood");
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState<Partial<DailyCheckin>>({
    date:              today,
    mood:              existing?.mood              ?? null,
    energy:            existing?.energy            ?? null,
    mental_energy:     existing?.mental_energy     ?? null,
    sleep_hours:       existing?.sleep_hours       ?? null,
    sleep_quality:     existing?.sleep_quality     ?? null,
    weight_kg:         existing?.weight_kg         ?? null,
    workout_done:      existing?.workout_done      ?? null,
    workout_type:      existing?.workout_type      ?? null,
    workout_minutes:   existing?.workout_minutes   ?? null,
    digestion:         existing?.digestion         ?? null,
    symptoms:          existing?.symptoms          ?? [],
    biggest_win:       existing?.biggest_win       ?? "",
    biggest_challenge: existing?.biggest_challenge ?? "",
    notes:             existing?.notes             ?? "",
  });

  function set<K extends keyof DailyCheckin>(key: K, value: DailyCheckin[K]) {
    setDraft(prev => ({ ...prev, [key]: value }));
  }

  function toggleSymptom(sym: string) {
    const current = draft.symptoms ?? [];
    set("symptoms", current.includes(sym)
      ? current.filter(s => s !== sym)
      : [...current, sym]);
  }

  const currentIdx = CHECKIN_STEPS.findIndex(s => s.id === step);
  const isLast = currentIdx === CHECKIN_STEPS.length - 1;

  const save = useCallback(async (complete: boolean) => {
    setSaving(true);
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, date: today, completed: complete }),
    }).then(r => r.json() as Promise<{ checkin?: DailyCheckin }>);
    setSaving(false);
    if (res.checkin) onSaved(res.checkin);
  }, [draft, today, onSaved]);

  async function next() {
    if (isLast) {
      await save(true);
    } else {
      const nextStep = CHECKIN_STEPS[currentIdx + 1];
      if (nextStep) setStep(nextStep.id);
    }
  }

  const progress = ((currentIdx + 1) / CHECKIN_STEPS.length) * 100;

  return (
    <div className="ci-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ci-modal">

        {/* Header */}
        <div className="ci-header">
          <div className="ci-header-left">
            <div className="ci-title">Daily Check-In</div>
            <div className="ci-subtitle">
              {CHECKIN_STEPS[currentIdx]?.emoji} {CHECKIN_STEPS[currentIdx]?.title}
              <span className="ci-step-count"> · Step {currentIdx + 1}/{CHECKIN_STEPS.length}</span>
            </div>
          </div>
          <button type="button" className="ci-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="ci-progress-track">
          <div className="ci-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Step tabs */}
        <div className="ci-steps">
          {CHECKIN_STEPS.map((s, i) => (
            <button key={s.id} type="button"
              className={`ci-step-pill${step === s.id ? " ci-step-active" : ""}${i < currentIdx ? " ci-step-done" : ""}`}
              onClick={() => setStep(s.id)}>
              {i < currentIdx ? <Check size={11} /> : s.emoji} {s.title}
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="ci-body">

          {/* ── STEP 1: Mood & Energy ── */}
          {step === "mood" && (
            <div className="ci-step-content">
              <ScaleSlider
                label="How is your mood?" value={draft.mood ?? null}
                onChange={v => set("mood", v)}
                scale={Object.fromEntries(Object.entries(MOOD_SCALE).map(([k, v]) => [k, { ...v, emoji: v.emoji }]))}
                hint="Tap to rate 1–10"
              />
              <ScaleSlider
                label="Physical energy" value={draft.energy ?? null}
                onChange={v => set("energy", v)}
                scale={ENERGY_SCALE}
                hint="How does your body feel?"
              />
              <ScaleSlider
                label="Mental energy" value={draft.mental_energy ?? null}
                onChange={v => set("mental_energy", v)}
                scale={ENERGY_SCALE}
                hint="Focus & clarity level"
              />
            </div>
          )}

          {/* ── STEP 2: Sleep ── */}
          {step === "sleep" && (
            <div className="ci-step-content">
              <div className="ci-field">
                <label className="ci-label">Hours slept</label>
                <div className="ci-sleep-hours-row">
                  {[4, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 10].map(h => (
                    <button key={h} type="button"
                      className={`ci-hour-btn${draft.sleep_hours === h ? " ci-hour-active" : ""}`}
                      onClick={() => set("sleep_hours", h)}>
                      {h}h
                    </button>
                  ))}
                </div>
                <input type="number" className="ci-input" placeholder="Or type exact hours (e.g. 6.5)"
                  min={0} max={24} step={0.5}
                  value={draft.sleep_hours ?? ""}
                  onChange={e => set("sleep_hours", parseFloat(e.target.value) || 0)} />
              </div>
              <ScaleSlider
                label="Sleep quality" value={draft.sleep_quality ?? null}
                onChange={v => set("sleep_quality", v)}
                scale={ENERGY_SCALE}
                hint="How refreshed do you feel?"
              />
            </div>
          )}

          {/* ── STEP 3: Body & Workout ── */}
          {step === "body" && (
            <div className="ci-step-content">
              <div className="ci-field">
                <label className="ci-label">Workout today?</label>
                <Toggle value={draft.workout_done ?? null} onChange={v => set("workout_done", v)} />
              </div>

              {draft.workout_done === true && (
                <>
                  <div className="ci-field">
                    <label className="ci-label">Workout type</label>
                    <div className="ci-chip-grid">
                      {WORKOUT_TYPES.map(t => (
                        <button key={t} type="button"
                          className={`ci-chip${draft.workout_type === t ? " ci-chip-active" : ""}`}
                          onClick={() => set("workout_type", draft.workout_type === t ? null : t)}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="ci-field">
                    <label className="ci-label">Duration (minutes)</label>
                    <div className="ci-sleep-hours-row">
                      {[15, 20, 30, 45, 60, 75, 90, 120].map(m => (
                        <button key={m} type="button"
                          className={`ci-hour-btn${draft.workout_minutes === m ? " ci-hour-active" : ""}`}
                          onClick={() => set("workout_minutes", draft.workout_minutes === m ? null : m)}>
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="ci-field">
                <label className="ci-label">Weight (optional)</label>
                <div className="ci-input-row">
                  <input type="number" className="ci-input" placeholder="kg" step={0.1} min={30} max={300}
                    value={draft.weight_kg ?? ""}
                    onChange={e => set("weight_kg", parseFloat(e.target.value) || 0)} />
                  <span className="ci-input-unit">kg</span>
                </div>
              </div>

              <ScaleSlider
                label="Digestion quality" value={draft.digestion ?? null}
                onChange={v => set("digestion", v)}
                scale={ENERGY_SCALE}
                hint="How is your gut feeling?"
              />

              <div className="ci-field">
                <label className="ci-label">Symptoms today (optional)</label>
                <div className="ci-chip-grid">
                  {SYMPTOMS.map(s => (
                    <button key={s} type="button"
                      className={`ci-chip${(draft.symptoms ?? []).includes(s) ? " ci-chip-active" : ""}`}
                      onClick={() => toggleSymptom(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Reflection ── */}
          {step === "reflect" && (
            <div className="ci-step-content">
              <div className="ci-field">
                <label className="ci-label">🏆 Biggest win today</label>
                <textarea className="ci-textarea" rows={2}
                  placeholder="What went well? What are you proud of?"
                  value={draft.biggest_win ?? ""}
                  onChange={e => set("biggest_win", e.target.value)} />
              </div>
              <div className="ci-field">
                <label className="ci-label">⚡ Biggest challenge</label>
                <textarea className="ci-textarea" rows={2}
                  placeholder="What was difficult or didn't go as planned?"
                  value={draft.biggest_challenge ?? ""}
                  onChange={e => set("biggest_challenge", e.target.value)} />
              </div>
              <div className="ci-field">
                <label className="ci-label">📝 Notes (optional)</label>
                <textarea className="ci-textarea" rows={2}
                  placeholder="Anything else worth noting…"
                  value={draft.notes ?? ""}
                  onChange={e => set("notes", e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ci-footer">
          {currentIdx > 0 && (
            <button type="button" className="ci-btn-ghost"
              onClick={() => { const prev = CHECKIN_STEPS[currentIdx - 1]; if (prev) setStep(prev.id); }}>
              Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {!isLast && (
            <button type="button" className="ci-btn-ghost ci-btn-skip"
              onClick={() => { const next = CHECKIN_STEPS[currentIdx + 1]; if (next) setStep(next.id); }}>
              Skip
            </button>
          )}
          <button type="button" className="ci-btn-primary" disabled={saving} onClick={() => void next()}>
            {saving ? "Saving…" : isLast ? "Complete Check-In ✓" : <>Next <ChevronRight size={14} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
