import { NextResponse }    from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { Meal }         from "@/components/dashboard/NutritionCard";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }

  const body  = await req.json() as { meals?: Meal[] };
  const meals = body.meals ?? [];

  const supabase = await createAdminClient();

  // Load existing row to preserve other keys
  const { data: existing } = await supabase
    .from("daily_logs")
    .select("id, notes")
    .eq("log_date", date)
    .maybeSingle();

  const row = existing as { id: string; notes: string | null } | null;
  let notes: Record<string, unknown> = {};
  if (row?.notes) {
    try { notes = JSON.parse(row.notes) as Record<string, unknown>; } catch { /* ignore */ }
  }

  notes["nutrition"] = { meals };

  if (row) {
    await supabase
      .from("daily_logs")
      .update({ notes: JSON.stringify(notes) } as never)
      .eq("id", row.id);
  } else {
    await supabase
      .from("daily_logs")
      .insert({ log_date: date, notes: JSON.stringify(notes) } as never);
  }

  return NextResponse.json({ ok: true });
}
