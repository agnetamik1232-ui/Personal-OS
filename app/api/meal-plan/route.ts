import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export interface MealPlanEntry {
  id:          string;
  plan_date:   string;
  meal_type:   "breakfast" | "lunch" | "dinner" | "snack";
  recipe_id:   string | null;
  recipe_name: string | null;  // joined from recipes
  custom_name: string | null;
  servings:    number;
  kcal:        number;
  protein:     number;
  carbs:       number;
  fat:         number;
  logged:      boolean;
  created_at:  string;
}

function uid() {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

// GET /api/meal-plan?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest): Promise<NextResponse> {
  const from = req.nextUrl.searchParams.get("from");
  const to   = req.nextUrl.searchParams.get("to");
  try {
    const sb = await createAdminClient();
    let q = sb.from("meal_plans").select("*, recipes(name)").eq("user_id", uid()).order("plan_date").order("meal_type");
    if (from) q = q.gte("plan_date", from);
    if (to)   q = q.lte("plan_date", to);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const entries: MealPlanEntry[] = (data ?? []).map((r: Record<string, unknown>) => {
      const { recipes: rec, ...rest } = r;
      return { ...rest, recipe_name: (rec as { name?: string } | null)?.name ?? null } as MealPlanEntry;
    });
    return NextResponse.json({ entries });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

// POST — add a meal to the plan
export async function POST(req: NextRequest): Promise<NextResponse> {
  const b = await req.json() as Partial<MealPlanEntry> & { recipe_id?: string | null };
  if (!b.plan_date || !b.meal_type) return NextResponse.json({ error: "plan_date and meal_type required" }, { status: 400 });
  try {
    const sb = await createAdminClient();
    const { data, error } = await sb.from("meal_plans").insert({
      user_id:     uid(),
      plan_date:   b.plan_date,
      meal_type:   b.meal_type,
      recipe_id:   b.recipe_id   ?? null,
      custom_name: b.custom_name ?? null,
      servings:    b.servings    ?? 1,
      kcal:        b.kcal        ?? 0,
      protein:     b.protein     ?? 0,
      carbs:       b.carbs       ?? 0,
      fat:         b.fat         ?? 0,
      logged:      false,
    } as never).select("*, recipes(name)").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { recipes: rec, ...rest } = data as Record<string, unknown>;
    const entry = { ...rest, recipe_name: (rec as { name?: string } | null)?.name ?? null } as MealPlanEntry;
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

// PATCH — update or mark as logged
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const b = await req.json() as Record<string, unknown>;
  try {
    const sb = await createAdminClient();
    const patch: Record<string, unknown> = {};
    if (b["logged"]      !== undefined) patch["logged"]      = b["logged"];
    if (b["servings"]    !== undefined) patch["servings"]    = b["servings"];
    if (b["kcal"]        !== undefined) patch["kcal"]        = b["kcal"];
    if (b["protein"]     !== undefined) patch["protein"]     = b["protein"];
    if (b["carbs"]       !== undefined) patch["carbs"]       = b["carbs"];
    if (b["fat"]         !== undefined) patch["fat"]         = b["fat"];
    if (b["custom_name"] !== undefined) patch["custom_name"] = b["custom_name"];
    const { data, error } = await sb.from("meal_plans").update(patch as never).eq("id", id).eq("user_id", uid()).select("*, recipes(name)").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { recipes: rec, ...rest } = data as Record<string, unknown>;
    return NextResponse.json({ entry: { ...rest, recipe_name: (rec as { name?: string } | null)?.name ?? null } as MealPlanEntry });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

// DELETE — remove from plan
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const sb = await createAdminClient();
    await sb.from("meal_plans").delete().eq("id", id).eq("user_id", uid());
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
