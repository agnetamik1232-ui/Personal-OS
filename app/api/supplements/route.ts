import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export interface Supplement {
  id: string; name: string; dose: string | null; timing: string; active: boolean; sort_order: number; created_at: string;
  taken: boolean; // computed for today
}

function uid() { const v = process.env["OWNER_USER_ID"]; if (!v) throw new Error("OWNER_USER_ID not set"); return v; }
function todayKey() { return new Date().toISOString().split("T")[0]!; }

export async function GET(): Promise<NextResponse> {
  try {
    const sb = await createAdminClient();
    const today = todayKey();
    const [suppRes, logRes] = await Promise.all([
      sb.from("supplements").select("*").eq("user_id", uid()).eq("active", true).order("sort_order"),
      sb.from("supplement_logs").select("supplement_id").eq("user_id", uid()).eq("log_date", today).eq("taken", true),
    ]);
    if (suppRes.error) return NextResponse.json({ error: suppRes.error.message }, { status: 500 });
    const takenIds = new Set((logRes.data ?? []).map((r: { supplement_id: string }) => r.supplement_id));
    const supplements = (suppRes.data ?? []).map((s: Omit<Supplement, "taken">) => ({ ...s, taken: takenIds.has(s.id) }));
    return NextResponse.json({ supplements });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const b = await req.json() as Record<string, unknown>;
  const action = String(b["action"] ?? "add");
  try {
    const sb = await createAdminClient();
    if (action === "take") {
      const id = String(b["id"]);
      await sb.from("supplement_logs").upsert({ user_id: uid(), supplement_id: id, log_date: todayKey(), taken: true } as never, { onConflict: "user_id,supplement_id,log_date" });
      return NextResponse.json({ ok: true });
    }
    if (action === "untake") {
      const id = String(b["id"]);
      await sb.from("supplement_logs").delete().eq("user_id", uid()).eq("supplement_id", id).eq("log_date", todayKey());
      return NextResponse.json({ ok: true });
    }
    // add new supplement
    const { data, error } = await sb.from("supplements").insert({
      user_id: uid(), name: String(b["name"] ?? ""), dose: b["dose"] ? String(b["dose"]) : null,
      timing: String(b["timing"] ?? "morning"), sort_order: Number(b["sort_order"] ?? 0),
    } as never).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ supplement: { ...(data as object), taken: false } }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const sb = await createAdminClient();
    await sb.from("supplements").update({ active: false } as never).eq("id", id).eq("user_id", uid());
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
