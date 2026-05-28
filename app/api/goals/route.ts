/**
 * GET  /api/goals          → { week: GoalItem[], month: GoalItem[] }
 * POST /api/goals          → { scope: 'week'|'month', items: GoalItem[] }
 *
 * Goals are stored on a sentinel daily_logs row (log_date = '2000-01-01')
 * so they never auto-clear at week/month boundaries.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient }              from "@/lib/supabase/server";

export interface GoalItem {
  id:   string;
  text: string;
  done: boolean;
}

export interface GoalsResponse {
  week:  GoalItem[];
  month: GoalItem[];
}

const SENTINEL        = "2000-01-01";
const WEEK_KEY        = "goals_week_items";
const MONTH_KEY       = "goals_month_items";

function ownerUserId(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

type RawRow = { id: string; notes: string | null };

async function getRow(): Promise<{ client: Awaited<ReturnType<typeof createAdminClient>>; row: RawRow | null; notes: Record<string, unknown> }> {
  const client = await createAdminClient();
  const { data } = await client
    .from("daily_logs")
    .select("id, notes")
    .eq("log_date", SENTINEL)
    .maybeSingle();
  const row = data as RawRow | null;
  let notes: Record<string, unknown> = {};
  try { notes = JSON.parse(row?.notes ?? "{}") as Record<string, unknown>; } catch { /* ignore */ }
  return { client, row, notes };
}

export async function GET(): Promise<NextResponse> {
  try {
    const { notes } = await getRow();
    return NextResponse.json({
      week:  Array.isArray(notes[WEEK_KEY])  ? notes[WEEK_KEY]  : [],
      month: Array.isArray(notes[MONTH_KEY]) ? notes[MONTH_KEY] : [],
    } satisfies GoalsResponse);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const userId     = ownerUserId();
    const body       = await req.json() as { scope?: string; items?: GoalItem[] };
    const { scope, items } = body;
    if ((scope !== "week" && scope !== "month") || !Array.isArray(items)) {
      return NextResponse.json({ error: "scope and items required" }, { status: 400 });
    }

    const { client, row, notes } = await getRow();
    const key   = scope === "week" ? WEEK_KEY : MONTH_KEY;
    notes[key]  = items;

    if (row) {
      await client.from("daily_logs")
        .update({ notes: JSON.stringify(notes) } as never)
        .eq("id", row.id);
    } else {
      await client.from("daily_logs")
        .insert({ log_date: SENTINEL, user_id: userId, notes: JSON.stringify(notes) } as never);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
