"use client";

import { useState, useEffect }      from "react";
import Link                          from "next/link";
import { IconCoin }                  from "@/components/ui/Icon";
import type { FinanceSnapshot, FinanceCategory } from "@/app/api/finance/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style:                 "currency",
    currency,
    notation:              Math.abs(v) >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(v) >= 100_000   ? 0         : 0,
  }).format(v);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Vilnius",
  }).format(new Date(iso + "T12:00:00"));
}

const GROUP_COLORS: Record<FinanceCategory["group"], string> = {
  asset:     "#2E6B45",
  income:    "#C99C4A",
  liability: "#B85C5C",
  expense:   "#8F6B7A",
  other:     "#6B7A8F",
};

// ── Card ─────────────────────────────────────────────────────────────────────

export function FinanceCard() {
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch("/api/finance")
      .then((r) => r.json() as Promise<{ snapshot: FinanceSnapshot | null }>)
      .then(({ snapshot }) => setSnapshot(snapshot))
      .catch(() => { /* silent — show empty state */ })
      .finally(() => setLoading(false));
  }, []);

  const currency = snapshot?.currency ?? "EUR";

  // Group by type for mini bars
  const groups = snapshot ? (["asset", "income", "liability", "expense", "other"] as FinanceCategory["group"][])
    .map((g) => ({
      group: g,
      total: snapshot.categories.filter((c) => c.group === g).reduce((s, c) => s + c.value, 0),
    }))
    .filter((g) => g.total !== 0) : [];

  const maxAbs = Math.max(...groups.map((g) => Math.abs(g.total)), 1);

  return (
    <div className="card">
      <svg className="card-deco" style={{ right: -20, bottom: -20, width: 100, height: 100 }} viewBox="0 0 100 100" aria-hidden>
        <rect x="20" y="20" width="60" height="60" rx="14" fill="rgba(28,26,23,0.03)"/>
      </svg>

      <div className="card-head">
        <div>
          <div className="card-eyebrow"><IconCoin size={12} /> Finance Pulse</div>
          <h3 className="card-title">
            {loading
              ? "Loading…"
              : snapshot
                ? fmt(snapshot.net_worth, currency)
                : "No snapshot yet"}
          </h3>
        </div>
        <Link href="/finance" className="card-action" title="Edit in Finance tab">Edit</Link>
      </div>

      {!loading && snapshot && (
        <>
          <p className="fin-as-of" style={{ marginBottom: 14 }}>
            As of {fmtDate(snapshot.as_of)}
          </p>

          <div className="fin-categories">
            {groups.map(({ group, total }) => (
              <div className="fin-cat-row" key={group}>
                <span className="fin-cat-name" style={{ textTransform: "capitalize" }}>{group}</span>
                <div className="fin-cat-bar-wrap">
                  <div
                    className="fin-cat-bar-fill"
                    style={{
                      width:      `${Math.min(100, (Math.abs(total) / maxAbs) * 100)}%`,
                      background: GROUP_COLORS[group],
                    }}
                  />
                </div>
                <span className="fin-cat-val" style={{ color: GROUP_COLORS[group] }}>
                  {fmt(total, currency)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {!loading && !snapshot && (
        <div className="fin-empty">
          <p className="fin-empty-msg">No data yet.</p>
          <Link href="/finance" className="fin-refresh-btn">Enter data →</Link>
        </div>
      )}
    </div>
  );
}
