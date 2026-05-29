import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { JournalLesson } from "@/lib/journal/types";

function uid(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("journal_lessons").select("*").eq("user_id", uid())
      .order("date", { ascending: false }).limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ lessons: (data ?? []) as JournalLesson[] });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as { title: string; description?: string; category?: string; date?: string };
    if (!body.title) return NextResponse.json({ error: "title required" }, { status: 400 });
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("journal_lessons")
      .insert({
        user_id:     uid(),
        date:        body.date ?? new Date().toISOString().split("T")[0],
        title:       body.title,
        description: body.description ?? null,
        category:    body.category    ?? null,
      } as never)
      .select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ lesson: data as JournalLesson });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("journal_lessons").delete().eq("id", id).eq("user_id", uid());
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
