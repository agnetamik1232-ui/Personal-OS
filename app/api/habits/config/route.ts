/**
 * GET  /api/habits/config  → returns current habit definitions
 * PUT  /api/habits/config  → saves new habit definitions
 *
 * Stored in daily_logs with a sentinel log_date of "0001-01-01"
 * under notes.habits_config. This lets us reuse the existing table
 * without a schema migration.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient }              from "@/lib/supabase/server";
import { HABITS }                         from "@/lib/config/habits";
import type { HabitConfig }               from "@/lib/config/habits";

const SENTINEL_DATE = "0001-01-01";   // never a real log date
const CONFIG_KEY    = "habits_config";

function ownerUserId(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

async function readConfig(supabase: Awaited<ReturnType<typeof createAdminClient>>): Promise<{
  row:     { id: string; notes: string | null } | null;
  habits:  HabitConfig[];
}> {
  const { data } = await supabase
    .from("daily_logs")
    .select("id, notes")
    .eq("user_id", ownerUserId())
    .eq("log_date", SENTINEL_DATE)
    .maybeSingle();

  const row = data as { id: string; notes: string | null } | null;
  let habits: HabitConfig[] = HABITS;   // file-level default

  if (row?.notes) {
    try {
      const parsed = JSON.parse(row.notes) as Record<string, unknown>;
      const cfg = parsed[CONFIG_KEY];
      if (Array.isArray(cfg) && cfg.length > 0) {
        habits = cfg as HabitConfig[];
      }
    } catch { /* use default */ }
  }

  return { row, habits };
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  try {
    const supabase        = await createAdminClient();
    const { habits }      = await readConfig(supabase);
    return NextResponse.json({ habits });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── PUT ───────────────────────────────────────────────────────────────────────

export async function PUT(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incoming = (body as Record<string, unknown>)["habits"];
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return NextResponse.json({ error: "habits array required" }, { status: 400 });
  }

  // Validate each entry: must have id (non-empty string), name, icon
  const habits: HabitConfig[] = (incoming as unknown[]).slice(0, 6).map((item, i) => {
    const h = item as Record<string, unknown>;
    const rawId   = String(h["id"]   ?? "").trim();
    const name    = String(h["name"] ?? "").trim();
    const icon    = String(h["icon"] ?? "").trim();
    const id      = rawId || `habit-${i}`;
    return { id, name: name || id, icon: icon || "●" };
  });

  try {
    const supabase       = await createAdminClient();
    const userId         = ownerUserId();
    const { row }        = await readConfig(supabase);

    // Read existing notes to preserve other keys
    let notes: Record<string, unknown> = {};
    if (row?.notes) {
      try { notes = JSON.parse(row.notes) as Record<string, unknown>; } catch { /* ignore */ }
    }
    notes[CONFIG_KEY] = habits;
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
        .insert({ user_id: userId, log_date: SENTINEL_DATE, notes: notesJson } as never);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, habits });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
