"use client";

import { useState, useEffect, useRef } from "react";
import { localDateKey }                 from "@/lib/utils/localDate";
import type { WeightEntry }             from "@/app/api/weight/route";

// ── Rolling average ───────────────────────────────────────────────────────────

/**
 * Given entries sorted ascending by date, return a parallel array of
 * rolling-7-day averages (average of up to 7 entries ending at that index).
 */
function rollingAvg(entries: WeightEntry[]): (number | null)[] {
  return entries.map((_, i) => {
    const window = entries.slice(Math.max(0, i - 6), i + 1);
    if (window.length === 0) return null;
    return window.reduce((s, e) => s + e.kg, 0) / window.length;
  });
}

// ── SVG chart ─────────────────────────────────────────────────────────────────

const W = 600, H = 160, PAD = { t: 16, r: 16, b: 32, l: 40 };

function WeightChart({ entries }: { entries: WeightEntry[] }) {
  if (entries.length < 2) return (
    <p className="wt-chart-empty">Log at least 2 days to see the chart.</p>
  );

  // Work ascending
  const asc  = [...entries].reverse();
  const avgs = rollingAvg(asc);

  const kgs  = asc.map((e) => e.kg);
  const minK = Math.min(...kgs) - 1;
  const maxK = Math.max(...kgs) + 1;

  const cw = W - PAD.l - PAD.r;
  const ch = H - PAD.t - PAD.b;

  const px = (i: number) => PAD.l + (i / (asc.length - 1)) * cw;
  const py = (k: number) => PAD.t + ch - ((k - minK) / (maxK - minK)) * ch;

  // Dot points (actual)
  const dots = asc.map((e, i) => ({ x: px(i), y: py(e.kg), entry: e }));

  // Avg line path
  const avgPts = avgs
    .map((v, i) => v != null ? `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)} ${py(v).toFixed(1)}` : null)
    .filter(Boolean);
  const avgPath = avgPts.join(" ");

  // Y axis ticks
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const k = minK + (i / tickCount) * (maxK - minK);
    return { k, y: py(k) };
  });

  // X axis: show ~5 labels
  const xLabels: { x: number; label: string }[] = [];
  const step = Math.max(1, Math.floor(asc.length / 5));
  for (let i = 0; i < asc.length; i += step) {
    const [, m, d] = asc[i]!.date.split("-").map(Number) as [number, number, number];
    xLabels.push({ x: px(i), label: `${d}/${m}` });
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      className="wt-chart-svg"
      role="img"
      aria-label="Weight over time"
    >
      {/* Y grid + ticks */}
      {ticks.map(({ k, y }) => (
        <g key={k}>
          <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(28,26,23,0.07)" strokeWidth="1" />
          <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="rgba(28,26,23,0.35)">
            {k.toFixed(1)}
          </text>
        </g>
      ))}

      {/* X labels */}
      {xLabels.map(({ x, label }) => (
        <text key={label} x={x} y={H - 6} textAnchor="middle" fontSize="10" fill="rgba(28,26,23,0.35)">
          {label}
        </text>
      ))}

      {/* Actual weight dots */}
      {dots.map(({ x, y, entry }) => (
        <circle key={entry.date} cx={x} cy={y} r="3.5" fill="rgba(28,26,23,0.18)" />
      ))}

      {/* 7-day rolling average line */}
      <path d={avgPath} fill="none" stroke="#2E6B45" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Latest avg dot */}
      {avgs[avgs.length - 1] != null && (
        <circle
          cx={px(asc.length - 1)}
          cy={py(avgs[avgs.length - 1]!)}
          r="5"
          fill="#2E6B45"
        />
      )}
    </svg>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

interface WeightSectionProps {
  days: number;
}

export function WeightSection({ days }: WeightSectionProps) {
  const [entries,  setEntries]  = useState<WeightEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [input,    setInput]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  const todayKey = localDateKey();
  const todayEntry = entries.find((e) => e.date === todayKey);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/weight?days=${days}`)
      .then((r) => r.json() as Promise<{ entries: WeightEntry[]; error?: string }>)
      .then((j) => {
        if (j.error) { setError(j.error); return; }
        setEntries(j.entries);
      })
      .catch(() => setError("Failed to load weight data"))
      .finally(() => setLoading(false));
  }, [days]);

  async function logWeight() {
    const kg = parseFloat(input);
    if (!kg || kg <= 0) return;
    setSaving(true);
    setError(null);
    try {
      const res  = await fetch("/api/weight", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ kg }),
      });
      const json = await res.json() as { entry?: WeightEntry; error?: string };
      if (!res.ok) { setError(json.error ?? "Save failed"); return; }
      if (json.entry) {
        setEntries((prev) => {
          const filtered = prev.filter((e) => e.date !== json.entry!.date);
          return [json.entry!, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
        });
      }
      setInput("");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  // Stats
  const asc      = [...entries].reverse();
  const avgs     = rollingAvg(asc);
  const latestAvg = avgs[avgs.length - 1] ?? null;
  const prevAvg   = avgs[avgs.length - 8] ?? null;
  const trend     = latestAvg != null && prevAvg != null ? latestAvg - prevAvg : null;

  return (
    <div className="wt-section">
      {/* Header */}
      <div className="wt-header">
        <div>
          <h2 className="wt-title">Weight</h2>
          {latestAvg != null && (
            <div className="wt-avg-row">
              <span className="wt-avg-val">{latestAvg.toFixed(1)} kg</span>
              <span className="wt-avg-label">7-day avg</span>
              {trend != null && (
                <span className={`wt-trend${trend > 0 ? " wt-trend-up" : trend < 0 ? " wt-trend-down" : ""}`}>
                  {trend > 0 ? "▲" : trend < 0 ? "▼" : "—"} {Math.abs(trend).toFixed(1)} kg / week
                </span>
              )}
            </div>
          )}
        </div>

        {/* Log input */}
        <div className="wt-log-row">
          <input
            ref={inputRef}
            className="wt-input"
            type="number"
            step="0.1"
            min="20"
            max="300"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void logWeight(); }}
            placeholder={todayEntry ? `Today: ${todayEntry.kg} kg` : "kg today"}
          />
          <button
            className="wt-log-btn"
            onClick={() => void logWeight()}
            disabled={saving || !input}
          >
            {saving ? "…" : "Log"}
          </button>
        </div>
      </div>

      {error && <p className="wt-error">⚠ {error}</p>}

      {/* Chart */}
      {loading
        ? <div className="wt-loading">Loading…</div>
        : <WeightChart entries={entries} />
      }

      {/* Recent log table */}
      {entries.length > 0 && (
        <div className="wt-log-table">
          <div className="wt-log-head">
            <span>Date</span>
            <span className="wt-col-r">Weight</span>
            <span className="wt-col-r">7d avg</span>
          </div>
          {asc.slice().reverse().slice(0, 14).map((e, i) => {
            const idx  = asc.findIndex((a) => a.date === e.date);
            const avg  = idx >= 0 ? avgs[idx] : null;
            return (
              <div key={e.date} className={`wt-log-row${i === 0 && e.date === todayKey ? " wt-log-row-today" : ""}`}>
                <span className="wt-log-date">{fmtDateShort(e.date)}</span>
                <span className="wt-col-r wt-log-kg">{e.kg.toFixed(1)}</span>
                <span className="wt-col-r wt-log-avg">{avg != null ? avg.toFixed(1) : "—"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function fmtDateShort(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Vilnius",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
