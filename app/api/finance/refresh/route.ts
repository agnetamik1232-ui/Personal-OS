/**
 * POST /api/finance/refresh
 *
 * Thin server-side relay that the dashboard refresh button calls.
 * Injects CRON_SECRET so the secret never touches the browser.
 * Rate-limited to one call per minute via a simple in-memory guard.
 */

import { NextResponse } from "next/server";
import type { FinanceSnapshot } from "../snapshot/route";

let lastCall = 0;
const COOLDOWN_MS = 60_000;

export async function POST(): Promise<NextResponse> {
  const now = Date.now();
  if (now - lastCall < COOLDOWN_MS) {
    return NextResponse.json({ error: "Rate limited — wait 60s between refreshes" }, { status: 429 });
  }
  lastCall = now;

  const secret = process.env["CRON_SECRET"];
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });

  const base = process.env["NEXT_PUBLIC_BASE_URL"] ?? `http://localhost:${process.env["PORT"] ?? 3000}`;

  const res  = await fetch(`${base}/api/finance/snapshot`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const json = await res.json() as { snapshot?: FinanceSnapshot; error?: string };
  if (!res.ok) return NextResponse.json({ error: json.error ?? "Snapshot failed" }, { status: res.status });
  return NextResponse.json({ ok: true, snapshot: json.snapshot });
}
