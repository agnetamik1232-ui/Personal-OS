import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { FinRecurring } from "@/lib/finance/types";

function uid(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("fin_recurring")
      .select("*, fin_accounts(name)")
      .eq("user_id", uid())
      .order("next_date", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    type RawRec = Record<string, unknown> & { fin_accounts?: { name: string } | null };
    const recurring: FinRecurring[] = (data ?? []).map((row: RawRec) => {
      const { fin_accounts: acc, ...rest } = row;
      const r = rest as unknown as FinRecurring;
      return {
        ...r,
        account_name: (acc as { name?: string } | null)?.name ?? null,
        days_until: daysUntil(r.next_date),
      };
    });

    return NextResponse.json({ recurring });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as Partial<FinRecurring>;
    if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
    if (!body.amount || body.amount <= 0) return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
    if (!body.next_date) return NextResponse.json({ error: "next_date required" }, { status: 400 });
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("fin_recurring")
      .insert({
        user_id:     uid(),
        name:        body.name.trim(),
        type:        body.type ?? "expense",
        amount:      body.amount,
        category:    body.category ?? "Other",
        account_id:  body.account_id ?? null,
        frequency:   body.frequency ?? "monthly",
        next_date:   body.next_date,
        note:        body.note ?? null,
        auto_create: body.auto_create ?? false,
        is_active:   body.is_active ?? true,
      } as never)
      .select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ recurring: data }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const body = await req.json() as Partial<FinRecurring>;
    const patch: Record<string, unknown> = {};
    if (body.name        !== undefined) patch["name"]        = body.name;
    if (body.type        !== undefined) patch["type"]        = body.type;
    if (body.amount      !== undefined) patch["amount"]      = body.amount;
    if (body.category    !== undefined) patch["category"]    = body.category;
    if (body.account_id  !== undefined) patch["account_id"]  = body.account_id;
    if (body.frequency   !== undefined) patch["frequency"]   = body.frequency;
    if (body.next_date   !== undefined) patch["next_date"]   = body.next_date;
    if (body.note        !== undefined) patch["note"]        = body.note;
    if (body.auto_create !== undefined) patch["auto_create"] = body.auto_create;
    if (body.is_active   !== undefined) patch["is_active"]   = body.is_active;
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("fin_recurring").update(patch as never)
      .eq("id", id).eq("user_id", uid()).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ recurring: data });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("fin_recurring").delete().eq("id", id).eq("user_id", uid());
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
