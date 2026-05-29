import type { WorkShift, WorkSettings, ShiftType } from "./types";

const toMin = (t: string): number => {
  const [h, m] = t.split(":").map(Number) as [number, number];
  return h * 60 + m;
};

export function calcHoursWorked(startTime: string, endTime: string, breakMin: number): number {
  const sMin = toMin(startTime);
  let eMin = toMin(endTime);
  if (eMin <= sMin) eMin += 1440; // overnight
  return Math.max(0, Math.round((eMin - sMin - breakMin) * 100 / 60) / 100);
}

/**
 * Split shift hours into regular and night portions.
 * In Lithuania night supplement applies 22:00–06:00.
 *
 * Example — 18:00→06:00, 60 min break, night window 22:00→06:00:
 *   regularRaw = 240 min (18–22), nightRaw = 480 min (22–06)
 *   break applied to regular first → regular = 180 min (3h), night = 480 min (8h)
 */
export function calcNightSplit(
  startTime: string,
  endTime:   string,
  breakMin:  number,
  nightStart = "22:00",
  nightEnd   = "06:00",
): { regularHours: number; nightHours: number; totalHours: number } {
  const sMin = toMin(startTime);
  let eMin = toMin(endTime);
  if (eMin <= sMin) eMin += 1440;

  const nsMin = toMin(nightStart);
  let neMin = toMin(nightEnd);
  if (neMin <= nsMin) neMin += 1440; // e.g. 360 → 1800

  // Overlap of the shift window with the night window
  const overlapStart = Math.max(sMin, nsMin);
  const overlapEnd   = Math.min(eMin, neMin);
  const nightRaw     = Math.max(0, overlapEnd - overlapStart);
  const regularRaw   = (eMin - sMin) - nightRaw;

  // Break falls in the night window (e.g. 23:00–00:00) — deduct from night first,
  // overflow into regular only if night portion isn't long enough.
  const breakInNight   = Math.min(breakMin, nightRaw);
  const breakInRegular = breakMin - breakInNight;

  const regularMin = Math.max(0, regularRaw - breakInRegular);
  const nightMin   = Math.max(0, nightRaw   - breakInNight);

  const r = (n: number) => Math.round(n * 100 / 60) / 100;
  return { regularHours: r(regularMin), nightHours: r(nightMin), totalHours: r(regularMin + nightMin) };
}

export function getMultiplier(shiftType: ShiftType, settings: WorkSettings): number {
  const map: Record<ShiftType, number> = {
    day:            settings.mult_day,
    night:          settings.mult_night,
    overtime_day:   settings.mult_overtime_day,
    overtime_night: settings.mult_overtime_night,
    day_off:        settings.mult_day_off,
    holiday:        settings.mult_holiday,
    vacation:       settings.mult_vacation,
    sick:           settings.mult_sick,
    unpaid:         settings.mult_unpaid,
    custom:         settings.mult_custom,
  };
  return map[shiftType];
}

/**
 * Gross pay with proper night-hour splitting for night/overtime_night shifts.
 * Regular hours (before 22:00) get day rate; night hours (22:00–06:00) get night rate.
 */
export function calcGrossPaySplit(
  startTime:  string,
  endTime:    string,
  breakMin:   number,
  shiftType:  ShiftType,
  settings:   WorkSettings,
): { hours_worked: number; gross_pay: number; regular_hours: number; night_hours: number } {
  const rate = settings.hourly_rate;

  if (shiftType === "night" || shiftType === "overtime_night") {
    const { regularHours, nightHours, totalHours } = calcNightSplit(
      startTime, endTime, breakMin, settings.night_start, settings.night_end,
    );
    const dayMult   = shiftType === "night" ? settings.mult_day : settings.mult_overtime_day;
    const nightMult = shiftType === "night" ? settings.mult_night : settings.mult_overtime_night;
    const gross = Math.round((regularHours * rate * dayMult + nightHours * rate * nightMult) * 100) / 100;
    return { hours_worked: totalHours, gross_pay: gross, regular_hours: regularHours, night_hours: nightHours };
  }

  // All other types: single multiplier across all hours
  const hours = calcHoursWorked(startTime, endTime, breakMin);
  const mult  = getMultiplier(shiftType, settings);
  const gross = Math.round(hours * rate * mult * 100) / 100;
  return { hours_worked: hours, gross_pay: gross, regular_hours: hours, night_hours: 0 };
}

export function calcGrossPay(hours: number, rate: number, multiplier: number): number {
  return Math.round(hours * rate * multiplier * 100) / 100;
}

export function calcNet(gross: number, taxRate: number): number {
  return Math.round(gross * (1 - taxRate) * 100) / 100;
}

export function calcTax(gross: number, taxRate: number): number {
  return Math.round(gross * taxRate * 100) / 100;
}

export function enrichShift(shift: Omit<WorkShift, "hours_worked" | "gross_pay">, settings: WorkSettings): Pick<WorkShift, "hours_worked" | "gross_pay"> {
  const { hours_worked, gross_pay } = calcGrossPaySplit(
    shift.start_time, shift.end_time, shift.break_min, shift.shift_type, settings,
  );
  return { hours_worked, gross_pay };
}
