import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export interface WorkNote {
  id:         string;
  content:    string;
  category:   string;
  tags:       string[];
  pinned:     boolean;
  shift_date: string;
  created_at: string;
}

function uid() {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

function todayKey() {
  return new Date().toISOString().split("T")[0]!;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const days  = Math.min(parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10), 365);
  const search = req.nextUrl.searchParams.get("q") ?? "";
  try {
    const sb = await createAdminClient();
    let q = sb.from("work_notes").select("*").eq("user_id", uid())
      .order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(days * 10);
    if (search) q = q.ilike("content", `%${search}%`);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ notes: (data ?? []) as WorkNote[] });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const b = await req.json() as Partial<WorkNote>;
  if (!b.content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 });
  try {
    const sb = await createAdminClient();
    const { data, error } = await sb.from("work_notes").insert({
      user_id:    uid(),
      content:    b.content.trim(),
      category:   b.category   ?? "observation",
      tags:       b.tags       ?? [],
      pinned:     b.pinned     ?? false,
      shift_date: b.shift_date ?? todayKey(),
    } as never).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ note: data as WorkNote }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const b = await req.json() as { id: string } & Partial<WorkNote>;
  if (!b.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const sb = await createAdminClient();
    const { data, error } = await sb.from("work_notes").update({ pinned: b.pinned } as never).eq("id", b.id).eq("user_id", uid()).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ note: data as WorkNote });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
