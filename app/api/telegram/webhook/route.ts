import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient }             from "@/lib/supabase/server";
import { classifyCapture }               from "@/lib/router/classifyCapture";
import { transcribeAudio }               from "@/lib/ai/transcribe";
import { embedText }                     from "@/lib/ai/embed";
import { localDateKey }                  from "@/lib/utils/localDate";
import {
  sendMessage,
  answerCallbackQuery,
  editMessageReplyMarkup,
  getFilePath,
  downloadFile,
  urgencyKeyboard,
} from "@/lib/telegram/api";
import type {
  TelegramUpdate,
  TelegramMessage,
} from "@/lib/telegram/types";

// ── Env helpers ────────────────────────────────────────────────────────────
function env(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} not set`);
  return v;
}

function allowedUserId(): number {
  return parseInt(env("TELEGRAM_USER_ID"), 10);
}

function ownerUserId(): string {
  return env("OWNER_USER_ID");
}

// ── POST /api/telegram/webhook ─────────────────────────────────────────────
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Verify webhook secret ─────────────────────────────────────────────────
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (!secret || secret !== process.env["TELEGRAM_WEBHOOK_SECRET"]) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Always return 200 to Telegram — non-200 causes retries ─────────────────
  try {
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    } else if (update.message) {
      await handleMessage(update.message);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[webhook] unhandled error:", msg);

    // Try to notify the user via Telegram so they can see what broke
    const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
    if (chatId) {
      try {
        await sendMessage(chatId, `⚠️ *Internal error:*\n\`${msg}\``);
      } catch { /* ignore secondary failure */ }
    }
  }

  // Always 200 — Telegram won't retry
  return NextResponse.json({ ok: true });
}

// ── Message handler ────────────────────────────────────────────────────────
async function handleMessage(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;

  // 2. Verify user ───────────────────────────────────────────────────────────
  if (message.from?.id !== allowedUserId()) {
    await sendMessage(chatId, "⛔ Unauthorised.");
    return;
  }

  let rawText: string | null = null;
  let audioUrl: string | null = null;

  // 3. Extract text or transcribe voice ─────────────────────────────────────
  if (message.voice ?? message.audio) {
    const voice = message.voice ?? message.audio;
    if (!voice) return;

    try {
      const filePath = await getFilePath(voice.file_id);
      const audioBytes = await downloadFile(filePath);
      const mimeType = voice.mime_type ?? "audio/ogg";
      audioUrl = `tg://file/${filePath}`;
      rawText = await transcribeAudio(audioBytes, mimeType);
    } catch (err) {
      console.error("[webhook] transcription error:", err);
      await sendMessage(chatId, "❌ Could not transcribe audio. Please send text.");
      return;
    }
  } else {
    rawText = message.text ?? message.caption ?? null;
  }

  if (!rawText?.trim()) {
    await sendMessage(chatId, "📭 Nothing to capture — send text or a voice note.");
    return;
  }

  // 4. Classify ──────────────────────────────────────────────────────────────
  let classification;
  let llm_source: string;

  try {
    ({ classification, llm_source } = await classifyCapture(rawText));
  } catch (err) {
    console.error("[webhook] classify error:", err);
    await sendMessage(chatId, "⚠️ Classification failed — capture saved as note.");
    classification = {
      kind: "note" as const,
      urgency: "someday" as const,
      entity_id: null,
      tags: [],
      summary: rawText.slice(0, 80),
    };
    llm_source = "error-fallback";
  }

  const supabase = await createAdminClient();
  const userId = ownerUserId();

  // 5. Write raw_capture ─────────────────────────────────────────────────────
  const { data: capture, error: captureErr } = await supabase
    .from("raw_captures")
    .insert({
      user_id:       userId,
      source:        "telegram",
      raw_text:      rawText,
      audio_url:     audioUrl,
      classification: classification,
      llm_source,
      routed_to:     null,
      routed_id:     null,
    } as never)
    .select("id")
    .single();

  if (captureErr || !capture) {
    console.error("[webhook] raw_captures insert error:", captureErr);
    await sendMessage(chatId, "❌ Database error saving capture.");
    return;
  }

  const captureId = (capture as { id: string }).id;

  // 6. Route to downstream table ─────────────────────────────────────────────
  let routedTo: string | null = null;
  let routedId: string | null = null;

  try {
    ({ routedTo, routedId } = await routeCapture({
      userId,
      captureId,
      rawText,
      classification,
      supabase,
    }));
  } catch (err) {
    console.error("[webhook] routing error:", err);
  }

  // Update raw_capture with routing info
  if (routedTo && routedId) {
    await supabase
      .from("raw_captures")
      .update({ routed_to: routedTo, routed_id: routedId } as never)
      .eq("id", captureId);
  }

  // 7. Embed + write memory_chunk ────────────────────────────────────────────
  embedAndStore({ userId, captureId, rawText, supabase }).catch((err) =>
    console.error("[webhook] embed error:", err)
  );

  // 8. Write audit_log ───────────────────────────────────────────────────────
  await supabase.from("audit_log").insert({
    user_id:       userId,
    action:        "capture",
    resource_type: "raw_captures",
    resource_id:   captureId,
    metadata: {
      source:    "telegram",
      kind:      classification.kind,
      urgency:   classification.urgency,
      llm_source,
      routed_to: routedTo,
    },
  } as never);

  // 9. Reply with confirmation + urgency keyboard ────────────────────────────
  const kindEmoji: Record<string, string> = {
    task:      "✅",
    note:      "📝",
    habit_log: "🏃",
    finance:   "💰",
    health:    "❤️",
    decision:  "⚖️",
  };

  const urgencyLabel: Record<string, string> = {
    today:      "🔥 Today",
    this_week:  "📅 This Week",
    this_month: "🗓 This Month",
    someday:    "💤 Someday",
  };

  const emoji   = kindEmoji[classification.kind]  ?? "📌";
  const urgency = urgencyLabel[classification.urgency] ?? classification.urgency;
  const tags    = classification.tags.length ? classification.tags.map((t) => `#${t}`).join(" ") : "—";

  const replyText = [
    `${emoji} *Captured*`,
    "",
    `*${classification.summary}*`,
    "",
    `Kind: \`${classification.kind}\` · Urgency: ${urgency}`,
    `Tags: ${tags}`,
    "",
    `_Override urgency:_`,
  ].join("\n");

  await sendMessage(chatId, replyText, urgencyKeyboard(captureId));
}

