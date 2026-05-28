import type { InlineKeyboardMarkup, TelegramFile } from "./types";

function token(): string {
  const t = process.env["TELEGRAM_BOT_TOKEN"];
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN not set");
  return t;
}

function apiUrl(method: string): string {
  return `https://api.telegram.org/bot${token()}/${method}`;
}

async function call(method: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(apiUrl(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram ${method} failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as { ok: boolean; result: unknown; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method} error: ${json.description ?? "unknown"}`);
  return json.result;
}

/** Resolve a file_id to its download path. */
export async function getFilePath(fileId: string): Promise<string> {
  const result = (await call("getFile", { file_id: fileId })) as TelegramFile;
  if (!result.file_path) throw new Error("Telegram file has no file_path");
  return result.file_path;
}

/** Download a file from Telegram's servers. */
export async function downloadFile(filePath: string): Promise<ArrayBuffer> {
  const url = `https://api.telegram.org/file/bot${token()}/${filePath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`File download failed: ${res.status}`);
  return res.arrayBuffer();
}

/** Send a plain or rich text message. */
export async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: InlineKeyboardMarkup
): Promise<void> {
  const body: Record<string, unknown> = {
    chat_id:    chatId,
    text,
    parse_mode: "Markdown",
  };
  if (replyMarkup) body["reply_markup"] = replyMarkup;
  await call("sendMessage", body);
}

/** Acknowledge a button tap — required within 10 seconds. */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  await call("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text, show_alert: false } : {}),
  });
}

/** Edit the reply markup on an existing message (e.g. remove keyboard after tap). */
export async function editMessageReplyMarkup(
  chatId: number,
  messageId: number,
  replyMarkup: InlineKeyboardMarkup | Record<string, never>
): Promise<void> {
  await call("editMessageReplyMarkup", {
    chat_id:      chatId,
    message_id:   messageId,
    reply_markup: replyMarkup,
  });
}

/** Build the urgency override inline keyboard. */
export function urgencyKeyboard(captureId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "🔥 Today",      callback_data: `urgency:today:${captureId}` },
        { text: "📅 This Week",  callback_data: `urgency:this_week:${captureId}` },
        { text: "🗓 This Month", callback_data: `urgency:this_month:${captureId}` },
      ],
      [
        { text: "💤 Someday",   callback_data: `urgency:someday:${captureId}` },
        { text: "🔑 Key",       callback_data: `urgency:key:${captureId}` },
      ],
    ],
  };
}
