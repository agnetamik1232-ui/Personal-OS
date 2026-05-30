import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export interface WorkIdea {
  id:          string;
  title:       string;
  description: string | null;
  category:    "process" | "quality" | "cost" | "automation" | "safety";
  status:      "pending" | "approved" | "in_progress" | "implemented" | "rejected";
  impact:      "low" | "medium" | "high";
  owner:       string | null;
  created_at:  string;
  updated_at:  string;
}

function uid() {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

export async function GET(): Promise<NextResponse> {
  try {
    const sb = await createAdminClient();
    const { data, error } = await sb.from("work_ideas").select("*").eq("user_id", uid()).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ideas: (data ?? []) as WorkIdea[] });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const b = await req.json() as Partial<WorkIdea>;
  if (!b.title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  try {
    const sb = await createAdminClient();
    const { data, error } = await sb.from("work_ideas").insert({
      user_id:     uid(),
      title:       b.title.trim(),
      description: b.description ?? null,
      category:    b.category    ?? "process",
      status:      b.status      ?? "pending",
      impact:      b.impact      ?? "medium",
      owner:       b.owner       ?? null,
    } as never).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ idea: data as WorkIdea }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const b = await req.json() as { id: string } & Partial<WorkIdea>;
  if (!b.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const sb = await createAdminClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (b["status"]      !== undefined) patch["status"]      = b["status"];
    if (b["impact"]      !== undefined) patch["impact"]      = b["impact"];
    if (b["title"]       !== undefined) patch["title"]       = b["title"];
    if (b["description"] !== undefined) patch["description"] = b["description"];
    const { data, error } = await sb.from("work_ideas").update(patch as never).eq("id", b.id).eq("user_id", uid()).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ idea: data as WorkIdea });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
