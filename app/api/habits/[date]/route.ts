/**
 * POST /api/habits/[date]
 *
 * Upserts the habits bucket for a given calendar date.
 * [date] must be "YYYY-MM-DD" (the user's local date key).
 *
 * Body: { done: string[], total: number }
 *
 * Strategy: read the existing daily_log row (if any), merge only the
 * `habits` key in notes JSON, then upsert. This preserves other keys
 * (e.g. nutrition, finance captures) that the capture pipeline writes.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient }              from "@/lib/supabase/server";
import type { HabitDayData }              from "@/app/api/habits/route";

// Validate "YYYY-MM-DD"
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function ownerUserId(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
): Promise<NextResponse> {
  const { date } = await params;

  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid date format — use YYYY-MM-DD" }, { status: 400 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const done    = Array.isArray(payload["done"]) ? (payload["done"] as string[]) : [];
  const total   = typeof payload["total"] === "number" ? payload["total"] : 0;

  try {
    const supabase = await createAdminClient();
    const userId   = ownerUserId();

    // Read existing row so we preserve other notes keys
    const { data: existing } = await supabase
      .from("daily_logs")
      .select("id, notes")
      .eq("user_id", userId)
      .eq("log_date", date)
      .maybeSingle();

    type ExistingRow = { id: string; notes: string | null } | null;
    const row = existing as ExistingRow;

    let notes: Record<string, unknown> = {};
    if (row?.notes) {
      try { notes = JSON.parse(row.notes) as Record<string, unknown>; } catch { /* ignore */ }
    }

    // Merge only the habits bucket
    const habitData: HabitDayData = { done, total };
    notes["habits"] = habitData;

    const notesJson = JSON.stringify(notes);

    if (row) {
      const { error } = await supabase
        .from("daily_logs")
        .update({ notes: notesJson } as never)
        .eq("id", row.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("daily_logs")
        .insert({ user_id: userId, log_date: date, notes: notesJson } as never);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, date, done, total });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/habits POST]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
