import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export interface WorkIssue {
  id:          string;
  title:       string;
  description: string | null;
  priority:    "low" | "medium" | "high" | "critical";
  status:      "open" | "in_progress" | "resolved" | "closed";
  owner:       string | null;
  workstation: string | null;
  due_date:    string | null;
  resolved_at: string | null;
  created_at:  string;
  updated_at:  string;
}

function uid() {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const status = req.nextUrl.searchParams.get("status") ?? "open";
  try {
    const sb = await createAdminClient();
    let q = sb.from("work_issues").select("*").eq("user_id", uid())
      .order("priority", { ascending: false }).order("created_at", { ascending: false });
    if (status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ issues: (data ?? []) as WorkIssue[] });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const b = await req.json() as Partial<WorkIssue>;
  if (!b.title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  try {
    const sb = await createAdminClient();
    const { data, error } = await sb.from("work_issues").insert({
      user_id:     uid(),
      title:       b.title.trim(),
      description: b.description ?? null,
      priority:    b.priority    ?? "medium",
      status:      b.status      ?? "open",
      owner:       b.owner       ?? null,
      workstation: b.workstation ?? null,
      due_date:    b.due_date    ?? null,
    } as never).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ issue: data as WorkIssue }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
