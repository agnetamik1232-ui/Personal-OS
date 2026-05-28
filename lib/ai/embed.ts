import OpenAI from "openai";

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
 * Embed text using text-embedding-3-small (1536 dims).
 * Returns a float array suitable for pgvector storage.
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await client().embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000), // model max
  });

  const first = response.data[0];
  if (!first) throw new Error("OpenAI embeddings returned empty data");
  return first.embedding;
}
