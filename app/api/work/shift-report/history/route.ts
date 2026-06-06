import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

function uid() {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

export async function GET(): Promise<NextResponse> {
  try {
    const sb = await createAdminClient();
    const from = new Date(); from.setDate(from.getDate() - 90);
    const { data, error } = await sb
      .from("work_shift_reports")
      .select("id,shift_date,started_at,ended_at,status,summary_lt,summary_data")
      .eq("user_id", uid())
      .gte("shift_date", from.toISOString().split("T")[0]!)
      .order("shift_date", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ reports: data ?? [] });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
