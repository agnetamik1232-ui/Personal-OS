import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export interface SearchResult {
  id:       string;
  type:     "task" | "note" | "issue" | "idea" | "journal";
  title:    string;
  snippet:  string;
  href:     string;
  date:     string;
}

function uid() {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  try {
    const sb = await createAdminClient();
    const like = `%${q}%`;

    const [tasks, notes, issues, ideas] = await Promise.all([
      sb.from("tasks").select("id,title,description,created_at").eq("user_id", uid()).ilike("title", like).limit(5),
      sb.from("work_notes").select("id,content,shift_date,created_at").eq("user_id", uid()).ilike("content", like).limit(5),
      sb.from("work_issues").select("id,title,description,created_at").eq("user_id", uid()).ilike("title", like).limit(5),
      sb.from("work_ideas").select("id,title,description,created_at").eq("user_id", uid()).ilike("title", like).limit(5),
    ]);

    const results: SearchResult[] = [];

    for (const t of (tasks.data ?? [])) {
      const row = t as { id: string; title: string; description?: string | null; created_at: string };
      results.push({ id: row.id, type: "task", title: row.title, snippet: row.description?.slice(0, 80) ?? "", href: "/tasks", date: row.created_at });
    }
    for (const n of (notes.data ?? [])) {
      const row = n as { id: string; content: string; shift_date: string; created_at: string };
      results.push({ id: row.id, type: "note", title: row.content.slice(0, 60), snippet: row.content.slice(0, 120), href: "/work", date: row.shift_date });
    }
    for (const i of (issues.data ?? [])) {
      const row = i as { id: string; title: string; description?: string | null; created_at: string };
      results.push({ id: row.id, type: "issue", title: row.title, snippet: row.description?.slice(0, 80) ?? "", href: "/work", date: row.created_at });
    }
    for (const i of (ideas.data ?? [])) {
      const row = i as { id: string; title: string; description?: string | null; created_at: string };
      results.push({ id: row.id, type: "idea", title: row.title, snippet: row.description?.slice(0, 80) ?? "", href: "/work", date: row.created_at });
    }

    results.sort((a, b) => b.date.localeCompare(a.date));
    return NextResponse.json({ results: results.slice(0, 12) });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
