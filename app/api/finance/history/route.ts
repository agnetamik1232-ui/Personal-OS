/**
 * GET /api/finance/history?days=90
 * Returns net-worth history points: { date, net_worth, currency }[]
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient }              from "@/lib/supabase/server";

export interface NwPoint {
  date:      string;
  net_worth: number;
  currency:  string;
}

function ownerUserId(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const days = Math.min(parseInt(request.nextUrl.searchParams.get("days") ?? "90", 10), 365);
  try {
    const supabase = await createAdminClient();
    const userId   = ownerUserId();

    const { data, error } = await supabase
      .from("daily_logs")
      .select("log_date, notes")
      .eq("user_id", userId)
      .order("log_date", { ascending: true })
      .limit(days);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const points: NwPoint[] = [];
    for (const row of data ?? []) {
      try {
        const notes = JSON.parse((row as { notes: string | null }).notes ?? "{}") as Record<string, unknown>;
        const snap  = notes["finance_snapshot"] as { net_worth?: number; currency?: string } | undefined;
        if (snap?.net_worth != null) {
          points.push({
            date:      (row as { log_date: string }).log_date,
            net_worth: snap.net_worth,
            currency:  snap.currency ?? "EUR",
          });
        }
      } catch { /* skip malformed */ }
    }

    return NextResponse.json({ points });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
