export type MoodLevel   = 1 | 2 | 3 | 4 | 5;
export type ScoreLevel  = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type LifeArea = "work" | "finance" | "health" | "relationships" | "learning" | "personal";

export const LIFE_AREA_LABELS: Record<LifeArea, string> = {
  work: "Work", finance: "Finance", health: "Health",
  relationships: "Relationships", learning: "Learning", personal: "Personal Growth",
};

export const MOOD_EMOJI: Record<MoodLevel, string>  = { 1: "😔", 2: "😕", 3: "😐", 4: "🙂", 5: "😊" };
export const MOOD_LABEL: Record<MoodLevel, string>  = { 1: "Rough", 2: "Low", 3: "Okay", 4: "Good", 5: "Great" };

export const QUICK_TAGS = [
  { label: "Great Day",   emoji: "😊" },
  { label: "Normal Day",  emoji: "😐" },
  { label: "Difficult",   emoji: "😔" },
  { label: "Productive",  emoji: "🔥" },
  { label: "Workout",     emoji: "💪" },
  { label: "Finance",     emoji: "💰" },
  { label: "Goals",       emoji: "🎯" },
  { label: "Work",        emoji: "🏢" },
  { label: "Creative",    emoji: "🎨" },
  { label: "Social",      emoji: "👥" },
  { label: "Learning",    emoji: "📚" },
  { label: "Rest Day",    emoji: "😴" },
] as const;

export const GUIDED_PROMPTS = [
  { key: "went_well",   label: "What went well today?" },
  { key: "not_well",    label: "What didn't go well?" },
  { key: "learned",     label: "What did I learn?" },
  { key: "grateful_p",  label: "What am I grateful for?" },
  { key: "improve",     label: "What should I improve tomorrow?" },
  { key: "biggest_win", label: "Biggest win today?" },
  { key: "challenge",   label: "Biggest challenge today?" },
  { key: "feeling",     label: "How do I feel right now?" },
] as const;

export type PromptKey = typeof GUIDED_PROMPTS[number]["key"];

export interface JournalEntry {
  id:                 string;
  date:               string;       // YYYY-MM-DD
  title:              string | null;
  content:            string;
  prompts:            Partial<Record<PromptKey, string>>;
  mood:               MoodLevel | null;
  energy:             MoodLevel | null;
  stress:             MoodLevel | null;
  focus:              MoodLevel | null;
  score_productivity: ScoreLevel | null;
  score_mood:         ScoreLevel | null;
  score_energy:       ScoreLevel | null;
  score_focus:        ScoreLevel | null;
  score_overall:      ScoreLevel | null;
  tags:               string[];
  life_area:          LifeArea | null;
  word_count:         number;
  gratitude:          string[];
  created_at:         string;
  updated_at:         string;
}

export interface JournalWin {
  id:          string;
  date:        string;
  title:       string;
  description: string | null;
  category:    string | null;
  created_at:  string;
}

export interface JournalLesson {
  id:          string;
  date:        string;
  title:       string;
  description: string | null;
  category:    string | null;
  created_at:  string;
}

export interface JournalStats {
  streak:         number;
  entriesMonth:   number;
  totalEntries:   number;
  avgMood:        number | null;
  avgProductivity:number | null;
  avgOverall:     number | null;
  totalWords:     number;
  topTags:        { tag: string; count: number }[];
}
