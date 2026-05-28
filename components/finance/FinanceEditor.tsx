"use client";

import { useState, useEffect, useCallback } from "react";
import type { FinanceSnapshot, FinanceCategory } from "@/app/api/finance/route";
import { localDateKey } from "@/lib/utils/localDate";

// ── Types & constants ─────────────────────────────────────────────────────────

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "SEK", "NOK", "DKK", "PLN"];

const GROUP_LABELS: Record<FinanceCategory["group"], string> = {
  asset:     "Asset",
  liability: "Liability",
  income:    "Income",
  expense:   "Expense",
  other:     "Other",
};

const GROUP_ORDER: FinanceCategory["group"][] = ["asset", "income", "liability", "expense", "other"];

const GROUP_COLORS: Record<FinanceCategory["group"], string> = {
  asset:     "#2E6B45",
  income:    "#C99C4A",
  liability: "#B85C5C",
  expense:   "#8F6B7A",
  other:     "#6B7A8F",
};

function uid() { return Math.random().toString(36).slice(2, 10); }

function fmt(v: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency", currency,
    maximumFractionDigits: 0,
  }).format(v);
}

// ── Category row editor ───────────────────────────────────────────────────────

interface CatRowProps {
  cat:      FinanceCategory;
  currency: string;
  onChange: (c: FinanceCategory) => void;
  onDelete: (id: string) => void;
}

function CatRow({ cat, currency, onChange, onDelete }: CatRowProps) {
  return (
    <div className="fe-cat-row">
      <select
        className="fe-input fe-select-group"
        value={cat.group}
        onChange={(e) => onChange({ ...cat, group: e.target.value as FinanceCategory["group"] })}
      >
        {GROUP_ORDER.map((g) => (
          <option key={g} value={g}>{GROUP_LABELS[g]}</option>
        ))}
      </select>

      <input
        className="fe-input fe-input-name"
        value={cat.name}
        onChange={(e) => onChange({ ...cat, name: e.target.value })}
        placeholder="e.g. SEB Checking"
      />

      <div className="fe-input-val-wrap">
        <span className="fe-currency-badge">{currency}</span>
        <input
          className="fe-input fe-input-val"
          type="number"
          value={cat.value}
          onChange={(e) => onChange({ ...cat, value: parseFloat(e.target.value) || 0 })}
          placeholder="0"
        />
      </div>

      <button className="fe-del-btn" onClick={() => onDelete(cat.id)} aria-label="Remove">×</button>
    </div>
  );
}

// ── Summary sidebar ───────────────────────────────────────────────────────────

function Summary({ cats, currency }: { cats: FinanceCategory[]; currency: string }) {
  const byGroup = GROUP_ORDER.map((g) => ({
    group:  g,
    label:  GROUP_LABELS[g],
    color:  GROUP_COLORS[g],
    total:  cats.filter((c) => c.group === g).reduce((s, c) => s + c.value, 0),
    count:  cats.filter((c) => c.group === g).length,
  })).filter((g) => g.count > 0);

  const netWorth = cats.reduce((s, c) => s + c.value, 0);
  const maxAbs   = Math.max(...byGroup.map((g) => Math.abs(g.total)), 1);

  return (
    <div className="fe-summary">
      <div className="fe-summary-nw">
        <span className="fe-summary-nw-label">Net worth</span>
        <span className={`fe-summary-nw-val${netWorth < 0 ? " fe-nw-neg" : ""}`}>
          {fmt(netWorth, currency)}
        </span>
      </div>

      <div className="fe-summary-groups">
        {byGroup.map((g) => (
          <div key={g.group} className="fe-summary-group">
            <div className="fe-sg-head">
              <span className="fe-sg-label" style={{ color: g.color }}>{g.label}</span>
              <span className="fe-sg-total">{fmt(g.total, currency)}</span>
            </div>
            <div className="fe-sg-bar-wrap">
              <div
                className="fe-sg-bar-fill"
                style={{
                  width:      `${Math.min(100, (Math.abs(g.total) / maxAbs) * 100)}%`,
                  background: g.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────

export function FinanceEditor() {
  const [cats,     setCats]     = useState<FinanceCategory[]>([]);
  const [currency, setCurrency] = useState("EUR");
  const [asOf,     setAsOf]     = useState(localDateKey());
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // ── Load existing snapshot ──
  useEffect(() => {
    fetch("/api/finance")
      .then((r) => r.json() as Promise<{ snapshot: FinanceSnapshot | null }>)
      .then(({ snapshot }) => {
        if (snapshot) {
          setCats(snapshot.categories);
          setCurrency(snapshot.currency);
          setAsOf(snapshot.as_of);
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  // ── Save ──
  const save = useCallback(async (cats: FinanceCategory[], currency: string, asOf: string) => {
    setSaving(true);
    setSaved(false);
    setError(null);
    const netWorth = cats.reduce((s, c) => s + c.value, 0);
    try {
      const res  = await fetch("/api/finance", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ net_worth: netWorth, currency, as_of: asOf, categories: cats }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setError(json.error ?? "Save failed"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }, []);

  function addCategory(group: FinanceCategory["group"]) {
    setCats((prev) => [...prev, { id: uid(), name: "", value: 0, group }]);
  }

  function updateCat(updated: FinanceCategory) {
    setCats((prev) => prev.map((c) => c.id === updated.id ? updated : c));
  }

  function deleteCat(id: string) {
    setCats((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) return <div className="fe-loading">Loading…</div>;

  // Group cats for display
  const grouped = GROUP_ORDER.map((g) => ({
    group: g,
    label: GROUP_LABELS[g],
    color: GROUP_COLORS[g],
    items: cats.filter((c) => c.group === g),
  }));

  return (
    <div className="fe-layout">
      {/* ── Left: editor ── */}
      <div className="fe-editor">
        {/* Header controls */}
        <div className="fe-editor-head">
          <div className="fe-field-row">
            <label className="fe-label">Currency</label>
            <select
              className="fe-input fe-select-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="fe-field-row">
            <label className="fe-label">As of</label>
            <input
              type="date"
              className="fe-input"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value || localDateKey())}
            />
          </div>
        </div>

        {/* Category groups */}
        {grouped.map(({ group, label, color, items }) => (
          <div key={group} className="fe-group">
            <div className="fe-group-head">
              <span className="fe-group-label" style={{ color }}>{label}s</span>
              <button
                className="fe-add-row-btn"
                onClick={() => addCategory(group)}
                aria-label={`Add ${label}`}
              >+ Add</button>
            </div>

            {items.length === 0 && (
              <p className="fe-group-empty">No {label.toLowerCase()}s yet.</p>
            )}
            {items.map((cat) => (
              <CatRow
                key={cat.id}
                cat={cat}
                currency={currency}
                onChange={updateCat}
                onDelete={deleteCat}
              />
            ))}
          </div>
        ))}

        {/* Footer */}
        {error && <p className="fe-error">⚠ {error}</p>}
        <div className="fe-footer">
          <button
            className="fe-save-btn"
            onClick={() => void save(cats, currency, asOf)}
            disabled={saving}
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save snapshot"}
          </button>
          {cats.length === 0 && (
            <p className="fe-hint">{'Use the "+ Add" buttons above to add your accounts and balances.'}</p>
          )}
        </div>
      </div>

      {/* ── Right: summary ── */}
      <Summary cats={cats} currency={currency} />
    </div>
  );
}
