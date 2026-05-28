/**
 * POST /api/finance/snapshot
 *
 * Triggers the full AI pipeline:
 *   1. Download workbook as XLSX via Google Drive API (service account)
 *   2. Parse all tabs with exceljs → 2-D arrays
 *   3. Send sheet dump to Claude → extract net_worth, currency, as_of, categories[]
 *   4. Persist snapshot to daily_logs.notes.finance (today's row)
 *   5. Return the snapshot
 *
 * Auth: Authorization: Bearer ${CRON_SECRET}  (Vercel cron + manual refresh)
 * Page loads NEVER hit this route — they read the snapshot via GET /api/finance.
 */

import { type NextRequest, NextResponse } from "next/server";
import ExcelJS                             from "exceljs";
import Anthropic                           from "@anthropic-ai/sdk";
import { getGoogleAccessToken }            from "@/lib/google/auth";
import { createAdminClient }               from "@/lib/supabase/server";
import { localDateKey }                    from "@/lib/utils/localDate";

export interface FinanceCategory {
  name:  string;
  value: number;
}

export interface FinanceSnapshot {
  net_worth:  number;
  currency:   string;
  as_of:      string;
  categories: FinanceCategory[];
  fetched_at: string;
}

const claude = new Anthropic();

// ── Auth ──────────────────────────────────────────────────────────────────────

function isAuthorised(req: NextRequest): boolean {
  const secret = process.env["CRON_SECRET"];
  if (!secret) return false;
  const bearer = req.headers.get("authorization") ?? "";
  return bearer === `Bearer ${secret}`;
}

// ── Step 1: download XLSX ─────────────────────────────────────────────────────

async function downloadXlsx(): Promise<ArrayBuffer> {
  const fileId = process.env["GOOGLE_SHEETS_FINANCE_ID"];
  if (!fileId) throw new Error("GOOGLE_SHEETS_FINANCE_ID not set");

  const token = await getGoogleAccessToken("https://www.googleapis.com/auth/drive.readonly");
  const url   = `https://www.googleapis.com/drive/v3/files/${fileId}/export` +
                `?mimeType=application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive export failed: ${res.status} ${res.statusText}`);
  return res.arrayBuffer();
}

// ── Step 2: parse XLSX ────────────────────────────────────────────────────────

async function parseXlsx(buf: ArrayBuffer): Promise<string> {
  const wb    = new ExcelJS.Workbook();
  // exceljs accepts a Buffer; cast through unknown to satisfy strict generics
  await (wb.xlsx.load as (b: unknown) => Promise<ExcelJS.Workbook>)(Buffer.from(buf));

  const sections: string[] = [];

  wb.eachSheet((ws) => {
    const rows: string[] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: false }, (cell) => {
        const v = cell.value;
        if (v === null || v === undefined) return;
        // Resolve formula cells to their cached result
        if (typeof v === "object" && "result" in v) {
          cells.push(String((v as { result: unknown }).result ?? ""));
        } else if (v instanceof Date) {
          cells.push(v.toISOString().split("T")[0]!);
        } else {
          cells.push(String(v));
        }
      });
      if (cells.length > 0) rows.push(cells.join("\t"));
    });
    if (rows.length > 0) {
      sections.push(`=== Sheet: ${ws.name} ===\n${rows.join("\n")}`);
    }
  });

  return sections.join("\n\n");
}

// ── Step 3: Claude extraction ─────────────────────────────────────────────────

async function extractWithClaude(dump: string): Promise<FinanceSnapshot> {
  // Truncate if huge — keep first 60k chars which fits in ~20k tokens
  const truncated = dump.length > 60_000 ? dump.slice(0, 60_000) + "\n[truncated]" : dump;

  const msg = await claude.messages.create({
    model:      "claude-haiku-4-5",
    max_tokens: 800,
    messages:   [{
      role:    "user",
      content: `You are a financial data extractor. Below is a raw dump of a spreadsheet workbook.

Extract exactly this JSON — no explanation, no markdown:
{
  "net_worth":  <total net worth as a number, no currency symbol>,
  "currency":   <ISO 4217 code, e.g. "EUR">,
  "as_of":      <date of the data as YYYY-MM-DD, or today if unclear>,
  "categories": [
    { "name": <category label>, "value": <number, positive=asset/income, negative=liability/expense> },
    ...
  ]
}

Rules:
- Avoid double-counting: if subtotals and line items both appear, use only the subtotals.
- Include only meaningful categories (skip empty rows, headers, totals already reflected in net_worth).
- net_worth should equal assets minus liabilities.

Spreadsheet dump:
${truncated}`,
    }],
  });

  const raw  = (msg.content[0] as { type: string; text: string }).text.trim();
  const json = raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
  const data = JSON.parse(json) as Omit<FinanceSnapshot, "fetched_at">;

  return { ...data, fetched_at: new Date().toISOString() };
}

// ── Step 4: persist to Supabase ───────────────────────────────────────────────

async function persist(snapshot: FinanceSnapshot): Promise<void> {
  const supabase = await createAdminClient();
  const today    = localDateKey();

  const { data: existing } = await supabase
    .from("daily_logs")
    .select("id, notes")
    .eq("log_date", today)
    .maybeSingle();

  const row = existing as { id: string; notes: string | null } | null;
  let notes: Record<string, unknown> = {};
  try { notes = JSON.parse(row?.notes ?? "{}") as Record<string, unknown>; } catch { /* ignore */ }
  notes["finance"] = snapshot;

  if (row) {
    await supabase.from("daily_logs")
      .update({ notes: JSON.stringify(notes) } as never)
      .eq("id", row.id);
  } else {
    await supabase.from("daily_logs")
      .insert({ log_date: today, notes: JSON.stringify(notes) } as never);
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const buf      = await downloadXlsx();
    const dump     = await parseXlsx(buf);
    const snapshot = await extractWithClaude(dump);
    await persist(snapshot);
    return NextResponse.json({ ok: true, snapshot });
  } catch (e) {
    console.error("finance snapshot error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Pipeline failed" },
      { status: 500 }
    );
  }
}
