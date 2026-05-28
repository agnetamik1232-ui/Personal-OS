"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import type { CalendarEvent, CalendarResponse } from "@/app/api/calendar/route";

// ── Date helpers ─────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function fmtTime(iso: string, allDay: boolean): string {
  if (allDay) return "All day";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(startIso: string, endIso: string, allDay: boolean): string {
  if (allDay) return "All day";
  const diffMin = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
  if (diffMin <= 0) return "";
  if (diffMin < 60) return `${diffMin}m`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const SHORT_DAY  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const SHORT_MON  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;

// Color palette for events — cycles through 6 accents
const EVENT_COLORS = [
  "#C07B4A", // warm amber
  "#5B8FB9", // slate blue
  "#7BAE7F", // sage green
  "#B97BB0", // mauve
  "#C0A34A", // gold
  "#7B9EB0", // muted cyan
] as const;

function colorForUid(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = ((hash << 5) - hash + uid.charCodeAt(i)) | 0;
  }
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length] ?? EVENT_COLORS[0];
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface DayStripProps {
  days:        Date[];
  selected:    Date;
  eventsByDay: Map<string, CalendarEvent[]>;
  onSelect:    (d: Date) => void;
}

function DayStrip({ days, selected, eventsByDay, onSelect }: DayStripProps) {
  const today = startOfDay(new Date());

  return (
    <div className="cal-strip" role="tablist" aria-label="Week days">
      {days.map((day) => {
        const key    = day.toDateString();
        const events = eventsByDay.get(key) ?? [];
        const isToday    = isSameDay(day, today);
        const isSelected = isSameDay(day, selected);
        const dotCount   = Math.min(events.length, 4);

        return (
          <button
            key={key}
            role="tab"
            aria-selected={isSelected}
            aria-label={`${SHORT_DAY[day.getDay()]}, ${SHORT_MON[day.getMonth()]} ${day.getDate()} — ${events.length} event${events.length !== 1 ? "s" : ""}`}
            className={[
              "cal-day",
              isToday    && "cal-day-today",
              isSelected && "cal-day-selected",
            ].filter(Boolean).join(" ")}
            onClick={() => onSelect(day)}
          >
            <span className="cal-day-name">{SHORT_DAY[day.getDay()]}</span>
            <span className="cal-day-num">{day.getDate()}</span>
            <span className="cal-day-dots" aria-hidden>
              {Array.from({ length: dotCount }).map((_, i) => (
                <span
                  key={i}
                  className="cal-dot"
                  style={{ background: colorForUid(events[i]?.uid ?? String(i)) }}
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface NowMarkerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function NowMarker({ containerRef }: NowMarkerProps) {
  const [pct, setPct] = useState<number | null>(null);

  useEffect(() => {
    function calc() {
      const now     = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      setPct((minutes / (24 * 60)) * 100);
    }
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll to marker on mount
  useEffect(() => {
    if (pct === null || !containerRef.current) return;
    const el   = containerRef.current;
    const top  = (pct / 100) * el.scrollHeight;
    el.scrollTo({ top: Math.max(0, top - 80), behavior: "smooth" });
  }, [pct, containerRef]);

  if (pct === null) return null;

  return (
    <div
      className="cal-now-line"
      style={{ top: `${pct}%` }}
      aria-label="Current time"
      role="presentation"
    >
      <span className="cal-now-dot" />
    </div>
  );
}

interface EventListProps {
  events:    CalendarEvent[];
  isToday:   boolean;
  listRef:   React.RefObject<HTMLDivElement | null>;
}

function EventList({ events, isToday, listRef }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="cal-empty">
        <span>Nothing scheduled</span>
      </div>
    );
  }

  return (
    <div className="cal-event-list" ref={listRef} role="list">
      {/* NOW marker rendered relative to the list height */}
      {isToday && <NowMarker containerRef={listRef} />}

      {events.map((ev) => {
        const accent = ev.color || colorForUid(ev.uid);
        return (
          <div
            key={`${ev.uid}-${ev.start}`}
            className="cal-event"
            role="listitem"
            style={{ "--ev-accent": accent } as React.CSSProperties}
          >
            <div className="cal-event-bar" aria-hidden />
            <div className="cal-event-body">
              <div className="cal-event-time">
                {fmtTime(ev.start, ev.allDay)}
                {!ev.allDay && (
                  <span className="cal-event-dur">
                    {" · "}{fmtDuration(ev.start, ev.end, ev.allDay)}
                  </span>
                )}
              </div>
              <div className="cal-event-title">{ev.title}</div>
              {ev.location && (
                <div className="cal-event-loc">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6c0 3.25 4.5 8.5 4.5 8.5S12.5 9.25 12.5 6A4.5 4.5 0 0 0 8 1.5Zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" fill="currentColor" />
                  </svg>
                  {ev.location}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── CalendarCard ──────────────────────────────────────────────────────────────

export function CalendarCard() {
  const today   = useMemo(() => startOfDay(new Date()), []);
  const days    = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(today, i)),
    [today]
  );

  const [selected,   setSelected]   = useState<Date>(today);
  const [events,     setEvents]     = useState<CalendarEvent[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/calendar");
      const json = (await res.json()) as CalendarResponse & { error?: string };
      if (!res.ok) { setError(json.error ?? "Failed to load"); return; }
      setEvents(json.events ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Group events by day (using local date string as key)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const d   = startOfDay(new Date(ev.start));
      const key = d.toDateString();
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  const selectedEvents = useMemo(
    () => eventsByDay.get(selected.toDateString()) ?? [],
    [eventsByDay, selected]
  );

  const isToday = isSameDay(selected, today);

  const selLabel = `${SHORT_DAY[selected.getDay()]}, ${SHORT_MON[selected.getMonth()]} ${selected.getDate()}`;
  const monthLabel = `${SHORT_MON[today.getMonth()]} ${today.getFullYear()}`;

  return (
    <div className="card card-butter cal-card">
      {/* Decorative circle */}
      <svg
        className="card-deco"
        style={{ right: -28, top: -28, width: 140, height: 140 }}
        viewBox="0 0 100 100"
        aria-hidden
      >
        <circle cx="50" cy="50" r="50" fill="rgba(28,26,23,0.04)" />
      </svg>

      {/* ── Header ── */}
      <div className="cal-header">
        <div>
          <div className="card-eyebrow">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
              <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Calendar
          </div>
          <h3 className="card-title">{monthLabel}</h3>
        </div>

        <button
          className="cal-refresh"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh calendar"
        >
          <svg
            width="14" height="14" viewBox="0 0 16 16" fill="none"
            style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}
            aria-hidden
          >
            <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5c1.8 0 3.4.86 4.4 2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M11 4.5 12.5 5 13.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ── 7-day strip ── */}
      <DayStrip
        days={days}
        selected={selected}
        eventsByDay={eventsByDay}
        onSelect={setSelected}
      />

      {/* ── Selected day label ── */}
      <div className="cal-sel-label">
        <span>{selLabel}</span>
        {isToday && <span className="cal-today-badge">Today</span>}
        {selectedEvents.length > 0 && (
          <span className="cal-count">{selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* ── Event list ── */}
      {loading ? (
        <div className="cal-event-list">
          {[0, 1, 2].map((i) => (
            <div key={i} className="cal-skeleton" style={{ opacity: 1 - i * 0.28 }} />
          ))}
        </div>
      ) : error ? (
        <div className="cal-error">
          <span>⚠ {error}</span>
          <button className="sess-retry" onClick={() => void load()}>Retry</button>
        </div>
      ) : (
        <EventList
          events={selectedEvents}
          isToday={isToday}
          listRef={listRef}
        />
      )}
    </div>
  );
}
