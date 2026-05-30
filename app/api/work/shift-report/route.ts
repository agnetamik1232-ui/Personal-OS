import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export interface ShiftReport {
  id:           string;
  shift_date:   string;
  started_at:   string;
  ended_at:     string | null;
  status:       "active" | "ended";
  summary_lt:   string | null;
  summary_data: Record<string, unknown> | null;
  created_at:   string;
}

function uid() {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

function todayKey() {
  return new Date().toISOString().split("T")[0]!;
}

// GET — today's shift report
export async function GET(): Promise<NextResponse> {
  try {
    const sb = await createAdminClient();
    const { data, error } = await sb
      .from("work_shift_reports")
      .select("*")
      .eq("user_id", uid())
      .eq("shift_date", todayKey())
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ report: data as ShiftReport | null });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

// POST — start shift
export async function POST(): Promise<NextResponse> {
  try {
    const sb = await createAdminClient();
    const { data, error } = await sb
      .from("work_shift_reports")
      .upsert({
        user_id:    uid(),
        shift_date: todayKey(),
        started_at: new Date().toISOString(),
        status:     "active",
        ended_at:   null,
        summary_lt: null,
        summary_data: null,
      } as never, { onConflict: "user_id,shift_date" })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ report: data as ShiftReport }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

// PATCH — end shift or save summary
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const b = await req.json() as Record<string, unknown>;
  try {
    const sb = await createAdminClient();
    const patch: Record<string, unknown> = {};
    if (b["status"]       !== undefined) patch["status"]       = b["status"];
    if (b["ended_at"]     !== undefined) patch["ended_at"]     = b["ended_at"];
    if (b["summary_lt"]   !== undefined) patch["summary_lt"]   = b["summary_lt"];
    if (b["summary_data"] !== undefined) patch["summary_data"] = b["summary_data"];
    const { data, error } = await sb
      .from("work_shift_reports")
      .update(patch as never)
      .eq("user_id", uid())
      .eq("shift_date", todayKey())
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ report: data as ShiftReport });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
