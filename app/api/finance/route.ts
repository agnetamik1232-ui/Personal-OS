/**
 * GET /api/finance
 *
 * Reads the most recent finance snapshot from daily_logs.notes.finance.
 * NO AI is triggered here — this is a pure Supabase read.
 * Returns { snapshot: FinanceSnapshot | null, as_of_date: string | null }.
 */

import { NextResponse }    from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { FinanceSnapshot, FinanceCategory } from "./snapshot/route";

export type { FinanceSnapshot, FinanceCategory };

export interface FinanceGetResponse {
  snapshot:    FinanceSnapshot | null;
  as_of_date:  string | null;   // the daily_logs.log_date the snapshot came from
}

function ownerUserId(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

type RawRow = { log_date: string; notes: string | null };

export async function GET(): Promise<NextResponse> {
  try {
    const userId   = ownerUserId();
    const supabase = await createAdminClient();

    // Grab the most recent 60 rows; scan for the first that has a finance snapshot
    const { data, error } = await supabase
      .from("daily_logs")
      .select("log_date, notes")
      .eq("user_id", userId)
      .order("log_date", { ascending: false })
      .limit(60);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    for (const raw of ((data ?? []) as RawRow[])) {
      let notes: Record<string, unknown> = {};
      try { notes = JSON.parse(raw.notes ?? "{}") as Record<string, unknown>; } catch { continue; }
      const fin = notes["finance"] as FinanceSnapshot | undefined;
      if (fin?.net_worth != null) {
        return NextResponse.json({
          snapshot:   fin,
          as_of_date: raw.log_date,
        } satisfies FinanceGetResponse);
      }
    }

    return NextResponse.json({ snapshot: null, as_of_date: null } satisfies FinanceGetResponse);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
