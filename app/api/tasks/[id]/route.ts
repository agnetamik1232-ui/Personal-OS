import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient }              from "@/lib/supabase/server";

const SELECT_COLS =
  "id, title, description, notes, urgency, category, kanban_status, key, priority_score, " +
  "time_estimate_min, tags, due_date, entity_id, owner, completed_at, created_at, updated_at, " +
  "entities(name)";

type RawTask = Record<string, unknown> & { entities?: { name: string } | null };

function flatten(raw: RawTask) {
  const { entities, ...rest } = raw;
  return { ...rest, entity_name: (entities as { name?: string } | null)?.name ?? null };
}

function ownerUserId(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

// ── PATCH /api/tasks/[id] ────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  // Build only the fields that were sent
  const patch: Record<string, unknown> = {};
  const str  = (k: string) => { if (k in b) patch[k] = b[k] != null ? String(b[k])   : null; };
  const num  = (k: string) => { if (k in b) patch[k] = b[k] != null ? Number(b[k])   : null; };
  const bool = (k: string) => { if (k in b) patch[k] = Boolean(b[k]); };
  const arr  = (k: string) => { if (k in b) patch[k] = Array.isArray(b[k]) ? b[k] : []; };

  str("title"); str("description"); str("notes"); str("urgency");
  str("category"); str("kanban_status"); str("due_date");
  str("entity_id"); str("owner"); str("completed_at");
  num("priority_score"); num("time_estimate_min");
  bool("key");
  arr("tags");

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("tasks")
      .update(patch as never)
      .eq("id", id)
      .eq("user_id", ownerUserId())
      .select(SELECT_COLS)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data)  return NextResponse.json({ error: "Not found" },    { status: 404 });
    return NextResponse.json({ task: flatten(data as RawTask) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── DELETE /api/tasks/[id] ───────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("user_id", ownerUserId());

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
