/**
 * GET    /api/finance/savings-goals
 * POST   /api/finance/savings-goals
 * PATCH  /api/finance/savings-goals?id=...
 * DELETE /api/finance/savings-goals?id=...
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient }              from "@/lib/supabase/server";

function uid(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

import type { SavingsGoal } from "@/lib/finance/types";

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("fin_savings_goals")
      .select("*")
      .eq("user_id", uid())
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ goals: data ?? [] });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as Partial<SavingsGoal>;
    if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
    if (!body.target_amount || body.target_amount <= 0) return NextResponse.json({ error: "target_amount required" }, { status: 400 });

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("fin_savings_goals")
      .insert({
        user_id:        uid(),
        name:           body.name.trim(),
        target_amount:  body.target_amount,
        current_amount: body.current_amount ?? 0,
        currency:       body.currency ?? "EUR",
        color:          body.color ?? "#2E6B45",
        emoji:          body.emoji ?? "🐷",
        sort_order:     body.sort_order ?? 0,
      } as never)
      .select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ goal: data }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const body = await req.json() as Partial<SavingsGoal>;
    const supabase = await createAdminClient();
    const patch: Record<string, unknown> = {};
    if (body.name           !== undefined) patch["name"]           = body.name;
    if (body.target_amount  !== undefined) patch["target_amount"]  = body.target_amount;
    if (body.current_amount !== undefined) patch["current_amount"] = body.current_amount;
    if (body.currency       !== undefined) patch["currency"]       = body.currency;
    if (body.color          !== undefined) patch["color"]          = body.color;
    if (body.emoji          !== undefined) patch["emoji"]          = body.emoji;

    const { data, error } = await supabase
      .from("fin_savings_goals").update(patch as never)
      .eq("id", id).eq("user_id", uid()).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ goal: data });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("fin_savings_goals")
      .delete().eq("id", id).eq("user_id", uid());
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
