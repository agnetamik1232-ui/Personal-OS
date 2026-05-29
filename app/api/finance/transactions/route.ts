/**
 * GET    /api/finance/transactions?days=60&account=&type=&category=&search=
 * POST   /api/finance/transactions
 * PATCH  /api/finance/transactions?id=...
 * DELETE /api/finance/transactions?id=...
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient }              from "@/lib/supabase/server";

function uid(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

import type { FinTransaction } from "@/lib/finance/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const sp      = req.nextUrl.searchParams;
    const days    = Math.min(parseInt(sp.get("days") ?? "90", 10), 365);
    const account = sp.get("account");
    const type    = sp.get("type");
    const cat     = sp.get("category");
    const merchant = sp.get("merchant");
    const search  = sp.get("search");
    const limit   = Math.min(parseInt(sp.get("limit") ?? "500", 10), 1000);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0]!;

    const supabase = await createAdminClient();
    let q = supabase
      .from("fin_transactions")
      .select("*, fin_accounts!fin_transactions_account_id_fkey(name), to_acc:fin_accounts!fin_transactions_to_account_id_fkey(name)")
      .eq("user_id", uid())
      .gte("date", cutoffStr)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (account) q = q.eq("account_id", account);
    if (type)    q = q.eq("type", type);
    if (cat)      q = q.eq("category", cat);
    if (merchant) q = q.ilike("merchant", `%${merchant}%`);
    if (search)   q = q.ilike("note", `%${search}%`);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    type RawTx = Record<string, unknown> & {
      fin_accounts?: { name: string } | null;
      to_acc?: { name: string } | null;
    };

    const txs: FinTransaction[] = (data ?? []).map((row: RawTx) => {
      const { fin_accounts: acc, to_acc, ...rest } = row;
      return {
        ...(rest as Omit<FinTransaction, "account_name" | "to_account_name">),
        account_name:    (acc as { name?: string } | null)?.name ?? null,
        to_account_name: (to_acc as { name?: string } | null)?.name ?? null,
      } as FinTransaction;
    });

    return NextResponse.json({ transactions: txs });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as Partial<FinTransaction>;
    if (!body.account_id) return NextResponse.json({ error: "account_id required" }, { status: 400 });
    if (!body.amount || body.amount <= 0) return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
    if (!body.type) return NextResponse.json({ error: "type required" }, { status: 400 });

    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("fin_transactions")
      .insert({
        user_id:       uid(),
        date:          body.date ?? new Date().toISOString().split("T")[0],
        type:          body.type,
        category:      body.category ?? "Other",
        subcategory:   body.subcategory ?? null,
        merchant:      body.merchant ?? null,
        tags:          body.tags ?? [],
        account_id:    body.account_id,
        to_account_id: body.to_account_id ?? null,
        amount:        body.amount,
        note:          body.note ?? null,
      } as never)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ transaction: data }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const body = await req.json() as Partial<FinTransaction>;
    const supabase = await createAdminClient();
    const patch: Record<string, unknown> = {};
    if (body.date          !== undefined) patch["date"]          = body.date;
    if (body.type          !== undefined) patch["type"]          = body.type;
    if (body.category      !== undefined) patch["category"]      = body.category;
    if (body.subcategory   !== undefined) patch["subcategory"]   = body.subcategory;
    if (body.merchant      !== undefined) patch["merchant"]      = body.merchant;
    if (body.tags          !== undefined) patch["tags"]          = body.tags;
    if (body.account_id    !== undefined) patch["account_id"]    = body.account_id;
    if (body.to_account_id !== undefined) patch["to_account_id"] = body.to_account_id;
    if (body.amount        !== undefined) patch["amount"]        = body.amount;
    if (body.note          !== undefined) patch["note"]          = body.note;

    const { data, error } = await supabase
      .from("fin_transactions").update(patch as never)
      .eq("id", id).eq("user_id", uid()).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ transaction: data });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const supabase = await createAdminClient();
    // Return the deleted row for undo
    const { data, error: fetchErr } = await supabase
      .from("fin_transactions").select("*").eq("id", id).eq("user_id", uid()).single();
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

    const { error } = await supabase
      .from("fin_transactions").delete().eq("id", id).eq("user_id", uid());
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: data });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
