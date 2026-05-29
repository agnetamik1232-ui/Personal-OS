"use client";

import { useState, useEffect }      from "react";
import Link                          from "next/link";
import { IconCoin }                  from "@/components/ui/Icon";
import type { FinanceSnapshot, FinanceCategory } from "@/app/api/finance/route";
import type { NwPoint }              from "@/app/api/finance/history/route";

// ── Sparkline ─────────────────────────────────────────────────────────────────

function NwSparkline({ points }: { points: NwPoint[] }) {
  if (points.length < 2) return null;
  const vals = points.map((p) => p.net_worth);
  const min  = Math.min(...vals);
  const max  = Math.max(...vals);
  const range = max - min || 1;
  const W = 200, H = 40;
  const ptStr = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const last  = points[points.length - 1]!;
  const first = points[0]!;
  const up    = last.net_worth >= first.net_worth;
  const color = up ? "#2E6B45" : "#B85C5C";
  return (
    <div className="fin-sparkline-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        <polyline points={ptStr} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* End dot */}
        {(() => {
          const lx = W;
          const ly = H - ((last.net_worth - min) / range) * (H - 4) - 2;
          return <circle cx={lx} cy={ly} r="3" fill={color} />;
        })()}
      </svg>
    </div>
  );
}

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
  const [history,  setHistory]  = useState<NwPoint[]>([]);

  useEffect(() => {
    void Promise.all([
      fetch("/api/finance").then((r) => r.json() as Promise<{ snapshot: FinanceSnapshot | null }>),
      fetch("/api/finance/history?days=90").then((r) => r.json() as Promise<{ points: NwPoint[] }>),
    ]).then(([fin, hist]) => {
      setSnapshot(fin.snapshot);
      setHistory(hist.points ?? []);
    }).catch(() => { /* silent */ }).finally(() => setLoading(false));
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
                {history.length >= 2 && <NwSparkline points={history} />}
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
