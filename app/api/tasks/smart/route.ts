/**
 * POST /api/tasks/smart
 * Body: { query: string, tasks: TaskRow[] }
 *
 * Uses Claude to rank task IDs by relevance to a natural-language query.
 * Falls back to simple keyword scoring when ANTHROPIC_API_KEY is not set.
 */

import { type NextRequest, NextResponse } from "next/server";
import Anthropic                          from "@anthropic-ai/sdk";
import type { TaskRow }                   from "@/app/api/tasks/route";

export interface SmartResult {
  ids:    string[];
  method: "claude" | "keyword";
}

// ── Claude ranking ────────────────────────────────────────────────────────────

async function rankWithClaude(query: string, tasks: TaskRow[]): Promise<string[]> {
  const client = new Anthropic({ apiKey: process.env["ANTHROPIC_API_KEY"] });

  const taskList = tasks.map((t) => ({
    id:       t.id,
    title:    t.title,
    desc:     t.description?.slice(0, 120) ?? "",
    urgency:  t.urgency,
    key:      t.key,
    tags:     t.tags.join(", "),
    due:      t.due_date ?? "",
    owner:    t.owner ?? "",
    entity:   t.entity_name ?? "",
  }));

  const prompt = `You are a personal productivity assistant for a single user.
Given these open tasks and a query, return the IDs of the most relevant tasks ranked by relevance.
Return ONLY valid JSON — no explanation, no markdown: {"ids":["id1","id2",...]}
Include at most 20 IDs. If nothing matches well, return {"ids":[]}.

Query: "${query}"

Tasks (JSON):
${JSON.stringify(taskList, null, 2)}`;

  const msg = await client.messages.create({
    model:      "claude-haiku-4-5",
    max_tokens: 512,
    messages:   [{ role: "user", content: prompt }],
  });

  const text = msg.content.find((b) => b.type === "text")?.text ?? "{}";
  // Strip markdown fences if present
  const clean = text.replace(/```json\n?|```/g, "").trim();
  const parsed = JSON.parse(clean) as { ids?: unknown };
  const ids = Array.isArray(parsed.ids) ? parsed.ids.filter((x): x is string => typeof x === "string") : [];
  return ids;
}

// ── Keyword fallback ──────────────────────────────────────────────────────────

function rankKeyword(query: string, tasks: TaskRow[]): string[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

  const scored = tasks.map((t) => {
    const haystack = [t.title, t.description ?? "", ...t.tags, t.owner ?? "", t.entity_name ?? ""]
      .join(" ").toLowerCase();

    let score = 0;
    for (const tok of tokens) {
      if (haystack.includes(tok)) score += 2;
    }
    // Boost key + urgent tasks
    if (t.key)                                         score += 3;
    if (t.urgency === "today"  || t.urgency === "high")  score += 2;
    if (t.urgency === "this_week" || t.urgency === "medium") score += 1;

    return { id: t.id, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((s) => s.id);
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b     = body as Record<string, unknown>;
  const query = String(b["query"] ?? "").trim();
  const tasks = Array.isArray(b["tasks"]) ? (b["tasks"] as TaskRow[]) : [];

  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  const apiKey = process.env["ANTHROPIC_API_KEY"];

  if (apiKey) {
    try {
      const ids = await rankWithClaude(query, tasks);
      return NextResponse.json({ ids, method: "claude" } satisfies SmartResult);
    } catch (err) {
      console.warn("[smart] Claude failed, falling back to keyword:", err);
    }
  }

  const ids = rankKeyword(query, tasks);
  return NextResponse.json({ ids, method: "keyword" } satisfies SmartResult);
}
