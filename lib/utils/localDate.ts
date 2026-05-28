/**
 * All date helpers use the operator's IANA timezone so the day boundary
 * is always "Vilnius midnight", regardless of where the server runs.
 *
 * sv-SE locale formats dates as YYYY-MM-DD which is what we want.
 */
import { OPERATOR } from "@/lib/config/operator";

const TZ = OPERATOR.timezone; // "Europe/Vilnius"

/** Returns YYYY-MM-DD in the operator's timezone. */
export function localDateKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d);
}

/** Returns the current time as a formatted string in the operator's timezone. */
export function localTimeString(d: Date = new Date(), opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).format(d);
}

/**
 * Number of whole days between two YYYY-MM-DD strings (b - a).
 * Positive = b is in the future relative to a.
 */
export function dayDiff(aKey: string, bKey: string): number {
  const parse = (k: string) => {
    const [y, m, d] = k.split("-").map(Number) as [number, number, number];
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(bKey) - parse(aKey)) / 86_400_000);
}
