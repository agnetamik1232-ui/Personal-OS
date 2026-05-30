import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export interface ChecklistItem {
  id:         string;
  title:      string;
  period:     string;
  shift_type: string;
  sort_order: number;
  active:     boolean;
  done:       boolean; // computed: has completion for today
}

function uid() {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

function todayKey() {
  return new Date().toISOString().split("T")[0]!;
}

// GET /api/work/checklist — returns items with done flag for today
export async function GET(): Promise<NextResponse> {
  try {
    const sb   = await createAdminClient();
    const today = todayKey();
    const [itemsRes, doneRes] = await Promise.all([
      sb.from("work_checklist").select("*").eq("user_id", uid()).eq("active", true).order("sort_order"),
      sb.from("work_checklist_done").select("item_id").eq("user_id", uid()).eq("done_date", today),
    ]);
    if (itemsRes.error) return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });
    if (doneRes.error)  return NextResponse.json({ error: doneRes.error.message  }, { status: 500 });
    const doneIds = new Set((doneRes.data ?? []).map((r: { item_id: string }) => r.item_id));
    const items: ChecklistItem[] = (itemsRes.data ?? []).map((r: Omit<ChecklistItem, "done">) => ({
      ...r,
      done: doneIds.has(r.id),
    }));
    return NextResponse.json({ items });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

// POST /api/work/checklist — create a new checklist item OR mark an item done
// Body: { action: "add", title, period, shift_type?, sort_order? }
// Body: { action: "complete", item_id }
// Body: { action: "uncomplete", item_id }
export async function POST(req: NextRequest): Promise<NextResponse> {
  const b = await req.json() as Record<string, unknown>;
  const action = String(b["action"] ?? "add");
  try {
    const sb = await createAdminClient();
    if (action === "complete") {
      const item_id = String(b["item_id"] ?? "");
      if (!item_id) return NextResponse.json({ error: "item_id required" }, { status: 400 });
      await sb.from("work_checklist_done").upsert({ user_id: uid(), item_id, done_date: todayKey() } as never);
      return NextResponse.json({ ok: true });
    }
    if (action === "uncomplete") {
      const item_id = String(b["item_id"] ?? "");
      if (!item_id) return NextResponse.json({ error: "item_id required" }, { status: 400 });
      await sb.from("work_checklist_done").delete().eq("user_id", uid()).eq("item_id", item_id).eq("done_date", todayKey());
      return NextResponse.json({ ok: true });
    }
    // default: add new item
    const title = String(b["title"] ?? "").trim();
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
    const { data, error } = await sb.from("work_checklist").insert({
      user_id:    uid(),
      title,
      period:     String(b["period"]     ?? "daily"),
      shift_type: String(b["shift_type"] ?? "both"),
      sort_order: Number(b["sort_order"] ?? 0),
      active:     true,
    } as never).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: { ...(data as object), done: false } }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

// DELETE /api/work/checklist?id=xxx — deactivate (soft-delete) a checklist item
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const sb = await createAdminClient();
    await sb.from("work_checklist").update({ active: false } as never).eq("id", id).eq("user_id", uid());
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
