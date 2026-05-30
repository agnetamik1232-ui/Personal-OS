import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { DailyCheckin } from "@/lib/checkin/types";

function uid(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createAdminClient();
    const date  = req.nextUrl.searchParams.get("date");
    const days  = req.nextUrl.searchParams.get("days");

    if (date) {
      const { data, error } = await supabase
        .from("daily_checkins").select("*").eq("user_id", uid()).eq("date", date).maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ checkin: data as DailyCheckin | null });
    }

    const limit = days ? parseInt(days, 10) : 30;
    const { data, error } = await supabase
      .from("daily_checkins").select("*").eq("user_id", uid())
      .order("date", { ascending: false }).limit(Math.min(limit, 365));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ checkins: (data ?? []) as DailyCheckin[] });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as Partial<DailyCheckin> & { date: string };
    if (!body.date) return NextResponse.json({ error: "date required" }, { status: 400 });
    const supabase = await createAdminClient();

    const row = {
      user_id:           uid(),
      date:              body.date,
      mood:              body.mood              ?? null,
      energy:            body.energy            ?? null,
      mental_energy:     body.mental_energy     ?? null,
      sleep_hours:       body.sleep_hours       ?? null,
      sleep_quality:     body.sleep_quality     ?? null,
      weight_kg:         body.weight_kg         ?? null,
      workout_done:      body.workout_done      ?? null,
      workout_type:      body.workout_type      ?? null,
      workout_minutes:   body.workout_minutes   ?? null,
      digestion:         body.digestion         ?? null,
      symptoms:          body.symptoms          ?? [],
      biggest_win:       body.biggest_win       ?? null,
      biggest_challenge: body.biggest_challenge ?? null,
      notes:             body.notes             ?? null,
      completed:         body.completed         ?? false,
      updated_at:        new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("daily_checkins")
      .upsert(row as never, { onConflict: "user_id,date" })
      .select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ checkin: data as DailyCheckin });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
