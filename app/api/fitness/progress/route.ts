/**
 * GET /api/fitness/progress
 * Returns per-exercise stats: PR, history, volume, last session
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { FitnessLog } from "@/app/api/fitness/logs/route";

export interface ExerciseSession {
  date:       string;
  maxWeight:  number | null;
  totalReps:  number;
  sets:       number;
  volume:     number; // weight × reps summed
}

export interface ExerciseProgress {
  name:        string;
  pr:          number | null;   // personal record (max weight)
  prDate:      string | null;
  lastWeight:  number | null;
  lastDate:    string | null;
  sessions:    ExerciseSession[];
  totalSets:   number;
  totalReps:   number;
}

function uid() {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

export async function GET(): Promise<NextResponse> {
  try {
    const sb = await createAdminClient();
    const from = new Date(); from.setDate(from.getDate() - 365);
    const { data, error } = await sb
      .from("fitness_logs")
      .select("*")
      .eq("user_id", uid())
      .gte("log_date", from.toISOString().split("T")[0]!)
      .order("log_date", { ascending: true })
      .order("set_number", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const logs = (data ?? []) as FitnessLog[];

    // Group by exercise
    const byExercise: Record<string, FitnessLog[]> = {};
    for (const log of logs) {
      (byExercise[log.exercise_name] ??= []).push(log);
    }

    const progress: ExerciseProgress[] = [];

    for (const [name, exLogs] of Object.entries(byExercise)) {
      // Group into sessions by date
      const byDate: Record<string, FitnessLog[]> = {};
      for (const log of exLogs) {
        (byDate[log.log_date] ??= []).push(log);
      }

      const sessions: ExerciseSession[] = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, sets]) => {
          const weights = sets.map(s => s.weight_kg).filter((w): w is number => w !== null);
          const maxWeight = weights.length > 0 ? Math.max(...weights) : null;
          const totalReps = sets.reduce((s, l) => s + l.reps_completed, 0);
          const volume    = sets.reduce((s, l) => s + (l.weight_kg ?? 0) * l.reps_completed, 0);
          return { date, maxWeight, totalReps, sets: sets.length, volume: Math.round(volume) };
        });

      // PR
      const allWeights = exLogs.map(l => l.weight_kg).filter((w): w is number => w !== null);
      const pr = allWeights.length > 0 ? Math.max(...allWeights) : null;
      const prLog = pr !== null ? exLogs.find(l => l.weight_kg === pr) : null;

      // Last session
      const lastSession = sessions[sessions.length - 1];

      progress.push({
        name,
        pr,
        prDate:     prLog?.log_date ?? null,
        lastWeight: lastSession?.maxWeight ?? null,
        lastDate:   lastSession?.date ?? null,
        sessions,
        totalSets:  exLogs.length,
        totalReps:  exLogs.reduce((s, l) => s + l.reps_completed, 0),
      });
    }

    // Sort by most recently logged
    progress.sort((a, b) => (b.lastDate ?? "").localeCompare(a.lastDate ?? ""));

    return NextResponse.json({ progress });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
