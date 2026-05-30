export interface DailyCheckin {
  id:                string;
  date:              string;        // YYYY-MM-DD
  mood:              number | null; // 1–10
  energy:            number | null; // 1–10
  mental_energy:     number | null; // 1–10
  sleep_hours:       number | null;
  sleep_quality:     number | null; // 1–10
  weight_kg:         number | null;
  workout_done:      boolean | null;
  workout_type:      string | null;
  workout_minutes:   number | null;
  digestion:         number | null; // 1–10
  symptoms:          string[];
  biggest_win:       string | null;
  biggest_challenge: string | null;
  notes:             string | null;
  completed:         boolean;
  created_at:        string;
  updated_at:        string;
}

export interface CheckinStats {
  avgMood:       number | null;
  avgEnergy:     number | null;
  avgSleep:      number | null;
  avgSleepQual:  number | null;
  avgDigestion:  number | null;
  workoutPct:    number | null;
  totalCheckins: number;
  currentStreak: number;
  latestWeight:  number | null;
  topChallenges: { text: string; count: number }[];
  topWins:       { text: string; count: number }[];
  moodTrend:     { date: string; mood: number }[];
  sleepTrend:    { date: string; hours: number; quality: number | null }[];
  energyTrend:   { date: string; energy: number }[];
  weightTrend:   { date: string; weight: number }[];
}

export const MOOD_SCALE: Record<number, { emoji: string; label: string; color: string }> = {
  1:  { emoji: "😞", label: "Very Low",  color: "#DC2626" },
  2:  { emoji: "😟", label: "Low",       color: "#EF4444" },
  3:  { emoji: "😕", label: "Below Avg", color: "#F97316" },
  4:  { emoji: "😐", label: "Meh",       color: "#F59E0B" },
  5:  { emoji: "🙂", label: "Okay",      color: "#EAB308" },
  6:  { emoji: "😊", label: "Good",      color: "#84CC16" },
  7:  { emoji: "😄", label: "Great",     color: "#22C55E" },
  8:  { emoji: "😁", label: "Very Good", color: "#10B981" },
  9:  { emoji: "🤩", label: "Amazing",   color: "#2E6B45" },
  10: { emoji: "🥳", label: "Perfect",   color: "#2E6B45" },
};

export const ENERGY_SCALE: Record<number, { label: string; color: string }> = {
  1:  { label: "Exhausted",   color: "#DC2626" },
  2:  { label: "Very Low",    color: "#EF4444" },
  3:  { label: "Low",         color: "#F97316" },
  4:  { label: "Below Avg",   color: "#F59E0B" },
  5:  { label: "Moderate",    color: "#EAB308" },
  6:  { label: "Good",        color: "#84CC16" },
  7:  { label: "Energised",   color: "#22C55E" },
  8:  { label: "High",        color: "#10B981" },
  9:  { label: "Very High",   color: "#2E6B45" },
  10: { label: "Peak",        color: "#2E6B45" },
};

export const SYMPTOMS = [
  "Bloating", "Stomach Pain", "Low Appetite", "High Appetite",
  "Energy Crash", "Brain Fog", "Headache", "Fatigue",
  "Nausea", "Acid Reflux", "Constipation", "Other",
] as const;

export const WORKOUT_TYPES = [
  "Gym", "Run", "Walk", "Cycle", "Swim",
  "HIIT", "Yoga", "Stretching", "Sports", "Other",
] as const;

export const CHECKIN_STEPS = [
  { id: "mood",     title: "Mood & Energy",  emoji: "😊" },
  { id: "sleep",    title: "Sleep",           emoji: "😴" },
  { id: "body",     title: "Body & Workout",  emoji: "💪" },
  { id: "reflect",  title: "Reflection",      emoji: "✦"  },
] as const;

export type CheckinStep = typeof CHECKIN_STEPS[number]["id"];
