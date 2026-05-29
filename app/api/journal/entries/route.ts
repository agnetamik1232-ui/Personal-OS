import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { JournalEntry } from "@/lib/journal/types";

function uid(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createAdminClient();
    const date  = req.nextUrl.searchParams.get("date");
    const days  = req.nextUrl.searchParams.get("days");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "60", 10);

    if (date) {
      const { data, error } = await supabase
        .from("journal_entries").select("*").eq("user_id", uid()).eq("date", date).maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ entry: data as JournalEntry | null });
    }

    let query = supabase
      .from("journal_entries").select("*").eq("user_id", uid())
      .order("date", { ascending: false }).limit(limit);

    if (days) {
      const since = new Date();
      since.setDate(since.getDate() - parseInt(days, 10));
      query = query.gte("date", since.toISOString().split("T")[0]!);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entries: (data ?? []) as JournalEntry[] });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as Partial<JournalEntry> & { date: string };
    if (!body.date) return NextResponse.json({ error: "date required" }, { status: 400 });

    const supabase = await createAdminClient();
    const wordCount = (body.content ?? "").trim()
      ? (body.content ?? "").trim().split(/\s+/).length : 0;

    const row = {
      user_id:            uid(),
      date:               body.date,
      title:              body.title   ?? null,
      content:            body.content ?? "",
      prompts:            body.prompts ?? {},
      mood:               body.mood    ?? null,
      energy:             body.energy  ?? null,
      stress:             body.stress  ?? null,
      focus:              body.focus   ?? null,
      score_productivity: body.score_productivity ?? null,
      score_mood:         body.score_mood         ?? null,
      score_energy:       body.score_energy       ?? null,
      score_focus:        body.score_focus        ?? null,
      score_overall:      body.score_overall      ?? null,
      tags:               body.tags      ?? [],
      life_area:          body.life_area ?? null,
      gratitude:          body.gratitude ?? [],
      word_count:         wordCount,
      updated_at:         new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("journal_entries")
      .upsert(row as never, { onConflict: "user_id,date" })
      .select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entry: data as JournalEntry });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("journal_entries").delete().eq("id", id).eq("user_id", uid());
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
