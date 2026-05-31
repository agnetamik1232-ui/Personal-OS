import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export interface FitnessLog {
  id:             string;
  log_date:       string;
  workout_day:    string;
  exercise_name:  string;
  set_number:     number;
  weight_kg:      number | null;
  reps_completed: number;
  reps_target:    number | null;
  notes:          string | null;
  created_at:     string;
}

export interface ProgressionSuggestion {
  exercise_name: string;
  current_weight: number | null;
  suggested_weight: number | null;
  reason: string;
}

function uid() {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

// GET /api/fitness/logs?days=90&exercise=name
// Returns logs + progression suggestions
export async function GET(req: NextRequest): Promise<NextResponse> {
  const days     = Math.min(parseInt(req.nextUrl.searchParams.get("days") ?? "90", 10), 365);
  const exercise = req.nextUrl.searchParams.get("exercise");
  const from     = new Date(); from.setDate(from.getDate() - days);

  try {
    const sb = await createAdminClient();
    let q = sb.from("fitness_logs").select("*").eq("user_id", uid())
      .gte("log_date", from.toISOString().split("T")[0]!)
      .order("log_date", { ascending: false })
      .order("set_number", { ascending: true });
    if (exercise) q = q.eq("exercise_name", exercise);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const logs = (data ?? []) as FitnessLog[];

    // ── Compute progression suggestions ──────────────────────────────────────
    // Group by exercise_name, find last 2 distinct session dates
    // If both sessions: avg reps_completed >= reps_target + 2 → suggest +2.5kg
    const byExercise: Record<string, FitnessLog[]> = {};
    for (const log of logs) {
      (byExercise[log.exercise_name] ??= []).push(log);
    }

    const suggestions: ProgressionSuggestion[] = [];
    for (const [name, exLogs] of Object.entries(byExercise)) {
      // Get distinct dates (already sorted desc)
      const dates = [...new Set(exLogs.map(l => l.log_date))].slice(0, 2);
      if (dates.length < 2) continue;

      const session = (date: string) => exLogs.filter(l => l.log_date === date);
      const avgReps = (s: FitnessLog[]) => s.reduce((a, l) => a + l.reps_completed, 0) / (s.length || 1);
      const avgTarget = (s: FitnessLog[]) => {
        const withTarget = s.filter(l => l.reps_target !== null);
        return withTarget.length > 0 ? withTarget.reduce((a, l) => a + (l.reps_target ?? 0), 0) / withTarget.length : null;
      };

      const s0 = session(dates[0]!);
      const s1 = session(dates[1]!);
      const target0 = avgTarget(s0) ?? avgTarget(s1);
      if (!target0) continue;

      const exceeded0 = avgReps(s0) >= target0 + 2;
      const exceeded1 = avgReps(s1) >= target0 + 2;

      if (exceeded0 && exceeded1) {
        const currentWeight = s0.find(l => l.weight_kg !== null)?.weight_kg ?? null;
        const suggestedWeight = currentWeight !== null ? currentWeight + 2.5 : null;
        suggestions.push({
          exercise_name:    name,
          current_weight:   currentWeight,
          suggested_weight: suggestedWeight,
          reason:           `You exceeded the target by 2+ reps in your last 2 sessions. Time to increase weight!`,
        });
      }
    }

    return NextResponse.json({ logs, suggestions });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

// POST /api/fitness/logs — log one or more sets
export async function POST(req: NextRequest): Promise<NextResponse> {
  const b = await req.json() as Partial<FitnessLog> | Partial<FitnessLog>[];
  const entries = Array.isArray(b) ? b : [b];

  try {
    const sb = await createAdminClient();
    const rows = entries.map(e => ({
      user_id:        uid(),
      log_date:       e.log_date       ?? new Date().toISOString().split("T")[0]!,
      workout_day:    e.workout_day    ?? "A",
      exercise_name:  e.exercise_name  ?? "",
      set_number:     e.set_number     ?? 1,
      weight_kg:      e.weight_kg      ?? null,
      reps_completed: e.reps_completed ?? 0,
      reps_target:    e.reps_target    ?? null,
      notes:          e.notes          ?? null,
    }));
    const { data, error } = await sb.from("fitness_logs").insert(rows as never).select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ logs: data as FitnessLog[] }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

// DELETE /api/fitness/logs?id=xxx
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const sb = await createAdminClient();
    await sb.from("fitness_logs").delete().eq("id", id).eq("user_id", uid());
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
