import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type CaptureKind = "task" | "note" | "habit_log" | "finance" | "health" | "decision" | "journal";
export type Urgency     = "today" | "this_week" | "this_month" | "someday";

export interface Classification {
  kind:      CaptureKind;
  urgency:   Urgency;
  entity_id: string | null;
  tags:      string[];
  summary:   string;
}

/* ── Prompt ───────────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are a personal capture classifier for a single user's life-operating-system.

Classify the user's captured text and return ONLY a JSON object with this exact shape:
{
  "kind":      "task" | "note" | "habit_log" | "finance" | "health" | "decision" | "journal",
  "urgency":   "today" | "this_week" | "this_month" | "someday",
  "tags":      ["string", ...],
  "summary":   "Action-first summary under 80 chars",
  "entity_id": null
}

Rules:
- kind=task:       something that needs to be done (has a verb/action)
- kind=habit_log:  workout done, food logged, sleep tracked, meditation completed
- kind=finance:    spending, income, invoices, budget notes
- kind=health:     symptoms, doctor visit, weight, medication
- kind=decision:   a choice made or to be made
- kind=journal:    reflections, thoughts about the day, feelings, diary entries, "today I...", personal narrative
- kind=note:       everything else — ideas, observations, references
- urgency=today:   "now", "today", "urgent", "asap", "call back"
- urgency=this_week: "this week", "by friday", "soon", "few days"
- urgency=this_month: "this month", "end of month", "few weeks"
- urgency=someday: vague future, ideas, whenever
- tags: 1–4 lowercase kebab-case strings
- summary: start with an action verb for tasks, noun for notes
- Return valid JSON only — no markdown fences, no explanation.`;

function buildUserPrompt(text: string): string {
  return `Captured text:\n"${text}"`;
}

/* ── Claude (primary) ─────────────────────────────────────────────────────── */

async function classifyWithClaude(text: string): Promise<Classification> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model:      "claude-haiku-4-5-20251001",  // fast + cheap for classification
    max_tokens: 256,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: "user", content: buildUserPrompt(text) }],
  });

  const block = msg.content[0];
  if (!block || block.type !== "text") throw new Error("Claude returned no text");
  return parseJSON(block.text);
}

/* ── OpenAI GPT (fallback) ────────────────────────────────────────────────── */

async function classifyWithOpenAI(text: string): Promise<Classification> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const client = new OpenAI({ apiKey });
  const res = await client.chat.completions.create({
    model:       "gpt-4o-mini",
    max_tokens:  256,
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: buildUserPrompt(text) },
    ],
    response_format: { type: "json_object" },
  });

  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no content");
  return parseJSON(content);
}

/* ── Regex last resort ────────────────────────────────────────────────────── */

function classifyWithRegex(text: string): Classification {
  const lower = text.toLowerCase();

  // kind
  let kind: CaptureKind = "note";
  if (/\b(workout|gym|run|ran|walked|meditat|slept|sleep|calories|ate|drank)\b/.test(lower)) {
    kind = "habit_log";
  } else if (/\b(spent|paid|bought|invoice|receipt|€|\$|£|salary|expense|income|bank)\b/.test(lower)) {
    kind = "finance";
  } else if (/\b(doctor|symptom|pain|weight|blood|medication|pill|headache|fever|sick)\b/.test(lower)) {
    kind = "health";
  } else if (/\b(decided|decision|choose|choice|option|going with)\b/.test(lower)) {
    kind = "decision";
  } else if (/\b(remind|todo|do |fix|call|email|send|buy|book|schedule|finish|complete|submit|review)\b/.test(lower)) {
    kind = "task";
  }

  // urgency
  let urgency: Urgency = "someday";
  if (/\b(today|now|urgent|asap|immediately|tonight|this morning|this evening)\b/.test(lower)) {
    urgency = "today";
  } else if (/\b(this week|by (monday|tuesday|wednesday|thursday|friday)|few days|soon)\b/.test(lower)) {
    urgency = "this_week";
  } else if (/\b(this month|end of month|few weeks|by end of)\b/.test(lower)) {
    urgency = "this_month";
  }

  // tags
  const tags: string[] = [kind];
  if (/\bwork\b/.test(lower))    tags.push("work");
  if (/\bhealth\b/.test(lower))  tags.push("health");
  if (/\bfinance\b/.test(lower)) tags.push("finance");

  // summary: first 75 chars
  const summary = text.length > 75 ? text.slice(0, 72) + "…" : text;

  return { kind, urgency, entity_id: null, tags, summary };
}

/* ── Shared JSON parser + validator ──────────────────────────────────────── */

function parseJSON(raw: string): Classification {
  // Strip markdown fences if model misbehaves
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const obj = JSON.parse(cleaned) as Record<string, unknown>;

  const KINDS    = new Set<string>(["task","note","habit_log","finance","health","decision","journal"]);
  const URGENCIES = new Set<string>(["today","this_week","this_month","someday"]);

  const kind    = KINDS.has(String(obj["kind"] ?? ""))    ? (obj["kind"]    as CaptureKind) : "note";
  const urgency = URGENCIES.has(String(obj["urgency"] ?? "")) ? (obj["urgency"] as Urgency) : "someday";
  const tags    = Array.isArray(obj["tags"])
    ? (obj["tags"] as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 4)
    : [];
  const summary = typeof obj["summary"] === "string" ? obj["summary"].slice(0, 120) : "";

  return { kind, urgency, entity_id: null, tags, summary };
}

/* ── Public entry point ───────────────────────────────────────────────────── */

export async function classifyCapture(
  text: string
): Promise<{ classification: Classification; llm_source: string }> {
  // 1. Claude
  try {
    const classification = await classifyWithClaude(text);
    return { classification, llm_source: "claude-haiku-4-5" };
  } catch (err) {
    console.warn("[classify] Claude failed:", (err as Error).message);
  }

  // 2. OpenAI GPT-4o-mini
  try {
    const classification = await classifyWithOpenAI(text);
    return { classification, llm_source: "gpt-4o-mini" };
  } catch (err) {
    console.warn("[classify] OpenAI failed:", (err as Error).message);
  }

  // 3. Regex
  console.warn("[classify] Falling back to regex classifier");
  return { classification: classifyWithRegex(text), llm_source: "regex" };
}
