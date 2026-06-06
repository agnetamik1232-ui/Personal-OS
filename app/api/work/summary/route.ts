import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { calcNet, calcTax, calcGrossPaySplit } from "@/lib/work/salary";
import type { WorkShift, WorkSettings, WorkSummary } from "@/lib/work/types";

function uid(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

const DEFAULT_SETTINGS = {
  hourly_rate: 13.22, currency: "EUR", tax_rate: 0.39,
  mult_day: 1.0, mult_night: 1.5, mult_overtime_day: 1.5,
  mult_overtime_night: 2.0, mult_day_off: 2.0, mult_day_off_night: 2.5, mult_holiday: 2.0,
  mult_vacation: 1.0, mult_sick: 0.0, mult_unpaid: 0.0, mult_custom: 1.0,
  night_start: "22:00", night_end: "06:00",
};

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

    const [{ data: settData }, { data: shiftData, error: shiftErr }] = await Promise.all([
      supabase.from("work_settings").select("*").eq("user_id", uid()).single(),
      supabase.from("work_shifts").select("*").eq("user_id", uid())
        .gte("date", start).lte("date", end).order("date", { ascending: true }),
    ]);
    if (shiftErr) return NextResponse.json({ error: shiftErr.message }, { status: 500 });

    const settings: WorkSettings = settData
      ? (settData as unknown as WorkSettings)
      : { id: "", updated_at: new Date().toISOString(), ...DEFAULT_SETTINGS };
    // Self-heal: correct bad night_start that was seeded as "18:00"
    if (settings.night_start === "18:00") {
      settings.night_start = "22:00";
      void supabase
        .from("work_settings")
        .update({ night_start: "22:00", updated_at: new Date().toISOString() } as never)
        .eq("user_id", uid());
    }

    const shifts = (shiftData ?? []) as unknown as WorkShift[];

    let total_hours = 0, day_hours = 0, night_hours = 0, overtime_hours = 0;
    let holiday_hours = 0, day_off_hours = 0, vacation_days = 0, sick_days = 0;
    let days_worked = 0, gross_salary = 0;

    for (const s of shifts) {
      const isNightType = s.shift_type === "night" || s.shift_type === "overtime_night" || s.shift_type === "day_off_night";

      // For old shifts with no split stored (regular_hours=0 on a night shift), recalculate everything live
      let sNight   = s.night_hours   ?? 0;
      let sRegular = s.regular_hours ?? 0;
      let sPay     = s.gross_pay;

      if (isNightType && sNight === 0 && s.hours_worked > 0) {
        const recalc = calcGrossPaySplit(s.start_time, s.end_time, s.break_min, s.shift_type, settings);
        sNight   = recalc.night_hours;
        sRegular = recalc.regular_hours;
        sPay     = recalc.gross_pay;
      } else if (!isNightType && sRegular === 0) {
        sRegular = s.hours_worked;
      }

      total_hours += s.hours_worked;
      gross_salary += sPay;
      switch (s.shift_type) {
        case "day":            day_hours += sRegular; break;
        case "night":          night_hours += sNight; day_hours += sRegular; break;
        case "overtime_day":   overtime_hours += s.hours_worked; day_hours += sRegular; break;
        case "overtime_night": overtime_hours += s.hours_worked; night_hours += sNight; day_hours += sRegular; break;
        case "holiday":        holiday_hours += s.hours_worked; break;
        case "day_off":        day_off_hours += s.hours_worked; break;
        case "day_off_night":  day_off_hours += s.hours_worked; night_hours += sNight; break;
        case "vacation":       vacation_days += 1; break;
        case "sick":           sick_days += 1; break;
        case "unpaid":         break;
        case "custom":         break;
      }
      if (s.hours_worked > 0) days_worked += 1;
    }

    const round = (n: number): number => Math.round(n * 100) / 100;
    gross_salary = round(gross_salary);
    const tax_amount = calcTax(gross_salary, settings.tax_rate);
    const net_salary = calcNet(gross_salary, settings.tax_rate);
    const avg_hourly = total_hours > 0 ? round(gross_salary / total_hours) : 0;

    const summary: WorkSummary = {
      year, month,
      total_hours:    round(total_hours),
      day_hours:      round(day_hours),
      night_hours:    round(night_hours),
      overtime_hours: round(overtime_hours),
      holiday_hours:  round(holiday_hours),
      day_off_hours:  round(day_off_hours),
      vacation_days,
      sick_days,
      days_worked,
      gross_salary,
      tax_amount,
      net_salary,
      avg_hourly,
      shifts,
      currency: settings.currency,
    };

    return NextResponse.json({ summary });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
