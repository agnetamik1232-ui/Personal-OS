import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export interface Book {
  id:           string;
  title:        string;
  author:       string | null;
  genre:        string | null;
  cover_color:  string;
  total_pages:  number | null;
  current_page: number;
  status:       "want" | "reading" | "finished" | "dnf";
  rating:       number | null;
  started_at:   string | null;
  finished_at:  string | null;
  notes:        string | null;
  created_at:   string;
  updated_at:   string;
}

function uid() {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const status = req.nextUrl.searchParams.get("status");
  try {
    const sb = await createAdminClient();
    let q = sb.from("books").select("*").eq("user_id", uid()).order("updated_at", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ books: (data ?? []) as Book[] });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const b = await req.json() as Partial<Book>;
  if (!b.title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  try {
    const sb = await createAdminClient();
    const { data, error } = await sb.from("books").insert({
      user_id:      uid(),
      title:        b.title.trim(),
      author:       b.author       ?? null,
      genre:        b.genre        ?? null,
      cover_color:  b.cover_color  ?? "#3D52D5",
      total_pages:  b.total_pages  ?? null,
      current_page: b.current_page ?? 0,
      status:       b.status       ?? "want",
      rating:       b.rating       ?? null,
      started_at:   b.started_at   ?? null,
      finished_at:  b.finished_at  ?? null,
      notes:        b.notes        ?? null,
    } as never).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ book: data as Book }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const b = await req.json() as Partial<Book>;
  try {
    const sb = await createAdminClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const fields: (keyof Book)[] = ["title","author","genre","cover_color","total_pages","current_page","status","rating","started_at","finished_at","notes"];
    for (const f of fields) if (b[f] !== undefined) patch[f] = b[f];
    const { data, error } = await sb.from("books").update(patch as never).eq("id", id).eq("user_id", uid()).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ book: data as Book });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const sb = await createAdminClient();
    await sb.from("books").delete().eq("id", id).eq("user_id", uid());
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
