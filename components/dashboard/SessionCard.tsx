"use client";

import { useState, useEffect } from "react";
import { IconFocus, IconPlay, IconPause } from "@/components/ui/Icon";

const TOTAL_S = 50 * 60;
const INITIAL_S = 32 * 60 + 14;
const RING_R = 72;
const RING_C = 2 * Math.PI * RING_R;

export function SessionCard() {
  const [running, setRunning] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(INITIAL_S);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const mm  = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss  = String(secondsLeft % 60).padStart(2, "0");
  const pct = 1 - secondsLeft / TOTAL_S;

  return (
    <div className="card card-dark">
      <svg className="card-deco" style={{ right: -50, top: -50, width: 220, height: 220 }} viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="50" fill="rgba(250,245,236,0.025)"/>
      </svg>

      <div className="session-layout">
        <div className="session-left">
          <div className="session-tag">
            <IconFocus size={12} />
            Active Session · Deep Work
          </div>

          <h3 className="session-focus">
            Q3 strategy memo<br />
            <span>— second draft</span>
          </h3>

          <div className="session-meta-row">
            <span><b>17</b> min elapsed</span>
            <span>·</span>
            <span><b>2</b> distractions blocked</span>
            <span>·</span>
            <span>Calm playlist</span>
          </div>

          <div className="session-actions">
            <button
              className="session-btn session-btn-primary"
              onClick={() => setRunning((r) => !r)}
              aria-label={running ? "Pause session" : "Resume session"}
            >
              {running ? <IconPause size={11} /> : <IconPlay size={11} />}
              {running ? "Pause" : "Resume"}
            </button>
            <button className="session-btn session-btn-ghost">End early</button>
            <button className="session-btn session-btn-ghost">Notes</button>
          </div>
        </div>

        <div className="session-ring-wrap" aria-label={`${mm}:${ss} remaining`}>
          <svg width="168" height="168" viewBox="0 0 168 168" aria-hidden>
            <circle cx="84" cy="84" r={RING_R} fill="none" stroke="rgba(250,245,236,0.10)" strokeWidth="6"/>
            <circle
              cx="84" cy="84" r={RING_R}
              fill="none"
              stroke="#F0E2A6"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - pct)}
              transform="rotate(-90 84 84)"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="session-ring-inner">
            <div>
              <div className="session-ring-time">{mm}:{ss}</div>
              <div className="session-ring-lbl">remaining</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
