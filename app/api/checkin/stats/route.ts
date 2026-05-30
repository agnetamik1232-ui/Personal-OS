import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { CheckinStats } from "@/lib/checkin/types";

function uid(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

type Row = {
  date: string; mood: number | null; energy: number | null;
  sleep_hours: number | null; sleep_quality: number | null;
  weight_kg: number | null; workout_done: boolean | null;
  digestion: number | null; biggest_win: string | null;
  biggest_challenge: string | null; completed: boolean;
};

function avg(rows: Row[], key: keyof Row): number | null {
  const vals = rows.map(r => r[key]).filter((v): v is number => typeof v === "number");
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null;
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("daily_checkins").select("*").eq("user_id", uid())
      .order("date", { ascending: false }).limit(90);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []) as Row[];

    // Streak
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0]!;
      if (rows.find(r => r.date === key && r.completed)) streak++;
      else if (i > 0) break;
    }

    // Workout %
    const withWorkout = rows.filter(r => r.workout_done !== null);
    const workoutPct = withWorkout.length > 0
      ? Math.round(withWorkout.filter(r => r.workout_done).length / withWorkout.length * 100) : null;

    // Latest weight
    const latestWeight = rows.find(r => r.weight_kg !== null)?.weight_kg ?? null;

    // Top challenges & wins (word-level frequency)
    const countPhrases = (arr: (string | null)[]): { text: string; count: number }[] => {
      const map = new Map<string, number>();
      for (const s of arr) {
        if (!s) continue;
        const key = s.trim().slice(0, 60);
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([text, count]) => ({ text, count }));
    };

    const stats: CheckinStats = {
      avgMood:       avg(rows, "mood"),
      avgEnergy:     avg(rows, "energy"),
      avgSleep:      avg(rows, "sleep_hours"),
      avgSleepQual:  avg(rows, "sleep_quality"),
      avgDigestion:  avg(rows, "digestion"),
      workoutPct,
      totalCheckins: rows.filter(r => r.completed).length,
      currentStreak: streak,
      latestWeight:  typeof latestWeight === "number" ? latestWeight : null,
      topChallenges: countPhrases(rows.map(r => r.biggest_challenge)),
      topWins:       countPhrases(rows.map(r => r.biggest_win)),
      moodTrend:     rows.filter(r => r.mood !== null).slice(0, 30).reverse()
        .map(r => ({ date: r.date, mood: r.mood! })),
      sleepTrend:    rows.filter(r => r.sleep_hours !== null).slice(0, 30).reverse()
        .map(r => ({ date: r.date, hours: r.sleep_hours!, quality: r.sleep_quality ?? null })),
      energyTrend:   rows.filter(r => r.energy !== null).slice(0, 30).reverse()
        .map(r => ({ date: r.date, energy: r.energy! })),
      weightTrend:   rows.filter(r => r.weight_kg !== null).slice(0, 30).reverse()
        .map(r => ({ date: r.date, weight: r.weight_kg! })),
    };

    return NextResponse.json({ stats });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
