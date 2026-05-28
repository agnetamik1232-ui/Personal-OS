"use client";

import { useState, useEffect, useCallback } from "react";
import { IconCoin }                          from "@/components/ui/Icon";
import type { FinanceGetResponse, FinanceSnapshot, FinanceCategory } from "@/app/api/finance/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(value: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style:                 "currency",
    currency,
    notation:              Math.abs(value) >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 100_000   ? 0         : 2,
  }).format(value);
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

function categoryColor(value: number, idx: number): string {
  if (value < 0) return "#B85C5C";
  const COLORS = ["#2E6B45", "#C99C4A", "#7A8F6B", "#6B7A8F", "#8F6B7A", "#4A7AC9"];
  return COLORS[idx % COLORS.length]!;
}

// ── Category bar chart ────────────────────────────────────────────────────────

function CategoryBars({ categories, currency }: { categories: FinanceCategory[]; currency: string }) {
  const max = Math.max(...categories.map((c) => Math.abs(c.value)), 1);
  return (
    <div className="fin-categories">
      {categories.map((cat, i) => {
        const pct   = Math.min(100, (Math.abs(cat.value) / max) * 100);
        const color = categoryColor(cat.value, i);
        return (
          <div className="fin-cat-row" key={cat.name}>
            <span className="fin-cat-name">{cat.name}</span>
            <div className="fin-cat-bar-wrap">
              <div className="fin-cat-bar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="fin-cat-val" style={{ color }}>
              {cat.value >= 0 ? "" : "–"}{fmt(Math.abs(cat.value), currency)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Empty / error states ──────────────────────────────────────────────────────

function EmptyState({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  return (
    <div className="fin-empty">
      <p className="fin-empty-msg">No snapshot yet. Run a refresh to pull from Google Sheets.</p>
      <button className="fin-refresh-btn" onClick={onRefresh} disabled={refreshing}>
        {refreshing ? <span className="fin-spin">↻</span> : "↻ Fetch now"}
      </button>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function FinanceCard() {
  const [snapshot,   setSnapshot]   = useState<FinanceSnapshot | null>(null);
  const [asOfDate,   setAsOfDate]   = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // ── Load snapshot (NO AI, pure Supabase read) ──
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/finance");
      const json = await res.json() as FinanceGetResponse & { error?: string };
      if (!res.ok) { setError(json.error ?? "Load failed"); return; }
      setSnapshot(json.snapshot);
      setAsOfDate(json.as_of_date);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ── Manual refresh → triggers AI pipeline ──
  async function handleRefresh() {
    // Calls the thin server-side relay which injects CRON_SECRET — secret never touches client
    setRefreshing(true);
    setError(null);
    try {
      const res  = await fetch("/api/finance/refresh", { method: "POST" });
      const json = await res.json() as { snapshot?: FinanceSnapshot; error?: string };
      if (!res.ok) { setError(json.error ?? "Refresh failed"); return; }
      if (json.snapshot) {
        setSnapshot(json.snapshot);
        setAsOfDate(new Date().toISOString().split("T")[0]!);
      }
    } catch {
      setError("Network error");
    } finally {
      setRefreshing(false);
    }
  }

  // ── Render ──
  const currency = snapshot?.currency ?? "EUR";

  return (
    <div className="card">
      <svg className="card-deco" style={{ right: -20, bottom: -20, width: 100, height: 100 }} viewBox="0 0 100 100" aria-hidden>
        <rect x="20" y="20" width="60" height="60" rx="14" fill="rgba(28,26,23,0.03)"/>
      </svg>

      <div className="card-head">
        <div>
          <div className="card-eyebrow"><IconCoin size={12} /> Finance Pulse</div>
          <h3 className="card-title">
            {loading ? "Loading…" : snapshot ? fmt(snapshot.net_worth, currency) : "Net worth"}
          </h3>
        </div>
        {!loading && snapshot && (
          <button
            className={`card-action${refreshing ? " card-action-spin" : ""}`}
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            title="Re-fetch from Google Sheets"
          >
            {refreshing ? "…" : "↻"}
          </button>
        )}
      </div>

      {loading && <div className="fin-loading">Loading snapshot…</div>}
      {error   && <p className="fin-error">⚠ {error}</p>}

      {!loading && !snapshot && !error && (
        <EmptyState onRefresh={() => void handleRefresh()} refreshing={refreshing} />
      )}

      {!loading && snapshot && (
        <>
          <div className="fin-meta">
            <span className="fin-as-of">
              As of {fmtDate(snapshot.as_of)}
              {asOfDate && <span className="fin-fetched"> · fetched {fmtDate(asOfDate)}</span>}
            </span>
          </div>

          {snapshot.categories.length > 0 && (
            <CategoryBars categories={snapshot.categories} currency={currency} />
          )}
        </>
      )}
    </div>
  );
}
