import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { FinCategory } from "@/lib/finance/types";

function uid(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

const DEFAULT_CATEGORIES = [
  { name: "Food & Groceries", icon: "🛒", color: "#22c55e", cat_type: "expense", sort_order: 0, children: [
    { name: "Supermarket", icon: "🛒", color: "#22c55e", cat_type: "expense", sort_order: 0 },
    { name: "Restaurants", icon: "🍽️", color: "#22c55e", cat_type: "expense", sort_order: 1 },
    { name: "Coffee", icon: "☕", color: "#22c55e", cat_type: "expense", sort_order: 2 },
    { name: "Delivery", icon: "🛵", color: "#22c55e", cat_type: "expense", sort_order: 3 },
  ]},
  { name: "Transport", icon: "🚗", color: "#3b82f6", cat_type: "expense", sort_order: 1, children: [
    { name: "Fuel", icon: "⛽", color: "#3b82f6", cat_type: "expense", sort_order: 0 },
    { name: "Parking", icon: "🅿️", color: "#3b82f6", cat_type: "expense", sort_order: 1 },
    { name: "Public Transport", icon: "🚌", color: "#3b82f6", cat_type: "expense", sort_order: 2 },
    { name: "Car Repairs", icon: "🔧", color: "#3b82f6", cat_type: "expense", sort_order: 3 },
  ]},
  { name: "Housing", icon: "🏠", color: "#8b5cf6", cat_type: "expense", sort_order: 2, children: [
    { name: "Rent", icon: "🏠", color: "#8b5cf6", cat_type: "expense", sort_order: 0 },
    { name: "Electricity", icon: "💡", color: "#8b5cf6", cat_type: "expense", sort_order: 1 },
    { name: "Water", icon: "💧", color: "#8b5cf6", cat_type: "expense", sort_order: 2 },
    { name: "Internet", icon: "📶", color: "#8b5cf6", cat_type: "expense", sort_order: 3 },
  ]},
  { name: "Entertainment", icon: "🎬", color: "#f59e0b", cat_type: "expense", sort_order: 3, children: [
    { name: "Movies", icon: "🎬", color: "#f59e0b", cat_type: "expense", sort_order: 0 },
    { name: "Games", icon: "🎮", color: "#f59e0b", cat_type: "expense", sort_order: 1 },
    { name: "Streaming", icon: "📺", color: "#f59e0b", cat_type: "expense", sort_order: 2 },
  ]},
  { name: "Health", icon: "❤️", color: "#ef4444", cat_type: "expense", sort_order: 4, children: [
    { name: "Pharmacy", icon: "💊", color: "#ef4444", cat_type: "expense", sort_order: 0 },
    { name: "Doctor", icon: "🩺", color: "#ef4444", cat_type: "expense", sort_order: 1 },
    { name: "Gym", icon: "🏋️", color: "#ef4444", cat_type: "expense", sort_order: 2 },
    { name: "Supplements", icon: "💪", color: "#ef4444", cat_type: "expense", sort_order: 3 },
  ]},
  { name: "Shopping", icon: "🛍️", color: "#ec4899", cat_type: "expense", sort_order: 5, children: [
    { name: "Clothes", icon: "👗", color: "#ec4899", cat_type: "expense", sort_order: 0 },
    { name: "Electronics", icon: "📱", color: "#ec4899", cat_type: "expense", sort_order: 1 },
    { name: "Home & Garden", icon: "🌱", color: "#ec4899", cat_type: "expense", sort_order: 2 },
  ]},
  { name: "Travel", icon: "✈️", color: "#06b6d4", cat_type: "expense", sort_order: 6 },
  { name: "Education", icon: "📚", color: "#0ea5e9", cat_type: "expense", sort_order: 7 },
  { name: "Subscriptions", icon: "📱", color: "#6366f1", cat_type: "expense", sort_order: 8 },
  { name: "Salary", icon: "💼", color: "#10b981", cat_type: "income", sort_order: 9 },
  { name: "Freelance", icon: "💻", color: "#10b981", cat_type: "income", sort_order: 10 },
  { name: "Investment Return", icon: "📈", color: "#22c55e", cat_type: "income", sort_order: 11 },
  { name: "Other Income", icon: "💰", color: "#10b981", cat_type: "income", sort_order: 12 },
  { name: "Other", icon: "📦", color: "#6b7280", cat_type: "both", sort_order: 99 },
] as const;

type RawCat = { id: string; parent_id: string | null; name: string; icon: string; color: string; cat_type: string; sort_order: number; created_at: string };

function buildTree(rows: RawCat[]): FinCategory[] {
  const map = new Map<string, FinCategory>();
  const roots: FinCategory[] = [];
  for (const r of rows) {
    map.set(r.id, { ...r, cat_type: r.cat_type as FinCategory["cat_type"], children: [] });
  }
  for (const r of rows) {
    const node = map.get(r.id)!;
    if (r.parent_id && map.has(r.parent_id)) {
      map.get(r.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createAdminClient();
    const userId = uid();

    const { data, error } = await supabase
      .from("fin_categories")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Seed defaults if empty
    if (!data || data.length === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        const { children, ...catData } = cat as typeof cat & { children?: ReadonlyArray<{ name: string; icon: string; color: string; cat_type: string; sort_order: number }> };
        const { data: parent } = await supabase
          .from("fin_categories")
          .insert({ user_id: userId, ...catData } as never)
          .select("id").single();
        if (parent && children) {
          for (const child of children) {
            await supabase.from("fin_categories").insert({
              user_id: userId,
              parent_id: (parent as { id: string }).id,
              ...child,
            } as never);
          }
        }
      }
      const { data: fresh } = await supabase
        .from("fin_categories").select("*").eq("user_id", userId).order("sort_order");
      return NextResponse.json({ categories: buildTree((fresh ?? []) as RawCat[]) });
    }

    return NextResponse.json({ categories: buildTree(data as RawCat[]) });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as Partial<FinCategory & { cat_type: string }>;
    if (!body.name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("fin_categories")
      .insert({
        user_id:   uid(),
        name:      body.name.trim(),
        parent_id: body.parent_id ?? null,
        icon:      body.icon ?? "📦",
        color:     body.color ?? "#6b7280",
        cat_type:  body.cat_type ?? "expense",
        sort_order: body.sort_order ?? 0,
      } as never)
      .select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ category: data }, { status: 201 });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const body = await req.json() as Partial<FinCategory>;
    const patch: Record<string, unknown> = {};
    if (body.name       !== undefined) patch["name"]       = body.name;
    if (body.icon       !== undefined) patch["icon"]       = body.icon;
    if (body.color      !== undefined) patch["color"]      = body.color;
    if (body.cat_type   !== undefined) patch["cat_type"]   = body.cat_type;
    if (body.sort_order !== undefined) patch["sort_order"] = body.sort_order;
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("fin_categories").update(patch as never)
      .eq("id", id).eq("user_id", uid()).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ category: data });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("fin_categories").delete().eq("id", id).eq("user_id", uid());
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
