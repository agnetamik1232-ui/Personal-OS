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
  { id: "read",     name: "Read 30 min",    icon: "📖" },
  { id: "workout",  name: "Workout",         icon: "🏋️" },
  { id: "no-phone", name: "No phone < 1h",   icon: "📵" },
  { id: "journal",  name: "Journal",         icon: "✍️" },
  { id: "meditate", name: "Meditate 10 min", icon: "🧘" },
  { id: "sleep",    name: "Sleep by 23:00",  icon: "😴" },
];

export const HABIT_IDS = HABITS.map((h) => h.id);
