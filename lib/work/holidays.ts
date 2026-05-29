// Lithuanian public holidays
export function getLithuanianHolidays(year: number): Set<string> {
  // Compute Easter using Anonymous Gregorian algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-indexed
  const day   = ((h + l - 7 * m + 114) % 31) + 1;

  const easterDate = new Date(Date.UTC(year, month - 1, day));
  const easterMon  = new Date(easterDate); easterMon.setUTCDate(easterMon.getUTCDate() + 1);

  function ymd(dt: Date): string {
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  }

  const fixed = [
    `${year}-01-01`, // New Year's Day
    `${year}-02-16`, // Restoration of State
    `${year}-03-11`, // Restoration of Independence
    `${year}-05-01`, // Labour Day
    `${year}-06-24`, // St. John's Day
    `${year}-07-06`, // Statehood Day
    `${year}-08-15`, // Assumption
    `${year}-11-01`, // All Saints' Day
    `${year}-11-02`, // All Souls' Day
    `${year}-12-24`, // Christmas Eve
    `${year}-12-25`, // Christmas Day
    `${year}-12-26`, // Second Christmas Day
  ];

  return new Set([...fixed, ymd(easterDate), ymd(easterMon)]);
}

export const HOLIDAY_NAMES: Record<string, string> = {
  "01-01": "New Year's Day",
  "02-16": "Restoration of State",
  "03-11": "Restoration of Independence",
  "05-01": "Labour Day",
  "06-24": "St. John's Day",
  "07-06": "Statehood Day",
  "08-15": "Assumption of Mary",
  "11-01": "All Saints' Day",
  "11-02": "All Souls' Day",
  "12-24": "Christmas Eve",
  "12-25": "Christmas Day",
  "12-26": "Second Christmas Day",
};
