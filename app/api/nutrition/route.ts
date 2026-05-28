/**
 * GET /api/nutrition?days=30
 *
 * Returns per-day nutrition logs for the last N calendar days.
 * Response: { logs: Record<"YYYY-MM-DD", DayLog> }
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient }              from "@/lib/supabase/server";
import type { Meal }                      from "@/components/dashboard/NutritionCard";

export interface DayLog {
  meals: Meal[];
  kcal:  number;
  p:     number;
  c:     number;
  f:     number;
}

export interface NutritionResponse {
  logs: Record<string, DayLog>;
}

function ownerUserId(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

type RawRow = { log_date: string; notes: string | null };

export async function GET(req: NextRequest): Promise<NextResponse> {
  const days = Math.min(365, Math.max(1, parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10)));

  try {
    const userId   = ownerUserId();
    const supabase = await createAdminClient();

    const { data, error } = await supabase
      .from("daily_logs")
      .select("log_date, notes")
      .eq("user_id", userId)
      .gte("log_date", offsetDate(days))
      .order("log_date", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []) as RawRow[];
    const logs: Record<string, DayLog> = {};

    for (const row of rows) {
      let notesObj: Record<string, unknown> = {};
      try { notesObj = JSON.parse(row.notes ?? "{}") as Record<string, unknown>; } catch { /* skip */ }

      const nutrition = notesObj["nutrition"] as { meals?: Meal[] } | undefined;
      const meals     = Array.isArray(nutrition?.meals) ? nutrition.meals : [];

      const totals = meals.reduce(
        (acc, m) => ({ kcal: acc.kcal + (m.kcal ?? 0), p: acc.p + (m.p ?? 0), c: acc.c + (m.c ?? 0), f: acc.f + (m.f ?? 0) }),
        { kcal: 0, p: 0, c: 0, f: 0 }
      );

      logs[row.log_date] = { meals, ...totals };
    }

    return NextResponse.json({ logs } satisfies NutritionResponse);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

/** Returns YYYY-MM-DD for `days` ago (UTC is fine for a range query). */
function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0]!;
}
