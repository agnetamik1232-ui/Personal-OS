"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Euro,
} from "lucide-react";
import {
  type WorkShift,
  type WorkSettings,
  type WorkSummary,
  type ShiftType,
  SHIFT_META,
} from "@/lib/work/types";
import { getLithuanianHolidays, HOLIDAY_NAMES } from "@/lib/work/holidays";
import { calcHoursWorked, calcNightSplit, calcGrossPaySplit } from "@/lib/work/salary";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;
const SHIFT_TYPES = Object.keys(SHIFT_META) as ShiftType[];
const BREAK_OPTIONS = [0, 15, 30, 45, 60] as const;

interface ShiftFormData {
  shift_type: ShiftType;
  start_time: string;
  end_time:   string;
  break_min:  number;
  notes:      string;
  is_holiday: boolean;
}

interface CalDay {
  date:    string;
  inMonth: boolean;
  isToday: boolean;
  dayNum:  number;
}

function fmt(n: number, currency = "€"): string {
  return currency + n.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtH(n: number): string {
  return `${n.toFixed(1)}h`;
}
function currencySymbol(code: string): string {
  if (code === "EUR") return "€";
  if (code === "USD") return "$";
  if (code === "GBP") return "£";
  return code + " ";
}

export function WorkCalendar(): React.JSX.Element {
  const [currentDate, setCurrentDate]           = useState(() => new Date());
  const [shifts, setShifts]                     = useState<Map<string, WorkShift>>(new Map());
  const [settings, setSettings]                 = useState<WorkSettings | null>(null);
  const [summary, setSummary]                   = useState<WorkSummary | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [selectedDate, setSelectedDate]         = useState<string | null>(null);
  const [showShiftModal, setShowShiftModal]     = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingShift, setEditingShift]         = useState<WorkShift | null>(null);
  const [saving, setSaving]                     = useState(false);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-indexed
  const holidays = useMemo(() => getLithuanianHolidays(year), [year]);

  const cur = settings ? currencySymbol(settings.currency) : "€";

  const calDays = useMemo<CalDay[]>(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay  = new Date(year, month, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
    const days: CalDay[] = [];

    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, -i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({ date: ds, inMonth: false, isToday: false, dayNum: d.getDate() });
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const ds = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ date: ds, inMonth: true, isToday: ds === todayStr, dayNum: d });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nd = new Date(year, month, d);
      const ds = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, "0")}-${String(nd.getDate()).padStart(2, "0")}`;
      days.push({ date: ds, inMonth: false, isToday: false, dayNum: d });
    }

    return days;
  }, [year, month]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [settRes, summRes] = await Promise.all([
      fetch("/api/work/settings").then((r) => r.json() as Promise<{ settings?: WorkSettings }>),
      fetch(`/api/work/summary?year=${year}&month=${month}`).then((r) => r.json() as Promise<{ summary?: WorkSummary }>),
    ]);
    if (settRes.settings) setSettings(settRes.settings);
    if (summRes.summary) {
      setSummary(summRes.summary);
      const map = new Map<string, WorkShift>();
      for (const s of (summRes.summary.shifts ?? [])) {
        map.set(s.date, s);
      }
      setShifts(map);
    }
    setLoading(false);
  }, [year, month]);

  useEffect(() => { void loadData(); }, [loadData]);

  function openShiftModal(date: string): void {
    const existing = shifts.get(date) ?? null;
    setSelectedDate(date);
    setEditingShift(existing);
    setShowShiftModal(true);
  }

  async function saveShift(form: ShiftFormData): Promise<void> {
    if (!selectedDate) return;
    setSaving(true);
    const method = editingShift ? "PATCH" : "POST";
    const url = editingShift
      ? `/api/work/shifts?id=${editingShift.id}`
      : "/api/work/shifts";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date:       selectedDate,
        shift_type: form.shift_type,
        start_time: form.start_time,
        end_time:   form.end_time,
        break_min:  form.break_min,
        notes:      form.notes,
        is_holiday: form.is_holiday,
      }),
    });
    setSaving(false);
    setShowShiftModal(false);
    setEditingShift(null);
    setSelectedDate(null);
    void loadData();
  }

  async function deleteShift(): Promise<void> {
    if (!editingShift) return;
    setSaving(true);
    await fetch(`/api/work/shifts?id=${editingShift.id}`, { method: "DELETE" });
    setSaving(false);
    setShowShiftModal(false);
    setEditingShift(null);
    setSelectedDate(null);
    void loadData();
  }

  async function saveSettings(next: WorkSettings): Promise<void> {
    setSaving(true);
    const res = await fetch("/api/work/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).then((r) => r.json() as Promise<{ settings?: WorkSettings }>);
    if (res.settings) setSettings(res.settings);
    setSaving(false);
    setShowSettingsModal(false);
    void loadData();
  }

  function prevMonth(): void { setCurrentDate(new Date(year, month - 2, 1)); }
  function nextMonth(): void { setCurrentDate(new Date(year, month, 1)); }

  // Breakdown rows per shift type with hours/pay
  const breakdown = useMemo(() => {
    const rate = settings?.hourly_rate ?? 0;
    const agg = new Map<ShiftType, { days: number; hours: number; gross: number }>();
    for (const s of shifts.values()) {
      const e = agg.get(s.shift_type) ?? { days: 0, hours: 0, gross: 0 };
      e.days  += 1;
      e.hours += s.hours_worked;
      // Old shifts saved with wrong night_start have night_hours=0 — recalculate gross live
      const isNightType = s.shift_type === "night" || s.shift_type === "overtime_night";
      const needsRecalc = isNightType && settings && (s.night_hours ?? 0) === 0 && s.hours_worked > 0;
      e.gross += needsRecalc && settings
        ? calcGrossPaySplit(s.start_time, s.end_time, s.break_min, s.shift_type, settings).gross_pay
        : s.gross_pay;
      agg.set(s.shift_type, e);
    }
    const rows = SHIFT_TYPES
      .filter((t) => agg.has(t))
      .map((t) => {
        const e = agg.get(t)!;
        return {
          type:  t,
          days:  e.days,
          hours: Math.round(e.hours * 100) / 100,
          gross: Math.round(e.gross * 100) / 100,
          rate,
          mult:  multForType(t, settings),
        };
      });
    return rows;
  }, [shifts, settings]);

  return (
    <div className="wrk-wrap">
      <header className="wrk-header">
        <div className="wrk-nav">
          <button className="wrk-nav-btn" onClick={prevMonth} aria-label="Previous month">
            <ChevronLeft size={18} />
          </button>
          <div className="wrk-month-title">{MONTH_NAMES[month - 1]} {year}</div>
          <button className="wrk-nav-btn" onClick={nextMonth} aria-label="Next month">
            <ChevronRight size={18} />
          </button>
        </div>
        <button className="wrk-settings-btn" onClick={() => setShowSettingsModal(true)}>
          <Settings size={15} /> Settings
        </button>
      </header>

      {loading && !summary ? (
        <div className="wrk-loading">Loading…</div>
      ) : (
        <>
          <div className="wrk-cal-wrap">
            <div className="wrk-cal-days-header">
              {WEEKDAYS.map((d) => (
                <div key={d} className="wrk-cal-day-hdr">{d}</div>
              ))}
            </div>
            <div className="wrk-cal-grid">
              {calDays.map((cd) => {
                const shift = shifts.get(cd.date);
                const isHoliday = holidays.has(cd.date);
                const meta = shift ? SHIFT_META[shift.shift_type] : null;
                const cls = [
                  "wrk-cal-cell",
                  !cd.inMonth ? "wrk-cal-cell-other" : "",
                  cd.isToday ? "wrk-cal-cell-today" : "",
                ].filter(Boolean).join(" ");
                return (
                  <div
                    key={cd.date}
                    className={cls}
                    onClick={cd.inMonth ? () => openShiftModal(cd.date) : undefined}
                  >
                    <div className={`wrk-date-num${cd.isToday ? " wrk-date-num-today" : ""}`}>
                      {cd.dayNum}
                    </div>
                    {cd.inMonth && isHoliday && <div className="wrk-holiday-badge" />}
                    {meta && shift ? (
                      <>
                        <div className="wrk-shift-bar" style={{ background: meta.color }} />
                        <div className="wrk-shift-label" style={{ color: meta.color }}>{meta.short}</div>
                        {shift.hours_worked > 0 && (
                          <div className="wrk-shift-hours">{fmtH(shift.hours_worked)}</div>
                        )}
                      </>
                    ) : (
                      cd.inMonth && <div className="wrk-add-hint">+</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="wrk-legend">
              {SHIFT_TYPES.map((t) => (
                <div key={t} className="wrk-legend-item">
                  <span className="wrk-legend-dot" style={{ background: SHIFT_META[t].color }} />
                  {SHIFT_META[t].label}
                </div>
              ))}
            </div>
          </div>

          {summary && (
            <div className="wrk-forecast">
              <div className="wrk-forecast-item">
                <div className="wrk-forecast-label">Net This Month</div>
                <div className="wrk-forecast-value">{fmt(summary.net_salary, cur)}</div>
                <div className="wrk-forecast-sub">after {Math.round((settings?.tax_rate ?? 0) * 100)}% tax</div>
              </div>
              <div className="wrk-forecast-group">
                <div className="wrk-forecast-item">
                  <div className="wrk-forecast-label">Gross</div>
                  <div className="wrk-forecast-value" style={{ fontSize: 20 }}>{fmt(summary.gross_salary, cur)}</div>
                </div>
                <div className="wrk-forecast-item">
                  <div className="wrk-forecast-label">Hours</div>
                  <div className="wrk-forecast-value" style={{ fontSize: 20 }}>{fmtH(summary.total_hours)}</div>
                </div>
                <div className="wrk-forecast-item">
                  <div className="wrk-forecast-label">Days</div>
                  <div className="wrk-forecast-value" style={{ fontSize: 20 }}>{summary.days_worked}</div>
                </div>
              </div>
            </div>
          )}

          {summary && (
            <div className="wrk-salary-grid">
              <SalaryCard label="Gross Salary" value={fmt(summary.gross_salary, cur)} />
              <SalaryCard label="Net Salary"   value={fmt(summary.net_salary, cur)}  tone="green" />
              <SalaryCard label="Tax"          value={fmt(summary.tax_amount, cur)}  tone="red" />
              <SalaryCard label="Hours Worked" value={fmtH(summary.total_hours)}     tone="blue" />
              <SalaryCard label="Night Hours"  value={fmtH(summary.night_hours)} />
              <SalaryCard label="Holiday Hours" value={fmtH(summary.holiday_hours)} />
              <SalaryCard label="Avg Hourly"   value={fmt(summary.avg_hourly, cur)} sub="per hour" />
            </div>
          )}

          {breakdown.length > 0 && (
            <div className="wrk-breakdown">
              <div className="wrk-breakdown-title">Monthly Breakdown</div>
              <table className="wrk-breakdown-table">
                <thead>
                  <tr>
                    <th>Shift Type</th>
                    <th>Days</th>
                    <th>Hours</th>
                    <th>Rate</th>
                    <th>Gross</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((r) => (
                    <tr key={r.type}>
                      <td>
                        <span className="wrk-breakdown-dot" style={{ background: SHIFT_META[r.type].color }} />
                        {SHIFT_META[r.type].label}
                      </td>
                      <td>{r.days}</td>
                      <td>{fmtH(r.hours)}</td>
                      <td>{fmt(r.rate * r.mult, cur)}</td>
                      <td>{fmt(r.gross, cur)}</td>
                    </tr>
                  ))}
                  <tr className="wrk-breakdown-totals">
                    <td>Total</td>
                    <td>{breakdown.reduce((a, r) => a + r.days, 0)}</td>
                    <td>{fmtH(summary?.total_hours ?? 0)}</td>
                    <td>—</td>
                    <td>{fmt(summary?.gross_salary ?? 0, cur)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showShiftModal && selectedDate && (
        <ShiftModal
          date={selectedDate}
          isHoliday={holidays.has(selectedDate)}
          editing={editingShift}
          saving={saving}
          rate={settings?.hourly_rate ?? 0}
          settings={settings}
          currency={cur}
          onClose={() => { setShowShiftModal(false); setEditingShift(null); setSelectedDate(null); }}
          onSave={saveShift}
          onDelete={deleteShift}
        />
      )}

      {showSettingsModal && settings && (
        <SettingsModal
          settings={settings}
          saving={saving}
          onClose={() => setShowSettingsModal(false)}
          onSave={saveSettings}
        />
      )}
    </div>
  );
}

function multForType(t: ShiftType, s: WorkSettings | null): number {
  if (!s) return 1;
  const map: Record<ShiftType, number> = {
    day: s.mult_day, night: s.mult_night, overtime_day: s.mult_overtime_day,
    overtime_night: s.mult_overtime_night, day_off: s.mult_day_off, holiday: s.mult_holiday,
    vacation: s.mult_vacation, sick: s.mult_sick, unpaid: s.mult_unpaid, custom: s.mult_custom,
  };
  return map[t];
}

function SalaryCard({ label, value, tone, sub }: {
  label: string; value: string; tone?: "green" | "red" | "blue"; sub?: string;
}): React.JSX.Element {
  const toneCls =
    tone === "green" ? " wrk-salary-value-green" :
    tone === "red"   ? " wrk-salary-value-red"   :
    tone === "blue"  ? " wrk-salary-value-blue"  : "";
  return (
    <div className="wrk-salary-card">
      <div className="wrk-salary-label">{label}</div>
      <div className={`wrk-salary-value${toneCls}`}>{value}</div>
      {sub && <div className="wrk-salary-sub">{sub}</div>}
    </div>
  );
}

function ShiftModal({
  date, isHoliday, editing, saving, rate, settings, currency, onClose, onSave, onDelete,
}: {
  date:      string;
  isHoliday: boolean;
  editing:   WorkShift | null;
  saving:    boolean;
  rate:      number;
  settings:  WorkSettings | null;
  currency:  string;
  onClose:   () => void;
  onSave:    (form: ShiftFormData) => void;
  onDelete:  () => void;
}): React.JSX.Element {
  // Default times per shift type (your schedule: day 06:00–18:00, night 18:00–06:00)
  function defaultTimes(type: ShiftType): { start: string; end: string } {
    if (type === "night" || type === "overtime_night") return { start: "18:00", end: "06:00" };
    return { start: "06:00", end: "18:00" };
  }

  const initialType = editing?.shift_type ?? (isHoliday ? "holiday" : "day");
  const initialDefaults = defaultTimes(initialType);

  const [shiftType, setShiftType] = useState<ShiftType>(initialType);
  const [startTime, setStartTime] = useState(editing?.start_time ?? initialDefaults.start);
  const [endTime, setEndTime]     = useState(editing?.end_time   ?? initialDefaults.end);
  const [breakMin, setBreakMin]   = useState(editing?.break_min  ?? 60);
  const [notes, setNotes]         = useState(editing?.notes ?? "");

  // When user switches shift type, auto-fill times if they haven't been manually changed
  function handleShiftTypeChange(type: ShiftType): void {
    if (!editing) {
      const d = defaultTimes(type);
      setStartTime(d.start);
      setEndTime(d.end);
    }
    setShiftType(type);
  }

  // Night shifts split: 18:00–22:00 at regular rate, 22:00–06:00 at night rate
  const isNightType = shiftType === "night" || shiftType === "overtime_night";
  const nightStart  = settings?.night_start ?? "22:00";
  const nightEnd    = settings?.night_end   ?? "06:00";

  const { regularHours, nightHours, totalHours } = useMemo(() => {
    if (!isNightType) return { regularHours: 0, nightHours: 0, totalHours: calcHoursWorked(startTime, endTime, breakMin) };
    return calcNightSplit(startTime, endTime, breakMin, nightStart, nightEnd);
  }, [startTime, endTime, breakMin, isNightType, nightStart, nightEnd]);

  const hours = totalHours;
  const gross = useMemo(() => {
    if (!isNightType) {
      return Math.round(hours * rate * multForType(shiftType, settings) * 100) / 100;
    }
    const dayMult   = shiftType === "night" ? (settings?.mult_day ?? 1) : (settings?.mult_overtime_day ?? 1.5);
    const nightMult = shiftType === "night" ? (settings?.mult_night ?? 1.5) : (settings?.mult_overtime_night ?? 2);
    return Math.round((regularHours * rate * dayMult + nightHours * rate * nightMult) * 100) / 100;
  }, [hours, rate, shiftType, settings, isNightType, regularHours, nightHours]);

  const holidayName = useMemo(() => HOLIDAY_NAMES[date.slice(5)], [date]);
  const dateLabel = useMemo(() => {
    const [y, m, d] = date.split("-").map(Number) as [number, number, number];
    return new Date(y, m - 1, d).toLocaleDateString("en-IE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  }, [date]);

  function submit(): void {
    onSave({ shift_type: shiftType, start_time: startTime, end_time: endTime, break_min: breakMin, notes, is_holiday: isHoliday });
  }

  return (
    <div className="wrk-modal-backdrop" onClick={onClose}>
      <div className="wrk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wrk-modal-title">
          {editing ? "Edit Shift" : "Add Shift"}
          <button className="wrk-modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="wrk-field">
          <span className="wrk-field-label">Date</span>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1C1A17" }}>{dateLabel}</div>
        </div>

        {isHoliday && (
          <div className="wrk-holiday-alert">
            Public Holiday{holidayName ? ` — ${holidayName}` : ""}
          </div>
        )}

        <div className="wrk-field">
          <span className="wrk-field-label">Shift Type</span>
          <div className="wrk-shift-type-grid">
            {SHIFT_TYPES.map((t) => {
              const active = t === shiftType;
              return (
                <button
                  key={t}
                  className={`wrk-shift-type-btn${active ? " wrk-shift-type-btn-active" : ""}`}
                  style={active ? { borderColor: SHIFT_META[t].color, background: `${SHIFT_META[t].color}12` } : undefined}
                  onClick={() => handleShiftTypeChange(t)}
                  type="button"
                >
                  <span className="wrk-shift-type-dot" style={{ background: SHIFT_META[t].color }} />
                  {SHIFT_META[t].label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="wrk-time-row">
          <div className="wrk-field">
            <span className="wrk-field-label">Start</span>
            <input className="wrk-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="wrk-field">
            <span className="wrk-field-label">End</span>
            <input className="wrk-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <div className="wrk-field">
            <span className="wrk-field-label">Break</span>
            <select className="wrk-input" value={breakMin} onChange={(e) => setBreakMin(Number(e.target.value))}>
              {BREAK_OPTIONS.map((b) => <option key={b} value={b}>{b} min</option>)}
            </select>
          </div>
        </div>

        <div className="wrk-hours-preview">
          <Clock size={15} />
          <span>{fmtH(hours)} worked</span>
          {isNightType && nightHours > 0 && (
            <span className="wrk-preview-split">
              {fmtH(regularHours)} regular · {fmtH(nightHours)} night (22–06)
            </span>
          )}
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            <Euro size={14} /> {fmt(gross, currency)}
          </span>
        </div>

        <div className="wrk-field">
          <span className="wrk-field-label">Notes</span>
          <textarea className="wrk-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="wrk-modal-footer">
          {editing
            ? <button className="wrk-btn-delete" onClick={onDelete} disabled={saving} type="button">Delete</button>
            : <span />}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="wrk-btn-cancel" onClick={onClose} type="button">Cancel</button>
            <button className="wrk-btn-save" onClick={submit} disabled={saving} type="button">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({
  settings, saving, onClose, onSave,
}: {
  settings: WorkSettings;
  saving:   boolean;
  onClose:  () => void;
  onSave:   (next: WorkSettings) => void;
}): React.JSX.Element {
  const [draft, setDraft] = useState<WorkSettings>(settings);

  function setMult(t: ShiftType, v: number): void {
    const key = (
      t === "day" ? "mult_day" :
      t === "night" ? "mult_night" :
      t === "overtime_day" ? "mult_overtime_day" :
      t === "overtime_night" ? "mult_overtime_night" :
      t === "day_off" ? "mult_day_off" :
      t === "holiday" ? "mult_holiday" :
      t === "vacation" ? "mult_vacation" :
      t === "sick" ? "mult_sick" :
      t === "unpaid" ? "mult_unpaid" :
      "mult_custom"
    ) as keyof WorkSettings;
    setDraft({ ...draft, [key]: v });
  }

  function multValue(t: ShiftType): number {
    return multForType(t, draft);
  }

  return (
    <div className="wrk-modal-backdrop" onClick={onClose}>
      <div className="wrk-modal wrk-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wrk-modal-title">
          Work Settings
          <button className="wrk-modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="wrk-settings-row">
          <div className="wrk-field">
            <span className="wrk-field-label">Hourly Rate</span>
            <input
              className="wrk-input" type="number" step="0.01" min="0"
              value={draft.hourly_rate}
              onChange={(e) => setDraft({ ...draft, hourly_rate: Number(e.target.value) })}
            />
          </div>
          <div className="wrk-field">
            <span className="wrk-field-label">Tax Rate (%)</span>
            <input
              className="wrk-input" type="number" step="0.1" min="0" max="100"
              value={Math.round(draft.tax_rate * 1000) / 10}
              onChange={(e) => setDraft({ ...draft, tax_rate: Number(e.target.value) / 100 })}
            />
          </div>
        </div>

        <div>
          <div className="wrk-section-title">Multipliers</div>
          <table className="wrk-mult-table">
            <thead>
              <tr><th>Shift Type</th><th>Multiplier</th></tr>
            </thead>
            <tbody>
              {SHIFT_TYPES.map((t) => (
                <tr key={t}>
                  <td>
                    <span className="wrk-breakdown-dot" style={{ background: SHIFT_META[t].color }} />
                    {SHIFT_META[t].label}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <input
                      className="wrk-mult-input" type="number" step="0.05" min="0"
                      value={multValue(t)}
                      onChange={(e) => setMult(t, Number(e.target.value))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="wrk-settings-row">
          <div className="wrk-field">
            <span className="wrk-field-label">Night Start</span>
            <input className="wrk-input" type="time" value={draft.night_start}
              onChange={(e) => setDraft({ ...draft, night_start: e.target.value })} />
          </div>
          <div className="wrk-field">
            <span className="wrk-field-label">Night End</span>
            <input className="wrk-input" type="time" value={draft.night_end}
              onChange={(e) => setDraft({ ...draft, night_end: e.target.value })} />
          </div>
        </div>

        <div className="wrk-modal-footer">
          <span />
          <div style={{ display: "flex", gap: 10 }}>
            <button className="wrk-btn-cancel" onClick={onClose} type="button">Cancel</button>
            <button className="wrk-btn-save" onClick={() => onSave(draft)} disabled={saving} type="button">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
