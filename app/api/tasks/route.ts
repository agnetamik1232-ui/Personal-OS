import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient }             from "@/lib/supabase/server";

export interface TaskRow {
  id:                string;
  title:             string;
  description:       string | null;
  notes:             string | null;
  urgency:           string | null;
  category:          string | null;
  kanban_status:     string;
  key:               boolean;
  priority_score:    number | null;
  time_estimate_min: number | null;
  tags:              string[];
  due_date:          string | null;
  entity_id:         string | null;
  entity_name:       string | null;
  owner:             string | null;
  completed_at:      string | null;
  created_at:        string;
  updated_at:        string;
}

const SELECT_COLS =
  "id, title, description, notes, urgency, category, kanban_status, key, priority_score, " +
  "time_estimate_min, tags, due_date, entity_id, owner, completed_at, created_at, updated_at, " +
  "entities(name)";

function ownerUserId(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

type RawTask = Record<string, unknown> & { entities?: { name: string } | null };

function flatten(raw: RawTask): TaskRow {
  const { entities, ...rest } = raw;
  return {
    ...(rest as Omit<TaskRow, "entity_name">),
    entity_name: (entities as { name?: string } | null)?.name ?? null,
  };
}

// ── GET /api/tasks ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const status   = searchParams.get("status")   ?? "open";
  const urgency  = searchParams.get("urgency")  ?? null;
  const category = searchParams.get("category") ?? null;
  const kanban   = searchParams.get("kanban")   ?? null;
  const keyOnly  = searchParams.get("key")      === "true";
  const limit    = Math.min(parseInt(searchParams.get("limit") ?? "200", 10), 500);

  try {
    const supabase = await createAdminClient();
    const userId   = ownerUserId();

    let query = supabase
      .from("tasks")
      .select(SELECT_COLS)
      .eq("user_id", userId)
      .order("priority_score", { ascending: false, nullsFirst: false })
      .order("due_date",       { ascending: true,  nullsFirst: false })
      .order("created_at",     { ascending: false })
      .limit(limit);

    if (status === "open")  query = query.is("completed_at", null);
    else if (status === "done") query = query.not("completed_at", "is", null);

    if (urgency)  query = query.eq("urgency",  urgency);
    if (category) query = query.eq("category", category);
    if (kanban)   query = query.eq("kanban_status", kanban);
    if (keyOnly)  query = query.eq("key", true);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const tasks = (data ?? []).map((r) => flatten(r as RawTask));
    return NextResponse.json({ tasks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── POST /api/tasks ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const title = String(b["title"] ?? "").trim();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  try {
    const supabase = await createAdminClient();
    const userId   = ownerUserId();

    const insert = {
      user_id:           userId,
      title,
      description:       b["description"]      != null ? String(b["description"])      : null,
      notes:             b["notes"]            != null ? String(b["notes"])            : null,
      urgency:           b["urgency"]          != null ? String(b["urgency"])          : null,
      category:          b["category"]         != null ? String(b["category"])         : null,
      kanban_status:     b["kanban_status"]    != null ? String(b["kanban_status"])    : "inbox",
      key:               Boolean(b["key"]),
      priority_score:    b["priority_score"]   != null ? Number(b["priority_score"])   : null,
      time_estimate_min: b["time_estimate_min"] != null ? Number(b["time_estimate_min"]): null,
      tags:              Array.isArray(b["tags"]) ? b["tags"] as string[] : [],
      due_date:          b["due_date"]         != null ? String(b["due_date"])         : null,
      entity_id:         b["entity_id"]        != null ? String(b["entity_id"])        : null,
      owner:             b["owner"]            != null ? String(b["owner"])            : null,
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert(insert as never)
      .select(SELECT_COLS)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ task: flatten(data as RawTask) }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
