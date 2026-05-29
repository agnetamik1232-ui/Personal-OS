/**
 * GET  /api/journal?date=YYYY-MM-DD  → { date, text, mood }
 * POST /api/journal                  → { date, text, mood? } → save
 * GET  /api/journal?days=30          → { entries: [{date, text, mood}] }
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient }              from "@/lib/supabase/server";

const JOURNAL_KEY = "journal";

function ownerUserId(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

export interface JournalEntry {
  date: string;
  text: string;
  mood: number | null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date");
  const days = searchParams.get("days");

  try {
    const supabase = await createAdminClient();
    const userId   = ownerUserId();

    if (days) {
      // Return last N days of journal entries
      const n = Math.min(parseInt(days, 10), 365);
      const { data, error } = await supabase
        .from("daily_logs")
        .select("log_date, notes, mood")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(n);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      type RawRow = { log_date: string; notes: string | null; mood: number | null };
      const entries: JournalEntry[] = [];
      for (const row of (data ?? []) as RawRow[]) {
        let notesObj: Record<string, unknown> = {};
        try { notesObj = JSON.parse(row.notes ?? "{}") as Record<string, unknown>; } catch { /* ok */ }
        const text = typeof notesObj[JOURNAL_KEY] === "string" ? (notesObj[JOURNAL_KEY] as string) : "";
        if (text.trim()) {
          entries.push({ date: row.log_date, text, mood: row.mood ?? null });
        }
      }
      return NextResponse.json({ entries });
    }

    // Single date
    const targetDate = date ?? new Date().toISOString().split("T")[0]!;
    const { data, error } = await supabase
      .from("daily_logs")
      .select("log_date, notes, mood")
      .eq("user_id", userId)
      .eq("log_date", targetDate)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    type SingleRow = { notes: string | null; mood: number | null } | null;
    const row = data as SingleRow;

    let text = "";
    if (row?.notes) {
      try {
        const notesObj = JSON.parse(row.notes) as Record<string, unknown>;
        text = typeof notesObj[JOURNAL_KEY] === "string" ? (notesObj[JOURNAL_KEY] as string) : "";
      } catch { /* ok */ }
    }

    return NextResponse.json({
      date:  targetDate,
      text,
      mood:  row?.mood ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { date?: string; text: string; mood?: number | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetDate = body.date ?? new Date().toISOString().split("T")[0]!;
  const text       = typeof body.text === "string" ? body.text : "";
  const mood       = typeof body.mood === "number" ? body.mood : null;

  try {
    const supabase = await createAdminClient();
    const userId   = ownerUserId();

    // Read existing row
    const { data: existing } = await supabase
      .from("daily_logs")
      .select("id, notes")
      .eq("user_id", userId)
      .eq("log_date", targetDate)
      .maybeSingle();

    const existingRow = existing as { id: string; notes: string | null } | null;
    let notesObj: Record<string, unknown> = {};
    if (existingRow?.notes) {
      try { notesObj = JSON.parse(existingRow.notes) as Record<string, unknown>; } catch { /* ok */ }
    }
    notesObj[JOURNAL_KEY] = text;

    const updatePayload: Record<string, unknown> = { notes: JSON.stringify(notesObj) };
    if (mood !== null) updatePayload["mood"] = mood;

    if (existingRow) {
      await supabase
        .from("daily_logs")
        .update(updatePayload as never)
        .eq("id", existingRow.id);
    } else {
      const insertPayload: Record<string, unknown> = {
        user_id:  userId,
        log_date: targetDate,
        notes:    JSON.stringify(notesObj),
      };
      if (mood !== null) insertPayload["mood"] = mood;
      await supabase.from("daily_logs").insert(insertPayload as never);
    }

    return NextResponse.json({ ok: true, date: targetDate });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
