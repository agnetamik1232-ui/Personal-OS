import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

function uid() {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const b = await req.json() as Record<string, unknown>;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const str = (k: string) => { if (k in b) patch[k] = b[k] != null ? String(b[k]) : null; };
  str("title"); str("description"); str("priority"); str("status"); str("owner"); str("workstation"); str("due_date"); str("resolved_at");
  try {
    const sb = await createAdminClient();
    const { data, error } = await sb.from("work_issues").update(patch as never).eq("id", id).eq("user_id", uid()).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ issue: data });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  try {
    const sb = await createAdminClient();
    await sb.from("work_issues").delete().eq("id", id).eq("user_id", uid());
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
