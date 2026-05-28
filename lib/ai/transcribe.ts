import OpenAI, { toFile } from "openai";

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

/**
 * Transcribe audio bytes using OpenAI Whisper (whisper-1).
 * @param audio  Raw audio bytes from Telegram (OGG/OPUS or MP3)
 * @param mimeType  e.g. "audio/ogg" — used to choose file extension
 */
export async function transcribeAudio(
  audio: ArrayBuffer,
  mimeType = "audio/ogg"
): Promise<string> {
  const ext = mimeType.includes("mp3") ? "mp3"
    : mimeType.includes("mp4") ? "mp4"
    : mimeType.includes("wav") ? "wav"
    : "ogg";

  const file = await toFile(
    new Blob([audio], { type: mimeType }),
    `voice.${ext}`,
    { type: mimeType }
  );

  const response = await client().audio.transcriptions.create({
    model: "whisper-1",
    file,
    language: "en",
  });

  return response.text.trim();
}