// ── Routing logic ──────────────────────────────────────────────────────────
interface RouteArgs {
  userId:        string;
  captureId:     string;
  rawText:       string;
  classification: {
    kind:      string;
    urgency:   string;
    tags:      string[];
    summary:   string;
    entity_id: string | null;
  };
  supabase: Awaited<ReturnType<typeof createAdminClient>>;
}

async function routeCapture(args: RouteArgs): Promise<{ routedTo: string | null; routedId: string | null }> {
  const { userId, classification, rawText, supabase } = args;

  // tasks
  if (classification.kind === "task") {
    const urgencyMap: Record<string, string> = {
      today:      "high",
      this_week:  "medium",
      this_month: "low",
      someday:    "low",
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id:     userId,
        title:       classification.summary || rawText.slice(0, 160),
        description: rawText,
        urgency:     urgencyMap[classification.urgency] ?? "low",
        key:         false,
        tags:        classification.tags,
        entity_id:   classification.entity_id ?? null,
      } as never)
      .select("id")
      .single();

    if (error) throw error;
    const row = data as { id: string };
    return { routedTo: "task", routedId: row.id };
  }

  // daily_logs — habit_log, finance, health, decision, note
  if (["habit_log","finance","health","decision","note"].includes(classification.kind)) {
    const today = localDateKey();

    // Try to get today's log
    const { data: existing } = await supabase
      .from("daily_logs")
      .select("id, notes")
      .eq("user_id", userId)
      .eq("log_date", today)
      .maybeSingle();

    const existingRow = existing as { id: string; notes: string | null } | null;

    // Merge the new capture into the notes JSON
    let notesObj: Record<string, unknown> = {};
    if (existingRow?.notes) {
      try { notesObj = JSON.parse(existingRow.notes) as Record<string, unknown>; } catch { /* ignore */ }
    }
    const bucket = classification.kind;
    const existing_entries = Array.isArray(notesObj[bucket]) ? (notesObj[bucket] as unknown[]) : [];
    notesObj[bucket] = [
      ...existing_entries,
      { text: rawText, summary: classification.summary, tags: classification.tags, captured_at: new Date().toISOString() },
    ];

    let logId: string;

    if (existingRow) {
      await supabase
        .from("daily_logs")
        .update({ notes: JSON.stringify(notesObj) } as never)
        .eq("id", existingRow.id);
      logId = existingRow.id;
    } else {
      const { data, error } = await supabase
        .from("daily_logs")
        .insert({
          user_id:  userId,
          log_date: today,
          notes:    JSON.stringify(notesObj),
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      logId = (data as { id: string }).id;
    }

    return { routedTo: "daily_log", routedId: logId };
  }

  return { routedTo: null, routedId: null };
}

// ── Embed + memory_chunk (runs async, non-blocking) ───────────────────────
async function embedAndStore(args: {
  userId:    string;
  captureId: string;
  rawText:   string;
  supabase:  Awaited<ReturnType<typeof createAdminClient>>;
}): Promise<void> {
  const { userId, captureId, rawText, supabase } = args;
  const embedding = await embedText(rawText);
  await supabase.from("memory_chunks").insert({
    user_id:     userId,
    source_type: "capture",
    source_id:   captureId,
    text:        rawText,
    embedding:   JSON.stringify(embedding),
  } as never);
}

// ── Callback query handler (urgency override) ──────────────────────────────
async function handleCallbackQuery(
  query: NonNullable<TelegramUpdate["callback_query"]>
): Promise<void> {
  const data = query.data ?? "";

  // Verify user
  if (query.from.id !== allowedUserId()) {
    await answerCallbackQuery(query.id, "⛔ Unauthorised");
    return;
  }

  // Parse: urgency:{urgency}:{capture_id}
  const parts = data.split(":");
  const action     = parts[0];
  const newUrgency = parts[1];
  const captureId  = parts.slice(2).join(":"); // UUID may contain colons in theory

  if (action !== "urgency" || !newUrgency || !captureId) {
    await answerCallbackQuery(query.id);
    return;
  }

  const supabase = await createAdminClient();
  const userId   = ownerUserId();
  const isKey    = newUrgency === "key";

  // Update raw_captures.classification
  const { data: capture } = await supabase
    .from("raw_captures")
    .select("classification, routed_to, routed_id")
    .eq("id", captureId)
    .eq("user_id", userId)
    .single();

  if (!capture) {
    await answerCallbackQuery(query.id, "❌ Capture not found");
    return;
  }

  const row = capture as {
    classification: Record<string, unknown>;
    routed_to: string | null;
    routed_id: string | null;
  };

  const updatedClass = {
    ...row.classification,
    urgency: isKey ? row.classification["urgency"] : newUrgency,
    key:     isKey ? true : false,
  };

  await supabase
    .from("raw_captures")
    .update({ classification: updatedClass } as never)
    .eq("id", captureId);

  // Propagate to tasks if routed there
  if (row.routed_to === "task" && row.routed_id) {
    const urgencyMap: Record<string, string> = {
      today:      "high",
      this_week:  "medium",
      this_month: "low",
      someday:    "low",
    };

    const taskUpdate: Record<string, unknown> = {};
    if (!isKey && newUrgency in urgencyMap) {
      taskUpdate["urgency"] = urgencyMap[newUrgency];
    }
    if (isKey) {
      taskUpdate["key"] = true;
    }

    if (Object.keys(taskUpdate).length > 0) {
      await supabase
        .from("tasks")
        .update(taskUpdate as never)
        .eq("id", row.routed_id);
    }
  }

  // Write audit_log
  await supabase.from("audit_log").insert({
    user_id:       userId,
    action:        "urgency_override",
    resource_type: "raw_captures",
    resource_id:   captureId,
    metadata:      { new_urgency: newUrgency, is_key: isKey },
  } as never);

  // Update the message: remove keyboard + confirm
  const label: Record<string, string> = {
    today:      "🔥 Today",
    this_week:  "📅 This Week",
    this_month: "🗓 This Month",
    someday:    "💤 Someday",
    key:        "🔑 Key",
  };

  await answerCallbackQuery(query.id, `Set to ${label[newUrgency] ?? newUrgency}`);

  // Remove the keyboard from the original message
  if (query.message) {
    await editMessageReplyMarkup(
      query.message.chat.id,
      query.message.message_id,
      { inline_keyboard: [] }
    );
  }
}
