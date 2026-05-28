import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient }             from "@/lib/supabase/server";

export interface TaskRow {
  id:                 string;
  title:              string;
  description:        string | null;
  urgency:            string | null;
  key:                boolean;
  priority_score:     number | null;
  time_estimate_min:  number | null;
  tags:               string[];
  due_date:           string | null;
  entity_id:          string | null;
  completed_at:       string | null;
  created_at:         string;
}

function ownerUserId(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

/**
 * GET /api/tasks
 *
 * Query params:
 *   status   "open" (default) | "done" | "all"
 *   urgency  "high" | "medium" | "low" | "urgent"  (optional filter)
 *   key      "true"                                  (optional — only key tasks)
 *   limit    number (default 50)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const status  = searchParams.get("status")  ?? "open";
  const urgency = searchParams.get("urgency") ?? null;
  const keyOnly = searchParams.get("key")     === "true";
  const limit   = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

  try {
    const supabase = await createAdminClient();
    const userId   = ownerUserId();

    let query = supabase
      .from("tasks")
      .select(
        "id, title, description, urgency, key, priority_score, time_estimate_min, tags, due_date, entity_id, completed_at, created_at"
      )
      .eq("user_id", userId)
      .order("priority_score", { ascending: false, nullsFirst: false })
      .order("created_at",     { ascending: false })
      .limit(limit);

    // status filter
    if (status === "open") {
      query = query.is("completed_at", null);
    } else if (status === "done") {
      query = query.not("completed_at", "is", null);
    }
    // "all" → no filter

    if (urgency) {
      query = query.eq("urgency", urgency);
    }

    if (keyOnly) {
      query = query.eq("key", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[api/tasks] query error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tasks: (data ?? []) as TaskRow[] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/tasks] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
