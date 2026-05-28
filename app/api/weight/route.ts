/**
 * GET  /api/weight?days=90  → { entries: WeightEntry[] }  (desc by date)
 * POST /api/weight           → { date, kg }  saves today's weight
 *
 * Stored in daily_logs.notes.weight = { kg: number } per day row.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient }              from "@/lib/supabase/server";
import { localDateKey }                   from "@/lib/utils/localDate";

export interface WeightEntry {
  date: string;   // YYYY-MM-DD
  kg:   number;
}

export interface WeightResponse {
  entries: WeightEntry[];
}

function ownerUserId(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

type RawRow = { log_date: string; notes: string | null };

export async function GET(req: NextRequest): Promise<NextResponse> {
  const days = Math.min(365, Math.max(1, parseInt(req.nextUrl.searchParams.get("days") ?? "90", 10)));

  try {
    const userId   = ownerUserId();
    const supabase = await createAdminClient();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const since = cutoff.toISOString().split("T")[0]!;

    const { data, error } = await supabase
      .from("daily_logs")
      .select("log_date, notes")
      .eq("user_id", userId)
      .gte("log_date", since)
      .order("log_date", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const entries: WeightEntry[] = [];
    for (const row of ((data ?? []) as RawRow[])) {
      let notes: Record<string, unknown> = {};
      try { notes = JSON.parse(row.notes ?? "{}") as Record<string, unknown>; } catch { continue; }
      const w = notes["weight"] as { kg?: number } | undefined;
      if (w?.kg != null && w.kg > 0) {
        entries.push({ date: row.log_date, kg: w.kg });
      }
    }

    return NextResponse.json({ entries } satisfies WeightResponse);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = ownerUserId();
    const body   = await req.json() as { kg?: number; date?: string };
    const kg     = body.kg;
    if (!kg || kg <= 0 || kg > 500) {
      return NextResponse.json({ error: "valid kg required" }, { status: 400 });
    }
    const date = body.date ?? localDateKey();

    const supabase = await createAdminClient();

    const { data: existing } = await supabase
      .from("daily_logs")
      .select("id, notes")
      .eq("user_id", userId)
      .eq("log_date", date)
      .maybeSingle();

    const row = existing as { id: string; notes: string | null } | null;
    let notes: Record<string, unknown> = {};
    try { notes = JSON.parse(row?.notes ?? "{}") as Record<string, unknown>; } catch { /**/ }
    notes["weight"] = { kg };

    if (row) {
      await supabase.from("daily_logs")
        .update({ notes: JSON.stringify(notes) } as never)
        .eq("id", row.id);
    } else {
      await supabase.from("daily_logs")
        .insert({ log_date: date, user_id: userId, notes: JSON.stringify(notes) } as never);
    }

    return NextResponse.json({ ok: true, entry: { date, kg } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
