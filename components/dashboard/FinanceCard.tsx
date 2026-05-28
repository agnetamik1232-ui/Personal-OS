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
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Vilnius",
  }).format(new Date(iso + "T12:00:00"));
}

const GROUP_META: Record<FinanceCategory["group"], { color: string; label: string }> = {
  asset:     { color: "#2E6B45", label: "Assets"      },
  income:    { color: "#C99C4A", label: "Income"      },
  liability: { color: "#B85C5C", label: "Liabilities" },
  expense:   { color: "#8F6B7A", label: "Expenses"    },
  other:     { color: "#6B7A8F", label: "Other"       },
};

const GROUP_ORDER: FinanceCategory["group"][] = ["asset", "income", "liability", "expense", "other"];

// ── Card ──────────────────────────────────────────────────────────────────────

export function FinanceCard() {
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch("/api/finance")
      .then((r) => r.json() as Promise<{ snapshot: FinanceSnapshot | null }>)
      .then(({ snapshot }) => setSnapshot(snapshot))
      .catch(() => { /* silent */ })
      .finally(() => setLoading(false));
  }, []);

  const currency = snapshot?.currency ?? "EUR";

  const groups = snapshot
    ? GROUP_ORDER
        .map((g) => ({
          group: g,
          ...GROUP_META[g],
          total: snapshot.categories
            .filter((c) => c.group === g)
            .reduce((s, c) => s + c.value, 0),
          items: snapshot.categories.filter((c) => c.group === g),
        }))
        .filter((g) => g.items.length > 0)
    : [];

  const maxAbs = Math.max(...groups.map((g) => Math.abs(g.total)), 1);

  return (
    <div className="card fin-card-large">
      {/* Header */}
      <div className="card-head">
        <div>
          <div className="card-eyebrow"><IconCoin size={12} /> Finance Pulse</div>
        </div>
        <Link href="/finance" className="card-action" title="Edit in Finance tab">Edit</Link>
      </div>

      {/* Big net worth */}
      <div className="fin-nw-block">
        {loading
          ? <span className="fin-nw-loading">Loading…</span>
          : snapshot
            ? <>
                <div className="fin-nw-val">{fmt(snapshot.net_worth, currency)}</div>
                <div className="fin-nw-sub">Net worth · as of {fmtDate(snapshot.as_of)}</div>
              </>
            : <div className="fin-nw-empty">No data yet</div>
        }
      </div>

      {/* Category breakdown */}
      {!loading && snapshot && groups.length > 0 && (
        <div className="fin-breakdown">
          {groups.map(({ group, label, color, total, items }) => (
            <div className="fin-group" key={group}>
              <div className="fin-group-head">
                <span className="fin-group-label" style={{ color }}>{label}</span>
                <span className="fin-group-total">{fmt(total, currency)}</span>
              </div>
              <div className="fin-group-bar-wrap">
                <div
                  className="fin-group-bar-fill"
                  style={{
                    width:      `${Math.min(100, (Math.abs(total) / maxAbs) * 100)}%`,
                    background: color,
                  }}
                />
              </div>
              <div className="fin-items">
                {items.map((item) => (
                  <div className="fin-item" key={item.id}>
                    <span className="fin-item-name">{item.name}</span>
                    <span className="fin-item-val" style={{ color: item.value < 0 ? "#B85C5C" : undefined }}>
                      {fmt(item.value, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !snapshot && (
        <div className="fin-empty">
          <p className="fin-empty-msg">Add your accounts and balances to track net worth.</p>
          <Link href="/finance" className="fin-refresh-btn">Get started →</Link>
        </div>
      )}
    </div>
  );
}
