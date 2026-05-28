import { type NextRequest, NextResponse } from "next/server";
import { processCapture }               from "@/lib/router/processCapture";

function ownerUserId(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = (body as Record<string, unknown>)["text"];
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const result = await processCapture({
      text:   text.trim(),
      userId: ownerUserId(),
      source: "web",
    });

    return NextResponse.json({
      ok:             true,
      captureId:      result.captureId,
      classification: result.classification,
      routedTo:       result.routedTo,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/capture] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
