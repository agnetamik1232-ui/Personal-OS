/**
 * GET /api/habits?days=30
 *
 * Returns habit completion data for the last N calendar days.
 * Response shape:
 *   { logs: Record<dateKey, HabitDayData> }
 *   where dateKey = "YYYY-MM-DD" in the user's local time (sent from client).
 *
 * We read daily_logs.notes JSON and extract the `habits` bucket.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient }              from "@/lib/supabase/server";

export interface HabitDayData {
  done:  string[];   // array of habit IDs completed that day
  total: number;     // total habits configured that day (for % display)
}

export interface HabitsResponse {
  logs: Record<string, HabitDayData>;  // key = "YYYY-MM-DD"
}

function ownerUserId(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const days  = Math.min(parseInt(request.nextUrl.searchParams.get("days") ?? "30", 10), 90);

  try {
    const supabase = await createAdminClient();
    const userId   = ownerUserId();

    // Fetch the last N rows ordered newest-first
    const { data, error } = await supabase
      .from("daily_logs")
      .select("log_date, notes")
      .eq("user_id", userId)
      .order("log_date", { ascending: false })
      .limit(days);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const logs: Record<string, HabitDayData> = {};

    type RawRow = { log_date: string; notes: string | null };

    for (const row of (data ?? []) as RawRow[]) {
      const dateKey = row.log_date;
      let notes: Record<string, unknown> = {};
      if (row.notes) {
        try { notes = JSON.parse(row.notes) as Record<string, unknown>; } catch { /* ignore */ }
      }

      const habits = notes["habits"] as { done?: unknown; total?: unknown } | undefined;
      if (habits) {
        const done  = Array.isArray(habits.done)   ? (habits.done  as string[]) : [];
        const total = typeof habits.total === "number" ? habits.total : 0;
        logs[dateKey] = { done, total };
      }
    }

    return NextResponse.json({ logs } satisfies HabitsResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/habits GET]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
