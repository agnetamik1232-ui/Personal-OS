/**
 * Habit configuration — edit this file to change which habits are tracked.
 * Keep exactly 6 entries (the card renders a fixed 6-row grid).
 * `id` must be a stable slug — it is the key used in daily_logs.notes JSON.
 */

export interface HabitConfig {
  id:   string;   // stable slug, e.g. "read"
  name: string;   // display label
  icon: string;   // emoji or 1–2 char symbol
}

export const HABITS: HabitConfig[] = [
  { id: "workout",  name: "Gym / Training",   icon: "🏋️" },
  { id: "steps",    name: "10,000 Steps",     icon: "👟" },
  { id: "protein",  name: "Protein Goal",     icon: "🥩" },
  { id: "water",    name: "2L Water",         icon: "💧" },
  { id: "sleep",    name: "Sleep by 23:00",   icon: "😴" },
  { id: "journal",  name: "Journal",          icon: "✍️" },
];

export const HABIT_IDS = HABITS.map((h) => h.id);
