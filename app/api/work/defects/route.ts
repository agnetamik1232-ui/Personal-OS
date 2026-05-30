import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export interface WorkDefect {
  id:                string;
  defect_type:       string;
  quantity:          number;
  workstation:       string | null;
  operator:          string | null;
  root_cause:        string | null;
  corrective_action: string | null;
  status:            "open" | "resolved";
  shift_date:        string;
  created_at:        string;
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
  const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10), 365);
  const from = new Date(); from.setDate(from.getDate() - days);
  try {
    const sb = await createAdminClient();
    const { data, error } = await sb.from("work_defects").select("*").eq("user_id", uid())
      .gte("shift_date", from.toISOString().split("T")[0]!).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ defects: (data ?? []) as WorkDefect[] });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const b = await req.json() as Partial<WorkDefect>;
  if (!b.defect_type?.trim()) return NextResponse.json({ error: "defect_type required" }, { status: 400 });
  try {
    const sb = await createAdminClient();
    const { data, error } = await sb.from("work_defects").insert({
      user_id:           uid(),
      defect_type:       b.defect_type.trim(),
      quantity:          b.quantity          ?? 1,
      workstation:       b.workstation       ?? null,
      operator:          b.operator          ?? null,
      root_cause:        b.root_cause        ?? null,
      corrective_action: b.corrective_action ?? null,
      status:            b.status            ?? "open",
      shift_date:        b.shift_date        ?? todayKey(),
    } as never).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ defect: data as WorkDefect }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const b = await req.json() as { id: string } & Partial<WorkDefect>;
  if (!b.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const sb = await createAdminClient();
    const patch: Record<string, unknown> = {};
    if (b["status"]            !== undefined) patch["status"]            = b["status"];
    if (b["root_cause"]        !== undefined) patch["root_cause"]        = b["root_cause"];
    if (b["corrective_action"] !== undefined) patch["corrective_action"] = b["corrective_action"];
    const { data, error } = await sb.from("work_defects").update(patch as never).eq("id", b.id).eq("user_id", uid()).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ defect: data as WorkDefect });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
