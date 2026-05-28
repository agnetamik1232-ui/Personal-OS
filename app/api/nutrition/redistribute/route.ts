import { NextResponse } from "next/server";
import Anthropic         from "@anthropic-ai/sdk";

const client = new Anthropic();

export interface RedistributeResponse {
  p: number;   // protein g
  c: number;   // carbs g
  f: number;   // fat g
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { name?: string; kcal?: number };
    const { name, kcal } = body;
    if (!name || kcal == null) return NextResponse.json({ error: "name and kcal required" }, { status: 400 });

    const msg = await client.messages.create({
      model:      "claude-haiku-4-5",
      max_tokens: 80,
      messages:   [{
        role:    "user",
        content: `For "${name}" at exactly ${kcal} kcal, give realistic macros.
Return ONLY JSON: {"p":number,"c":number,"f":number}
p=protein g, c=carbs g, f=fat g. Ensure 4*p + 4*c + 9*f ≈ ${kcal}.`,
      }],
    });

    const raw  = (msg.content[0] as { type: string; text: string }).text.trim();
    const json = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
    const data = JSON.parse(json) as RedistributeResponse;
    return NextResponse.json(data);
  } catch (e) {
    console.error("redistribute error", e);
    return NextResponse.json({ error: "Redistribution failed" }, { status: 500 });
  }
}
