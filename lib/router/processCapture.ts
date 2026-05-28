/**
 * Shared capture pipeline — used by both the Telegram webhook and
 * the web /api/capture endpoint.
 *
 * Steps: classify → raw_captures → route → embed (async) → audit_log
 */

import { classifyCapture, type Classification } from "./classifyCapture";
import { embedText }                            from "@/lib/ai/embed";
import { createAdminClient }                    from "@/lib/supabase/server";

export type CaptureSource = "telegram" | "web" | "voice";

export interface ProcessCaptureInput {
  text:      string;
  userId:    string;
  source:    CaptureSource;
  audioUrl?: string;
}

export interface ProcessCaptureResult {
  captureId:      string;
  classification: Classification;
  llm_source:     string;
  routedTo:       string | null;
  routedId:       string | null;
}

// ─────────────────────────────────────────────────────────────────────────────

export async function processCapture(
  input: ProcessCaptureInput
): Promise<ProcessCaptureResult> {
  const { text, userId, source, audioUrl = null } = input;
  const supabase = await createAdminClient();

  // 1. Classify ───────────────────────────────────────────────────────────────
  let classification: Classification;
  let llm_source: string;

  try {
    ({ classification, llm_source } = await classifyCapture(text));
  } catch {
    classification = {
      kind:      "note",
      urgency:   "someday",
      entity_id: null,
      tags:      [],
      summary:   text.slice(0, 80),
    };
    llm_source = "error-fallback";
  }

  // 2. Write raw_capture ──────────────────────────────────────────────────────
  const { data: capture, error: captureErr } = await supabase
    .from("raw_captures")
    .insert({
      user_id:        userId,
      source,
      raw_text:       text,
      audio_url:      audioUrl,
      classification,
      llm_source,
      routed_to:      null,
      routed_id:      null,
    } as never)
    .select("id")
    .single();

  if (captureErr || !capture) {
    throw new Error(`raw_captures insert failed: ${captureErr?.message ?? "no data"}`);
  }

  const captureId = (capture as { id: string }).id;

  // 3. Route to downstream table ──────────────────────────────────────────────
  let routedTo: string | null = null;
  let routedId: string | null = null;

  try {
    ({ routedTo, routedId } = await routeCapture({ userId, classification, text, supabase }));
  } catch (err) {
    console.error("[processCapture] routing error:", err);
  }

  if (routedTo && routedId) {
    await supabase
      .from("raw_captures")
      .update({ routed_to: routedTo, routed_id: routedId } as never)
      .eq("id", captureId);
  }

  // 4. Embed + memory_chunk (non-blocking) ────────────────────────────────────
  embedAndStore({ userId, captureId, text, supabase }).catch((err) =>
    console.error("[processCapture] embed error:", err)
  );

  // 5. Audit log ──────────────────────────────────────────────────────────────
  await supabase.from("audit_log").insert({
    user_id:       userId,
    action:        "capture",
    resource_type: "raw_captures",
    resource_id:   captureId,
    metadata:      { source, kind: classification.kind, urgency: classification.urgency, llm_source, routed_to: routedTo },
  } as never);

  return { captureId, classification, llm_source, routedTo, routedId };
}

// ── Routing ──────────────────────────────────────────────────────────────────

async function routeCapture(args: {
  userId:         string;
  text:           string;
  classification: Classification;
  supabase:       Awaited<ReturnType<typeof createAdminClient>>;
}): Promise<{ routedTo: string | null; routedId: string | null }> {
  const { userId, classification, text, supabase } = args;

  if (classification.kind === "task") {
    const urgencyMap: Record<string, string> = {
      today: "high", this_week: "medium", this_month: "low", someday: "low",
    };
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id:     userId,
        title:       classification.summary || text.slice(0, 160),
        description: text,
        urgency:     urgencyMap[classification.urgency] ?? "low",
        key:         false,
        tags:        classification.tags,
        entity_id:   classification.entity_id ?? null,
      } as never)
      .select("id")
      .single();

    if (error) throw error;
    return { routedTo: "task", routedId: (data as { id: string }).id };
  }

  if (["habit_log","finance","health","decision","note"].includes(classification.kind)) {
    const today = new Date().toISOString().split("T")[0] as string;

    const { data: existing } = await supabase
      .from("daily_logs")
      .select("id, notes")
      .eq("user_id", userId)
      .eq("log_date", today)
      .maybeSingle();

    const row = existing as { id: string; notes: string | null } | null;
    let notesObj: Record<string, unknown> = {};
    if (row?.notes) {
      try { notesObj = JSON.parse(row.notes) as Record<string, unknown>; } catch { /* ignore */ }
    }

    const bucket = classification.kind;
    const prev = Array.isArray(notesObj[bucket]) ? (notesObj[bucket] as unknown[]) : [];
    notesObj[bucket] = [
      ...prev,
      { text, summary: classification.summary, tags: classification.tags, captured_at: new Date().toISOString() },
    ];

    let logId: string;
    if (row) {
      await supabase.from("daily_logs").update({ notes: JSON.stringify(notesObj) } as never).eq("id", row.id);
      logId = row.id;
    } else {
      const { data, error } = await supabase
        .from("daily_logs")
        .insert({ user_id: userId, log_date: today, notes: JSON.stringify(notesObj) } as never)
        .select("id")
        .single();
      if (error) throw error;
      logId = (data as { id: string }).id;
    }
    return { routedTo: "daily_log", routedId: logId };
  }

  return { routedTo: null, routedId: null };
}

// ── Embed ────────────────────────────────────────────────────────────────────

async function embedAndStore(args: {
  userId:    string;
  captureId: string;
  text:      string;
  supabase:  Awaited<ReturnType<typeof createAdminClient>>;
}): Promise<void> {
  const { userId, captureId, text, supabase } = args;
  const embedding = await embedText(text);
  await supabase.from("memory_chunks").insert({
    user_id:     userId,
    source_type: "capture",
    source_id:   captureId,
    text,
    embedding:   JSON.stringify(embedding),
  } as never);
}
