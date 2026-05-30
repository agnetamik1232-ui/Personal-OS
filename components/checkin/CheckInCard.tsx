"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, Clock } from "lucide-react";
import { CheckInModal } from "./CheckInModal";
import { MOOD_SCALE, ENERGY_SCALE } from "@/lib/checkin/types";
import type { DailyCheckin } from "@/lib/checkin/types";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDate(): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long",
    timeZone: "Europe/Vilnius",
  }).format(new Date());
}

export function CheckInCard() {
  const today = todayKey();
  const [checkin, setCheckin]   = useState<DailyCheckin | null>(null);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/checkin?date=${today}`)
      .then(r => r.json() as Promise<{ checkin?: DailyCheckin | null }>)
      .catch(() => ({ checkin: null }));
    setCheckin(res.checkin ?? null);
    setLoading(false);
  }, [today]);

  useEffect(() => { void load(); }, [load]);

  function onSaved(c: DailyCheckin) {
    setCheckin(c);
    setShowModal(false);
  }

  const done = checkin?.completed === true;
  const moodInfo  = checkin?.mood   ? MOOD_SCALE[checkin.mood]   : null;
  const energyInfo = checkin?.energy ? ENERGY_SCALE[checkin.energy] : null;

  return (
    <>
      <div className={`card ci-dash-card${done ? " ci-dash-done" : ""}`}
        role="button" tabIndex={0}
        onClick={() => setShowModal(true)}
        onKeyDown={e => e.key === "Enter" && setShowModal(true)}>

        <div className="ci-dash-header">
          <div className="ci-dash-left">
            <div className="card-eyebrow">
              {done
                ? <><CheckCircle size={12} style={{ color: "#2E6B45", verticalAlign: "middle", marginRight: 4 }} />Completed</>
                : <><Clock size={12} style={{ color: "#F97316", verticalAlign: "middle", marginRight: 4 }} />Pending</>}
            </div>
            <div className="ci-dash-title">Daily Check-In</div>
            <div className="ci-dash-date">{fmtDate()}</div>
          </div>
          {!loading && !done && (
            <div className="ci-dash-cta">
              <span className="ci-dash-cta-text">Start →</span>
            </div>
          )}
          {done && checkin?.mood !== null && checkin?.mood !== undefined && (
            <div className="ci-dash-emoji">{MOOD_SCALE[checkin.mood]?.emoji}</div>
          )}
        </div>

        {loading && <div className="ci-dash-loading">Loading…</div>}

        {!loading && !done && (
          <div className="ci-dash-prompt">
            &ldquo;How are you feeling today?&rdquo;
            <div className="ci-dash-fields-hint">
              Mood · Energy · Sleep · Workout · Reflection
            </div>
          </div>
        )}

        {!loading && done && checkin !== null && (
          <div className="ci-dash-summary">
            {moodInfo !== null && moodInfo !== undefined && (
              <div className="ci-dash-stat">
                <div className="ci-dash-stat-emoji">{moodInfo.emoji}</div>
                <div>
                  <div className="ci-dash-stat-label">Mood</div>
                  <div className="ci-dash-stat-val" style={{ color: moodInfo.color }}>{checkin.mood}/10</div>
                </div>
              </div>
            )}
            {energyInfo !== null && energyInfo !== undefined && checkin.energy !== null && (
              <div className="ci-dash-stat">
                <div className="ci-dash-stat-emoji">⚡</div>
                <div>
                  <div className="ci-dash-stat-label">Energy</div>
                  <div className="ci-dash-stat-val" style={{ color: energyInfo.color }}>{checkin.energy}/10</div>
                </div>
              </div>
            )}
            {checkin.sleep_hours !== null && (
              <div className="ci-dash-stat">
                <div className="ci-dash-stat-emoji">😴</div>
                <div>
                  <div className="ci-dash-stat-label">Sleep</div>
                  <div className="ci-dash-stat-val">{checkin.sleep_hours}h</div>
                </div>
              </div>
            )}
            {checkin.workout_done !== null && (
              <div className="ci-dash-stat">
                <div className="ci-dash-stat-emoji">{checkin.workout_done ? "💪" : "🛋️"}</div>
                <div>
                  <div className="ci-dash-stat-label">Workout</div>
                  <div className="ci-dash-stat-val">{checkin.workout_done ? (checkin.workout_type ?? "Done") : "Rest"}</div>
                </div>
              </div>
            )}
            {checkin.biggest_win && (
              <div className="ci-dash-win">
                <span className="ci-dash-win-label">🏆 Win:</span> {checkin.biggest_win}
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <CheckInModal
          existing={checkin}
          onClose={() => setShowModal(false)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
