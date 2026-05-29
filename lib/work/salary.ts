import type { WorkShift, WorkSettings, ShiftType } from "./types";

export function calcHoursWorked(startTime: string, endTime: string, breakMin: number): number {
  const [sh, sm] = startTime.split(":").map(Number) as [number, number];
  const [eh, em] = endTime.split(":").map(Number) as [number, number];
  const startMins = sh * 60 + sm;
  let endMins   = eh * 60 + em;
  if (endMins <= startMins) endMins += 24 * 60; // overnight shift
  const worked = (endMins - startMins - breakMin) / 60;
  return Math.max(0, Math.round(worked * 100) / 100);
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
  const hours = calcHoursWorked(shift.start_time, shift.end_time, shift.break_min);
  const mult  = getMultiplier(shift.shift_type, settings);
  const gross = calcGrossPay(hours, settings.hourly_rate, mult);
  return { hours_worked: hours, gross_pay: gross };
}
