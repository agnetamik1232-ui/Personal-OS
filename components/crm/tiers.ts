/** Urgency tier definitions — single source of truth for Kanban columns */

export const TIERS = [
  { id: "today",      label: "Today",      color: "#E05C4A", dot: "🔥" },
  { id: "this_week",  label: "This Week",  color: "#C07B4A", dot: "📅" },
  { id: "this_month", label: "This Month", color: "#5B8FB9", dot: "🗓" },
  { id: "someday",    label: "Someday",    color: "#8A8A8A", dot: "💤" },
] as const;

export type TierId = (typeof TIERS)[number]["id"];

/** Map DB urgency value → canonical tier ID */
export function urgencyToTier(urgency: string | null): TierId {
  switch (urgency) {
    case "today":
    case "high":
    case "urgent":
      return "today";
    case "this_week":
    case "medium":
      return "this_week";
    case "this_month":
    case "low":
      return "this_month";
    default:
      return "someday";
  }
}

/** Map tier ID → the urgency string we write to the DB */
export function tierToUrgency(tier: TierId): string {
  return tier;   // "today" | "this_week" | "this_month" | "someday"
}
