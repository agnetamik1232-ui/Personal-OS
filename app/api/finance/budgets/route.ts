import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { FinBudget } from "@/lib/finance/types";

function uid(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

function monthStart(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0]!;
}
function monthEnd(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0]!;
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createAdminClient();
    const userId = uid();
    const [budgetsRes, txsRes] = await Promise.all([
      supabase.from("fin_budgets").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("fin_transactions").select("category, amount, type")
        .eq("user_id", userId).eq("type", "expense")
        .gte("date", monthStart()).lte("date", monthEnd()),
    ]);
    if (budgetsRes.error) return NextResponse.json({ error: budgetsRes.error.message }, { status: 500 });

    const spentByCategory = new Map<string, number>();
    for (const tx of (txsRes.data ?? [])) {
      const t = tx as { category: string; amount: number };
      spentByCategory.set(t.category, (spentByCategory.get(t.category) ?? 0) + t.amount);
    }

    const budgets: FinBudget[] = (budgetsRes.data ?? []).map((b: Record<string, unknown>) => {
      const budget = b as unknown as FinBudget;
      const spent = spentByCategory.get(budget.category) ?? 0;
      const remaining = budget.amount - spent;
      const pct = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 999) : 0;
      return { ...budget, spent, remaining, pct };
    });

    return NextResponse.json({ budgets });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as Partial<FinBudget>;
    if (!body.category) return NextResponse.json({ error: "category required" }, { status: 400 });
    if (!body.amount || body.amount <= 0) return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("fin_budgets")
      .upsert({
        user_id:  uid(),
        category: body.category,
        amount:   body.amount,
        period:   body.period ?? "monthly",
      } as never, { onConflict: "user_id,category" })
      .select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ budget: data }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const body = await req.json() as Partial<FinBudget>;
    const patch: Record<string, unknown> = {};
    if (body.amount   !== undefined) patch["amount"]   = body.amount;
    if (body.category !== undefined) patch["category"] = body.category;
    if (body.period   !== undefined) patch["period"]   = body.period;
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("fin_budgets").update(patch as never)
      .eq("id", id).eq("user_id", uid()).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ budget: data });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("fin_budgets").delete().eq("id", id).eq("user_id", uid());
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
