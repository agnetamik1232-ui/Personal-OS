/**
 * GET    /api/finance/inventory?status=active|listed|sold
 * POST   /api/finance/inventory
 * PATCH  /api/finance/inventory?id=...
 * DELETE /api/finance/inventory?id=...
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient }              from "@/lib/supabase/server";

function uid(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

import type { InventoryItem } from "@/lib/finance/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const supabase = await createAdminClient();
    let q = supabase.from("fin_inventory").select("*").eq("user_id", uid())
      .order("created_at", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const items: InventoryItem[] = (data ?? []).map((row: Record<string, unknown>) => {
      const r = row as unknown as InventoryItem;
      return {
        ...r,
        potential_profit: r.expected_sale_price - r.purchase_price,
        realized_profit:  r.actual_sale_price != null
          ? r.actual_sale_price - r.purchase_price
          : undefined,
      };
    });

    return NextResponse.json({ items });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as Partial<InventoryItem>;
    if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("fin_inventory")
      .insert({
        user_id:             uid(),
        name:                body.name.trim(),
        purchase_price:      body.purchase_price ?? 0,
        expected_sale_price: body.expected_sale_price ?? 0,
        actual_sale_price:   body.actual_sale_price ?? null,
        status:              body.status ?? "active",
        purchased_at:        body.purchased_at ?? new Date().toISOString().split("T")[0],
        sold_at:             body.sold_at ?? null,
        note:                body.note ?? null,
      } as never)
      .select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const body = await req.json() as Partial<InventoryItem>;
    const supabase = await createAdminClient();
    const patch: Record<string, unknown> = {};
    if (body.name                !== undefined) patch["name"]                = body.name;
    if (body.purchase_price      !== undefined) patch["purchase_price"]      = body.purchase_price;
    if (body.expected_sale_price !== undefined) patch["expected_sale_price"] = body.expected_sale_price;
    if (body.actual_sale_price   !== undefined) patch["actual_sale_price"]   = body.actual_sale_price;
    if (body.status              !== undefined) patch["status"]              = body.status;
    if (body.purchased_at        !== undefined) patch["purchased_at"]        = body.purchased_at;
    if (body.sold_at             !== undefined) patch["sold_at"]             = body.sold_at;
    if (body.note                !== undefined) patch["note"]                = body.note;

    const { data, error } = await supabase
      .from("fin_inventory").update(patch as never)
      .eq("id", id).eq("user_id", uid()).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("fin_inventory")
      .delete().eq("id", id).eq("user_id", uid());
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
