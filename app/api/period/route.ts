import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export interface PeriodLog {
  id: string; log_date: string; flow: string | null;
  symptoms: string[]; mood: string | null; pain_level: number | null;
  notes: string | null; created_at: string;
}

function uid() { const v = process.env["OWNER_USER_ID"]; if (!v) throw new Error("OWNER_USER_ID not set"); return v; }

export async function GET(req: NextRequest): Promise<NextResponse> {
  const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") ?? "120", 10), 365);
  const from = new Date(); from.setDate(from.getDate() - days);
  try {
    const sb = await createAdminClient();
    const { data, error } = await sb.from("period_logs").select("*").eq("user_id", uid())
      .gte("log_date", from.toISOString().split("T")[0]!).order("log_date", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ logs: (data ?? []) as PeriodLog[] });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const b = await req.json() as Partial<PeriodLog>;
  try {
    const sb = await createAdminClient();
    const { data, error } = await sb.from("period_logs").upsert({
      user_id: uid(), log_date: b.log_date ?? new Date().toISOString().split("T")[0]!,
      flow: b.flow ?? null, symptoms: b.symptoms ?? [], mood: b.mood ?? null,
      pain_level: b.pain_level ?? null, notes: b.notes ?? null,
    } as never, { onConflict: "user_id,log_date" }).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ log: data as PeriodLog }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
