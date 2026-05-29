/**
 * GET    /api/finance/accounts        → list all accounts
 * POST   /api/finance/accounts        → create account
 * PATCH  /api/finance/accounts?id=... → update account
 * DELETE /api/finance/accounts?id=... → delete account
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient }              from "@/lib/supabase/server";

function uid(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

import type { FinAccount } from "@/lib/finance/types";

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("fin_accounts")
      .select("*")
      .eq("user_id", uid())
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ accounts: data ?? [] });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as Partial<FinAccount>;
    if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("fin_accounts")
      .insert({
        user_id:         uid(),
        name:            body.name.trim(),
        type:            body.type ?? "bank",
        currency:        body.currency ?? "EUR",
        initial_balance: body.initial_balance ?? 0,
        color:           body.color ?? null,
        is_liability:    body.is_liability ?? false,
        sort_order:      body.sort_order ?? 0,
      } as never)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ account: data }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const body = await req.json() as Partial<FinAccount>;
    const supabase = await createAdminClient();
    const patch: Record<string, unknown> = {};
    if (body.name            !== undefined) patch["name"]            = body.name;
    if (body.type            !== undefined) patch["type"]            = body.type;
    if (body.currency        !== undefined) patch["currency"]        = body.currency;
    if (body.initial_balance !== undefined) patch["initial_balance"] = body.initial_balance;
    if (body.color           !== undefined) patch["color"]           = body.color;
    if (body.is_liability    !== undefined) patch["is_liability"]    = body.is_liability;
    if (body.sort_order      !== undefined) patch["sort_order"]      = body.sort_order;

    const { data, error } = await supabase
      .from("fin_accounts").update(patch as never)
      .eq("id", id).eq("user_id", uid()).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ account: data });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("fin_accounts")
      .delete().eq("id", id).eq("user_id", uid());
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
