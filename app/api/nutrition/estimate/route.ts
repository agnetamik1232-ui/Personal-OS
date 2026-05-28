import { NextResponse }  from "next/server";
import Anthropic          from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface EstimateResponse {
  kcal: number;
  p:    number;   // protein g
  c:    number;   // carbs g
  f:    number;   // fat g
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { text?: string };
    const text = body.text?.trim();
    if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

    const msg = await client.messages.create({
      model:      "claude-haiku-4-5",
      max_tokens: 120,
      messages:   [{
        role:    "user",
        content: `Estimate nutrition for: "${text}"
Return ONLY valid JSON with integer values, no explanation:
{"kcal":number,"p":number,"c":number,"f":number}
p=protein g, c=carbs g, f=fat g. Make kcal consistent with 4*p+4*c+9*f.`,
      }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    // Strip markdown fences if present
    const json = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/,"").trim();
    const data = JSON.parse(json) as EstimateResponse;
    return NextResponse.json(data);
  } catch (e) {
    console.error("estimate error", e);
    return NextResponse.json({ error: "Estimation failed" }, { status: 500 });
  }
}
