import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { WorkSettings } from "@/lib/work/types";

function uid(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

const DEFAULT_SETTINGS = {
  hourly_rate: 7.0, currency: "EUR", tax_rate: 0.36,
  mult_day: 1.0, mult_night: 1.5, mult_overtime_day: 1.5,
  mult_overtime_night: 2.0, mult_day_off: 2.0, mult_holiday: 2.0,
  mult_vacation: 1.0, mult_sick: 0.0, mult_unpaid: 0.0, mult_custom: 1.0,
  night_start: "22:00", night_end: "06:00",
};

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("work_settings").select("*").eq("user_id", uid()).single();
    if (error && error.code === "PGRST116") {
      // No settings yet — insert defaults
      const { data: created, error: cErr } = await supabase
        .from("work_settings")
        .insert({ user_id: uid(), ...DEFAULT_SETTINGS } as never)
        .select("*").single();
      if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
      return NextResponse.json({ settings: created });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ settings: data });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as Partial<WorkSettings>;
    const patch: Record<string, unknown> = {};
    if (body.hourly_rate          !== undefined) patch["hourly_rate"]          = body.hourly_rate;
    if (body.currency             !== undefined) patch["currency"]             = body.currency;
    if (body.tax_rate             !== undefined) patch["tax_rate"]             = body.tax_rate;
    if (body.mult_day             !== undefined) patch["mult_day"]             = body.mult_day;
    if (body.mult_night           !== undefined) patch["mult_night"]           = body.mult_night;
    if (body.mult_overtime_day    !== undefined) patch["mult_overtime_day"]    = body.mult_overtime_day;
    if (body.mult_overtime_night  !== undefined) patch["mult_overtime_night"]  = body.mult_overtime_night;
    if (body.mult_day_off         !== undefined) patch["mult_day_off"]         = body.mult_day_off;
    if (body.mult_holiday         !== undefined) patch["mult_holiday"]         = body.mult_holiday;
    if (body.mult_vacation        !== undefined) patch["mult_vacation"]        = body.mult_vacation;
    if (body.mult_sick            !== undefined) patch["mult_sick"]            = body.mult_sick;
    if (body.mult_unpaid          !== undefined) patch["mult_unpaid"]          = body.mult_unpaid;
    if (body.mult_custom          !== undefined) patch["mult_custom"]          = body.mult_custom;
    if (body.night_start          !== undefined) patch["night_start"]          = body.night_start;
    if (body.night_end            !== undefined) patch["night_end"]            = body.night_end;
    patch["updated_at"] = new Date().toISOString();

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("work_settings")
      .upsert({ user_id: uid(), ...DEFAULT_SETTINGS, ...patch } as never, { onConflict: "user_id" })
      .select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ settings: data });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
