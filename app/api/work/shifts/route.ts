import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { calcGrossPaySplit } from "@/lib/work/salary";
import { getLithuanianHolidays } from "@/lib/work/holidays";
import type { WorkShift, WorkSettings } from "@/lib/work/types";

function uid(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

const DEFAULT_SETTINGS: Omit<WorkSettings, "id" | "updated_at"> = {
  hourly_rate: 7.0, currency: "EUR", tax_rate: 0.36,
  mult_day: 1.0, mult_night: 1.5, mult_overtime_day: 1.5,
  mult_overtime_night: 2.0, mult_day_off: 2.0, mult_holiday: 2.0,
  mult_vacation: 1.0, mult_sick: 0.0, mult_unpaid: 0.0, mult_custom: 1.0,
  // Night PAY window per Lithuanian law: 22:00–06:00
  night_start: "22:00", night_end: "06:00",
};

type SupabaseClient = Awaited<ReturnType<typeof createAdminClient>>;

async function loadSettings(supabase: SupabaseClient): Promise<WorkSettings> {
  const { data } = await supabase
    .from("work_settings").select("*").eq("user_id", uid()).single();
  if (data) {
    const s = data as unknown as WorkSettings;
    // Self-heal: correct night_start if accidentally seeded as "18:00"
    if (s.night_start === "18:00") {
      s.night_start = "22:00";
      void supabase
        .from("work_settings")
        .update({ night_start: "22:00", updated_at: new Date().toISOString() } as never)
        .eq("user_id", uid());
    }
    return s;
  }
  return { id: "", updated_at: new Date().toISOString(), ...DEFAULT_SETTINGS };
}

interface ShiftBody {
  date?:       string;
  shift_type?: WorkShift["shift_type"];
  start_time?: string;
  end_time?:   string;
  break_min?:  number;
  notes?:      string | null;
  is_holiday?: boolean;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const year  = parseInt(req.nextUrl.searchParams.get("year")  ?? "0", 10);
    const month = parseInt(req.nextUrl.searchParams.get("month") ?? "0", 10);
    if (!year || !month) return NextResponse.json({ error: "year and month required" }, { status: 400 });

    const mm    = String(month).padStart(2, "0");
    const start = `${year}-${mm}-01`;
    const last  = new Date(year, month, 0).getDate();
    const end   = `${year}-${mm}-${String(last).padStart(2, "0")}`;

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("work_shifts")
      .select("*")
      .eq("user_id", uid())
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ shifts: (data ?? []) as unknown as WorkShift[] });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as ShiftBody;
    if (!body.date || !body.shift_type) {
      return NextResponse.json({ error: "date and shift_type required" }, { status: 400 });
    }
    const supabase = await createAdminClient();
    const settings = await loadSettings(supabase);

    const startTime = body.start_time ?? "06:00";
    const endTime   = body.end_time   ?? "18:00";
    const breakMin  = body.break_min  ?? 60;

    // Split-aware gross pay calculation (night hours 22:00–06:00 at night rate)
    const { hours_worked, gross_pay, regular_hours, night_hours } = calcGrossPaySplit(
      startTime, endTime, breakMin, body.shift_type, settings,
    );

    const holidays  = getLithuanianHolidays(parseInt(body.date.slice(0, 4), 10));
    const isHoliday = body.is_holiday ?? holidays.has(body.date);

    const row = {
      user_id:       uid(),
      date:          body.date,
      shift_type:    body.shift_type,
      start_time:    startTime,
      end_time:      endTime,
      break_min:     breakMin,
      notes:         body.notes ?? null,
      hours_worked,
      regular_hours,
      night_hours,
      gross_pay,
      is_holiday:    isHoliday,
      updated_at:    new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("work_shifts")
      .upsert(row as never, { onConflict: "user_id,date" })
      .select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ shift: data as unknown as WorkShift });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const body = await req.json() as ShiftBody;
    const supabase = await createAdminClient();
    const settings = await loadSettings(supabase);

    const { data: existing, error: exErr } = await supabase
      .from("work_shifts").select("*").eq("id", id).eq("user_id", uid()).single();
    if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
    const cur = existing as unknown as WorkShift;

    const shiftType = body.shift_type ?? cur.shift_type;
    const startTime = body.start_time ?? cur.start_time;
    const endTime   = body.end_time   ?? cur.end_time;
    const breakMin  = body.break_min  ?? cur.break_min;
    const dateStr   = body.date       ?? cur.date;

    const { hours_worked, gross_pay, regular_hours, night_hours } = calcGrossPaySplit(
      startTime, endTime, breakMin, shiftType, settings,
    );

    const holidays  = getLithuanianHolidays(parseInt(dateStr.slice(0, 4), 10));
    const isHoliday = body.is_holiday ?? holidays.has(dateStr);

    const patch = {
      date:          dateStr,
      shift_type:    shiftType,
      start_time:    startTime,
      end_time:      endTime,
      break_min:     breakMin,
      notes:         body.notes !== undefined ? body.notes : cur.notes,
      hours_worked,
      regular_hours,
      night_hours,
      gross_pay,
      is_holiday:    isHoliday,
      updated_at:    new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("work_shifts")
      .update(patch as never)
      .eq("id", id).eq("user_id", uid())
      .select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ shift: data as unknown as WorkShift });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("work_shifts").delete().eq("id", id).eq("user_id", uid());
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
