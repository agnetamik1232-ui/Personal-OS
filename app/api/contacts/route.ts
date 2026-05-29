/**
 * GET  /api/contacts          → list all contacts (entities with kind='person')
 * POST /api/contacts          → create a contact
 * PATCH /api/contacts?id=...  → update a contact
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient }              from "@/lib/supabase/server";

function ownerUserId(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

export interface Contact {
  id:           string;
  name:         string;
  company:      string | null;
  email:        string | null;
  phone:        string | null;
  role:         string | null;
  notes:        string | null;
  last_contact: string | null;   // YYYY-MM-DD
  tags:         string[];
  created_at:   string;
}

type RawEntity = {
  id:         string;
  name:       string;
  metadata:   Record<string, unknown>;
  created_at: string;
};

function toContact(e: RawEntity): Contact {
  const m = e.metadata ?? {};
  return {
    id:           e.id,
    name:         e.name,
    company:      (m["company"] as string | null) ?? null,
    email:        (m["email"]   as string | null) ?? null,
    phone:        (m["phone"]   as string | null) ?? null,
    role:         (m["role"]    as string | null) ?? null,
    notes:        (m["notes"]   as string | null) ?? null,
    last_contact: (m["last_contact"] as string | null) ?? null,
    tags:         Array.isArray(m["tags"]) ? (m["tags"] as string[]) : [],
    created_at:   e.created_at,
  };
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createAdminClient();
    const userId   = ownerUserId();

    const { data, error } = await supabase
      .from("entities")
      .select("id, name, metadata, created_at")
      .eq("user_id", userId)
      .eq("kind", "person")
      .order("name", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const contacts = (data ?? []).map((e) => toContact(e as RawEntity));
    return NextResponse.json({ contacts });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: Partial<Contact>;
  try {
    body = (await request.json()) as Partial<Contact>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const supabase = await createAdminClient();
    const userId   = ownerUserId();

    const metadata: Record<string, unknown> = {};
    if (body.company)      metadata["company"]      = body.company;
    if (body.email)        metadata["email"]        = body.email;
    if (body.phone)        metadata["phone"]        = body.phone;
    if (body.role)         metadata["role"]         = body.role;
    if (body.notes)        metadata["notes"]        = body.notes;
    if (body.last_contact) metadata["last_contact"] = body.last_contact;
    if (body.tags?.length) metadata["tags"]         = body.tags;

    const { data, error } = await supabase
      .from("entities")
      .insert({ user_id: userId, name: body.name.trim(), kind: "person", metadata } as never)
      .select("id, name, metadata, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ contact: toContact(data as RawEntity) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let body: Partial<Contact>;
  try {
    body = (await request.json()) as Partial<Contact>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const supabase = await createAdminClient();
    const userId   = ownerUserId();

    // Read existing entity
    const { data: existing } = await supabase
      .from("entities")
      .select("id, name, metadata")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const existingRow = existing as { id: string; name: string; metadata: Record<string, unknown> };

    const metadata = { ...existingRow.metadata };
    if (body.company      !== undefined) metadata["company"]      = body.company;
    if (body.email        !== undefined) metadata["email"]        = body.email;
    if (body.phone        !== undefined) metadata["phone"]        = body.phone;
    if (body.role         !== undefined) metadata["role"]         = body.role;
    if (body.notes        !== undefined) metadata["notes"]        = body.notes;
    if (body.last_contact !== undefined) metadata["last_contact"] = body.last_contact;
    if (body.tags         !== undefined) metadata["tags"]         = body.tags;

    const updatePayload: Record<string, unknown> = { metadata };
    if (body.name?.trim()) updatePayload["name"] = body.name.trim();

    const { data, error } = await supabase
      .from("entities")
      .update(updatePayload as never)
      .eq("id", id)
      .select("id, name, metadata, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ contact: toContact(data as RawEntity) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
