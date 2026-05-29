export type ShiftType =
  | "day"
  | "night"
  | "overtime_day"
  | "overtime_night"
  | "day_off"
  | "holiday"
  | "vacation"
  | "sick"
  | "unpaid"
  | "custom";

export interface WorkShift {
  id:           string;
  date:         string;        // YYYY-MM-DD
  shift_type:   ShiftType;
  start_time:   string;        // HH:MM
  end_time:     string;        // HH:MM
  break_min:    number;
  notes:        string | null;
  hours_worked:   number;
  regular_hours:  number;
  night_hours:    number;
  gross_pay:      number;
  is_holiday:     boolean;
  created_at:   string;
  updated_at:   string;
}

export interface WorkSettings {
  id:                   string;
  hourly_rate:          number;
  currency:             string;
  tax_rate:             number;   // 0–1 e.g. 0.36
  mult_day:             number;
  mult_night:           number;
  mult_overtime_day:    number;
  mult_overtime_night:  number;
  mult_day_off:         number;
  mult_holiday:         number;
  mult_vacation:        number;
  mult_sick:            number;
  mult_unpaid:          number;
  mult_custom:          number;
  night_start:          string;   // HH:MM
  night_end:            string;   // HH:MM
  updated_at:           string;
}

export interface WorkSummary {
  year:             number;
  month:            number;
  total_hours:      number;
  day_hours:        number;
  night_hours:      number;
  overtime_hours:   number;
  holiday_hours:    number;
  day_off_hours:    number;
  vacation_days:    number;
  sick_days:        number;
  days_worked:      number;
  gross_salary:     number;
  tax_amount:       number;
  net_salary:       number;
  avg_hourly:       number;
  shifts:           WorkShift[];
  currency:         string;
}

export const SHIFT_META: Record<ShiftType, { label: string; color: string; short: string }> = {
  day:            { label: "Day Shift",       color: "#3B82F6", short: "DAY"  },
  night:          { label: "Night Shift",     color: "#7C3AED", short: "NGT"  },
  overtime_day:   { label: "Overtime Day",    color: "#F97316", short: "OVD"  },
  overtime_night: { label: "Overtime Night",  color: "#DC2626", short: "OVN"  },
  day_off:        { label: "Day Off Worked",  color: "#10B981", short: "OFF"  },
  holiday:        { label: "Public Holiday",  color: "#EF4444", short: "HOL"  },
  vacation:       { label: "Vacation",        color: "#9CA3AF", short: "VAC"  },
  sick:           { label: "Sick Leave",      color: "#F59E0B", short: "SICK" },
  unpaid:         { label: "Unpaid Leave",    color: "#D1D5DB", short: "UNP"  },
  custom:         { label: "Custom",          color: "#6366F1", short: "CST"  },
};
