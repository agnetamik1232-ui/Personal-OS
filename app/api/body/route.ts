import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export interface BodyMeasurement {
  id: string; log_date: string; weight_kg: number | null;
  waist_cm: number | null; hips_cm: number | null; chest_cm: number | null;
  arm_cm: number | null; thigh_cm: number | null; notes: string | null; created_at: string;
}

function uid() { const v = process.env["OWNER_USER_ID"]; if (!v) throw new Error("OWNER_USER_ID not set"); return v; }

export async function GET(req: NextRequest): Promise<NextResponse> {
  const days = Math.min(parseInt(req.nextUrl.searchParams.get("days") ?? "90", 10), 365);
  const from = new Date(); from.setDate(from.getDate() - days);
  try {
    const sb = await createAdminClient();
    const { data, error } = await sb.from("body_measurements").select("*").eq("user_id", uid())
      .gte("log_date", from.toISOString().split("T")[0]!).order("log_date", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ measurements: (data ?? []) as BodyMeasurement[] });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const b = await req.json() as Partial<BodyMeasurement>;
  try {
    const sb = await createAdminClient();
    const { data, error } = await sb.from("body_measurements").upsert({
      user_id: uid(), log_date: b.log_date ?? new Date().toISOString().split("T")[0]!,
      weight_kg: b.weight_kg ?? null, waist_cm: b.waist_cm ?? null,
      hips_cm: b.hips_cm ?? null, chest_cm: b.chest_cm ?? null,
      arm_cm: b.arm_cm ?? null, thigh_cm: b.thigh_cm ?? null, notes: b.notes ?? null,
    } as never, { onConflict: "user_id,log_date" }).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ measurement: data as BodyMeasurement }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
