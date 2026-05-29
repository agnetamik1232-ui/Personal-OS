/**
 * GET  /api/finance  → latest FinanceSnapshot or null
 * POST /api/finance  → save a new FinanceSnapshot (manual entry)
 *
 * Stored in daily_logs.notes.finance on the sentinel date 2000-01-02
 * so it never auto-clears (same pattern as goals).
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient }              from "@/lib/supabase/server";

export interface FinanceCategory {
  id:    string;
  name:  string;
  value: number;   // positive = asset/income, negative = liability/expense
  group: "asset" | "liability" | "income" | "expense" | "other";
}

export interface FinanceSnapshot {
  net_worth:  number;
  currency:   string;
  as_of:      string;          // YYYY-MM-DD
  categories: FinanceCategory[];
  updated_at: string;          // ISO timestamp
}

const SENTINEL   = "2000-01-02";
const NOTES_KEY  = "finance";

type RawRow = { id: string; notes: string | null };

async function getRow() {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("daily_logs")
    .select("id, notes")
    .eq("log_date", SENTINEL)
    .maybeSingle();
  const row = data as RawRow | null;
  let notes: Record<string, unknown> = {};
  try { notes = JSON.parse(row?.notes ?? "{}") as Record<string, unknown>; } catch { /**/ }
  return { supabase, row, notes };
}

export async function GET(): Promise<NextResponse> {
  try {
    const { notes } = await getRow();
    const snap = notes[NOTES_KEY] as FinanceSnapshot | undefined;
    return NextResponse.json({ snapshot: snap ?? null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const userId   = process.env["OWNER_USER_ID"];
    if (!userId) return NextResponse.json({ error: "OWNER_USER_ID not set" }, { status: 500 });

    const body = await req.json() as Partial<FinanceSnapshot>;
    if (body.net_worth == null || !body.currency || !body.as_of) {
      return NextResponse.json({ error: "net_worth, currency and as_of required" }, { status: 400 });
    }

    const snapshot: FinanceSnapshot = {
      net_worth:  body.net_worth,
      currency:   body.currency,
      as_of:      body.as_of,
      categories: body.categories ?? [],
      updated_at: new Date().toISOString(),
    };

    const { supabase, row, notes } = await getRow();
    notes[NOTES_KEY] = snapshot;

    if (row) {
      await supabase.from("daily_logs")
        .update({ notes: JSON.stringify(notes) } as never)
        .eq("id", row.id);
    } else {
      await supabase.from("daily_logs")
        .insert({ log_date: SENTINEL, user_id: userId, notes: JSON.stringify(notes) } as never);
    }

    // Also record a net-worth history point for today's date
    try {
      const today = body.as_of;
      const { data: todayRow } = await supabase
        .from("daily_logs")
        .select("id, notes")
        .eq("user_id", userId)
        .eq("log_date", today)
        .maybeSingle();

      const todayRowTyped = todayRow as RawRow | null;
      let todayNotes: Record<string, unknown> = {};
      try { todayNotes = JSON.parse(todayRowTyped?.notes ?? "{}") as Record<string, unknown>; } catch { /**/ }
      todayNotes["finance_snapshot"] = { net_worth: snapshot.net_worth, currency: snapshot.currency };

      if (todayRowTyped) {
        await supabase.from("daily_logs")
          .update({ notes: JSON.stringify(todayNotes) } as never)
          .eq("id", todayRowTyped.id);
      } else {
        await supabase.from("daily_logs")
          .insert({ log_date: today, user_id: userId, notes: JSON.stringify(todayNotes) } as never);
      }
    } catch { /* non-critical, don't fail the main save */ }

    return NextResponse.json({ ok: true, snapshot });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
