import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export interface Ingredient { name: string; amount: string; unit: string; }

export interface Recipe {
  id:                  string;
  name:                string;
  description:         string | null;
  emoji:               string;
  color:               string;
  servings:            number;
  prep_time:           number | null;
  cook_time:           number | null;
  kcal_per_serving:    number;
  protein_per_serving: number;
  carbs_per_serving:   number;
  fat_per_serving:     number;
  ingredients:         Ingredient[];
  instructions:        string | null;
  tags:                string[];
  created_at:          string;
  updated_at:          string;
}

function uid() {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const search = req.nextUrl.searchParams.get("q");
  try {
    const sb = await createAdminClient();
    let q = sb.from("recipes").select("*").eq("user_id", uid()).order("name");
    if (search) q = q.ilike("name", `%${search}%`);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ recipes: (data ?? []) as Recipe[] });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const b = await req.json() as Partial<Recipe>;
  if (!b.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  try {
    const sb = await createAdminClient();
    const { data, error } = await sb.from("recipes").insert({
      user_id:             uid(),
      name:                b.name.trim(),
      description:         b.description         ?? null,
      emoji:               b.emoji               ?? "🍽️",
      color:               b.color               ?? "#3D52D5",
      servings:            b.servings            ?? 1,
      prep_time:           b.prep_time           ?? null,
      cook_time:           b.cook_time           ?? null,
      kcal_per_serving:    b.kcal_per_serving    ?? 0,
      protein_per_serving: b.protein_per_serving ?? 0,
      carbs_per_serving:   b.carbs_per_serving   ?? 0,
      fat_per_serving:     b.fat_per_serving     ?? 0,
      ingredients:         b.ingredients         ?? [],
      instructions:        b.instructions        ?? null,
      tags:                b.tags                ?? [],
    } as never).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ recipe: data as Recipe }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const b = await req.json() as Partial<Recipe>;
  try {
    const sb = await createAdminClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const fields: (keyof Recipe)[] = ["name","description","emoji","color","servings","prep_time","cook_time",
      "kcal_per_serving","protein_per_serving","carbs_per_serving","fat_per_serving","ingredients","instructions","tags"];
    for (const f of fields) if (b[f] !== undefined) patch[f] = b[f];
    const { data, error } = await sb.from("recipes").update(patch as never).eq("id", id).eq("user_id", uid()).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ recipe: data as Recipe });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const sb = await createAdminClient();
    await sb.from("recipes").delete().eq("id", id).eq("user_id", uid());
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
