/**
 * GET /api/calendar
 *
 * Fetches GOOGLE_CALENDAR_ICAL_URL, parses the iCal feed with ical.js,
 * expands all recurring events within a 14-day window starting today, and
 * returns a sorted list of CalendarEvent objects.
 *
 * Module-level cache: results are reused for 5 minutes within the same
 * serverless instance. The HTTP response always carries Cache-Control: no-store
 * so the client (and any CDN) never caches it.
 */

import { type NextRequest, NextResponse } from "next/server";
import ICAL                               from "ical.js";

// ── Public shape ─────────────────────────────────────────────────────────────

export interface CalendarEvent {
  uid:          string;
  title:        string;
  start:        string;   // ISO 8601
  end:          string;   // ISO 8601
  allDay:       boolean;
  location:     string;
  description:  string;
  color:        string;
}

export interface CalendarResponse {
  events:      CalendarEvent[];
  windowStart: string;
  windowEnd:   string;
  fetchedAt:   string;
}

// ── Module-level cache ───────────────────────────────────────────────────────

interface Cache {
  events:    CalendarEvent[];
  expiresAt: number;
}

let _cache: Cache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;  // 5 minutes

// ── Helpers ──────────────────────────────────────────────────────────────────

function icalTimeToISO(t: ICAL.Time): string {
  return t.toJSDate().toISOString();
}

/** True when dtstart is a DATE value (all-day), not DATE-TIME */
function isAllDay(event: ICAL.Event): boolean {
  // ical.js stores all-day events with isDate = true on the startDate
  return event.startDate.isDate;
}

/**
 * Expand one ICAL.Event (potentially recurring) into concrete occurrences
 * that overlap [windowStart, windowEnd).
 */
function expandEvent(
  event:       ICAL.Event,
  windowStart: Date,
  windowEnd:   Date,
): CalendarEvent[] {
  const results: CalendarEvent[] = [];

  const winStartMs = windowStart.getTime();
  const winEndMs   = windowEnd.getTime();

  if (!event.isRecurring()) {
    const endMs = event.endDate.toJSDate().getTime();
    // Overlaps window?
    if (event.startDate.toJSDate().getTime() < winEndMs && endMs > winStartMs) {
      results.push(toCalendarEvent(event, event.startDate, event.endDate));
    }
    return results;
  }

  // Recurring — use iterator
  const iter = event.iterator();
  let   occ: ICAL.Time | null;

  // Safety cap: max 400 occurrences to avoid infinite loops on FREQ=MINUTELY etc.
  let guard = 0;

  while ((occ = iter.next()) !== null && guard++ < 400) {
    const occMs = occ.toJSDate().getTime();

    // Past the window — done
    if (occMs >= winEndMs) break;

    // Get full details (handles EXDATE / RDATE exceptions)
    const details = event.getOccurrenceDetails(occ);
    const endMs   = details.endDate.toJSDate().getTime();

    if (endMs > winStartMs) {
      results.push(toCalendarEvent(event, details.startDate, details.endDate));
    }
  }

  return results;
}

function toCalendarEvent(
  event: ICAL.Event,
  start: ICAL.Time,
  end:   ICAL.Time,
): CalendarEvent {
  return {
    uid:         event.uid,
    title:       event.summary       ?? "(no title)",
    start:       icalTimeToISO(start),
    end:         icalTimeToISO(end),
    allDay:      isAllDay(event),
    location:    event.location      ?? "",
    description: event.description   ?? "",
    color:       event.color         ?? "",
  };
}

// ── Parse pipeline ───────────────────────────────────────────────────────────

async function fetchAndParse(
  icalUrl:     string,
  windowStart: Date,
  windowEnd:   Date,
): Promise<CalendarEvent[]> {
  const res = await fetch(icalUrl, {
    // Bypass Next.js fetch cache entirely
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`iCal fetch failed: ${res.status} ${res.statusText}`);
  }

  const icalText = await res.text();
  const parsed   = ICAL.parse(icalText);
  const cal      = new ICAL.Component(parsed);

  // Collect all VEVENT components
  const vevents  = cal.getAllSubcomponents("vevent");

  // Build a map of UID → ICAL.Event so we can relate exceptions
  const eventMap = new Map<string, ICAL.Event>();

  for (const vevent of vevents) {
    const ev  = new ICAL.Event(vevent);
    const uid = ev.uid;

    if (ev.isRecurrenceException()) {
      // Relate exception to its parent
      const parent = eventMap.get(uid);
      if (parent) {
        parent.relateException(ev);
      }
      // If parent not yet seen, store exception component separately;
      // we'll attach it when the parent arrives (two-pass not needed here
      // because Google exports exceptions after their master in the feed).
    } else {
      eventMap.set(uid, ev);
    }
  }

  // Expand each master event
  const all: CalendarEvent[] = [];
  for (const ev of eventMap.values()) {
    const occurrences = expandEvent(ev, windowStart, windowEnd);
    all.push(...occurrences);
  }

  // Sort by start time
  all.sort((a, b) => a.start.localeCompare(b.start));

  return all;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const icalUrl = process.env["GOOGLE_CALENDAR_ICAL_URL"];
  if (!icalUrl) {
    return NextResponse.json(
      { error: "GOOGLE_CALENDAR_ICAL_URL not configured" },
      { status: 503 }
    );
  }

  const now         = new Date();
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);                       // start of today

  const windowEnd   = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 14);             // +14 days

  // Serve from cache if still fresh
  if (_cache && _cache.expiresAt > Date.now()) {
    const body: CalendarResponse = {
      events:      _cache.events,
      windowStart: windowStart.toISOString(),
      windowEnd:   windowEnd.toISOString(),
      fetchedAt:   new Date(_cache.expiresAt - CACHE_TTL_MS).toISOString(),
    };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const events = await fetchAndParse(icalUrl, windowStart, windowEnd);

    _cache = { events, expiresAt: Date.now() + CACHE_TTL_MS };

    const body: CalendarResponse = {
      events,
      windowStart: windowStart.toISOString(),
      windowEnd:   windowEnd.toISOString(),
      fetchedAt:   now.toISOString(),
    };

    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/calendar]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
