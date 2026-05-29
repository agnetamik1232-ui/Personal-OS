import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { JournalStats } from "@/lib/journal/types";

function uid(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("journal_entries").select("date,mood,score_productivity,score_overall,word_count,tags")
      .eq("user_id", uid()).order("date", { ascending: false }).limit(365);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    type Row = { date: string; mood: number | null; score_productivity: number | null; score_overall: number | null; word_count: number; tags: string[] };
    const rows = (data ?? []) as Row[];

    // Streak
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0]!;
      if (rows.find(r => r.date === key)) streak++;
      else if (i > 0) break;
    }

    // Month entries
    const nowY = today.getFullYear(), nowM = today.getMonth() + 1;
    const mm = String(nowM).padStart(2, "0");
    const entriesMonth = rows.filter(r => r.date.startsWith(`${nowY}-${mm}`)).length;

    // Averages
    const withMood = rows.filter(r => r.mood !== null);
    const withProd = rows.filter(r => r.score_productivity !== null);
    const withOver = rows.filter(r => r.score_overall !== null);
    const avg = (arr: Row[], key: keyof Row) =>
      arr.length ? Math.round(arr.reduce((s, r) => s + (r[key] as number), 0) / arr.length * 10) / 10 : null;

    const totalWords = rows.reduce((s, r) => s + (r.word_count ?? 0), 0);

    // Top tags
    const tagCount = new Map<string, number>();
    for (const r of rows) for (const t of (r.tags ?? [])) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    const topTags = [...tagCount.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([tag, count]) => ({ tag, count }));

    const stats: JournalStats = {
      streak, entriesMonth, totalEntries: rows.length,
      avgMood: avg(withMood, "mood"),
      avgProductivity: avg(withProd, "score_productivity"),
      avgOverall: avg(withOver, "score_overall"),
      totalWords,
      topTags,
    };

    return NextResponse.json({ stats });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
