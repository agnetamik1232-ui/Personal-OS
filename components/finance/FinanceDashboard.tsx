"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { FinSummary } from "@/lib/finance/types";
import type { FinTransaction } from "@/lib/finance/types";
import type { FinAccount } from "@/lib/finance/types";
import type { SavingsGoal } from "@/lib/finance/types";
import type { InventoryItem } from "@/lib/finance/types";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/finance/types";

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(v: number, cur = "EUR"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency", currency: cur, maximumFractionDigits: 0,
  }).format(v);
}

function fmtD(v: number, cur = "EUR"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency", currency: cur, maximumFractionDigits: 2, minimumFractionDigits: 2,
  }).format(v);
}

function fmtDate(key: string): string {
  const d = new Date(key + "T12:00:00Z");
  const today    = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
  const txDay    = new Date(key+"T00:00:00Z");
  if (txDay >= today)     return "Today";
  if (txDay >= yesterday) return "Yesterday";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  }).format(d);
}

function diffBadge(current: number, prev: number, _cur: string) {
  if (prev === 0) return null;
  const diff = current - prev;
  const pct  = Math.abs(diff / prev) * 100;
  const up   = diff >= 0;
  return (
    <span className={`fin2-badge ${up ? "fin2-badge-up" : "fin2-badge-down"}`}>
      {up ? "▲" : "▼"} {pct.toFixed(0)}%
    </span>
  );
}

// ── Overview card ─────────────────────────────────────────────────────────────

function OverviewCard({ label, value, sub, badge, accent }: {
  label: string; value: string; sub?: string; badge?: React.ReactNode; accent?: string;
}) {
  return (
    <div className="fin2-ov-card" style={accent ? { borderTop: `3px solid ${accent}` } : {}}>
      <div className="fin2-ov-label">{label}</div>
      <div className="fin2-ov-value">{value}</div>
      {(sub || badge) && (
        <div className="fin2-ov-sub">
          {badge}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </div>
  );
}

// ── Add Transaction Modal ─────────────────────────────────────────────────────

function TxModal({ accounts, onSave, onClose, initial }: {
  accounts:  FinAccount[];
  onSave:    (tx: FinTransaction) => void;
  onClose:   () => void;
  initial?:  FinTransaction;
}) {
  const today = new Date().toISOString().split("T")[0]!;
  const [type,      setType]      = useState<"income"|"expense"|"transfer">(initial?.type ?? "expense");
  const [date,      setDate]      = useState(initial?.date ?? today);
  const [amount,    setAmount]    = useState(initial?.amount?.toString() ?? "");
  const [category,  setCategory]  = useState(initial?.category ?? "");
  const [accountId, setAccountId] = useState(initial?.account_id ?? accounts[0]?.id ?? "");
  const [toAccId,   setToAccId]   = useState(initial?.to_account_id ?? "");
  const [note,      setNote]      = useState(initial?.note ?? "");
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState<string|null>(null);

  const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { setErr("Enter a valid amount"); return; }
    if (!accountId) { setErr("Select an account"); return; }
    setSaving(true); setErr(null);
    const body = {
      date, type, category: category || cats[0], account_id: accountId,
      to_account_id: type === "transfer" ? toAccId : null,
      amount: parseFloat(amount), note: note || null,
    };
    try {
      const url    = initial ? `/api/finance/transactions?id=${initial.id}` : "/api/finance/transactions";
      const method = initial ? "PATCH" : "POST";
      const r      = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const j = await r.json() as { transaction?: FinTransaction; error?: string };
      if (j.error) { setErr(j.error); return; }
      if (j.transaction) onSave(j.transaction);
    } catch (ex) { setErr(String(ex)); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box fin2-tx-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">{initial ? "Edit" : "Add"} transaction</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={(e) => void submit(e)} className="fin2-tx-form">
          {/* Type tabs */}
          <div className="fin2-type-tabs">
            {(["expense","income","transfer"] as const).map((t) => (
              <button key={t} type="button"
                className={`fin2-type-tab fin2-type-tab-${t}${type===t?" active":""}`}
                onClick={() => { setType(t); setCategory(""); }}
              >{t.charAt(0).toUpperCase()+t.slice(1)}</button>
            ))}
          </div>

          <div className="fin2-tx-grid">
            <label className="fin2-field">
              <span>Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="fin2-input" />
            </label>
            <label className="fin2-field">
              <span>Amount (€)</span>
              <input type="number" step="0.01" min="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)} className="fin2-input fin2-input-amount"
                placeholder="0.00" autoFocus />
            </label>
            <label className="fin2-field">
              <span>Account</span>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="fin2-input">
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
            {type === "transfer" && (
              <label className="fin2-field">
                <span>To account</span>
                <select value={toAccId} onChange={(e) => setToAccId(e.target.value)} className="fin2-input">
                  <option value="">— select —</option>
                  {accounts.filter((a) => a.id !== accountId).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="fin2-field">
              <span>Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="fin2-input">
                <option value="">— select —</option>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="fin2-field fin2-field-full">
              <span>Note</span>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                className="fin2-input" placeholder="Lidl, Netflix, Salary…" />
            </label>
          </div>

          {err && <p className="fin2-err">{err}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : initial ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Account Modal ─────────────────────────────────────────────────────────

const ACCT_TYPES = [
  { value: "cash",        label: "💵 Cash",           is_liability: false },
  { value: "bank",        label: "🏦 Bank Account",   is_liability: false },
  { value: "savings",     label: "💰 Savings Account", is_liability: false },
  { value: "investment",  label: "📈 Investments",    is_liability: false },
  { value: "credit_card", label: "💳 Credit Card",    is_liability: true  },
  { value: "other",       label: "📁 Other",          is_liability: false },
];
const ACCT_COLORS = ["#2E6B45","#C99C4A","#7A6BDE","#B85C5C","#3A7DBE","#6B7A8F","#D4822A"];

function AccountModal({ onSave, onClose }: { onSave: (a: FinAccount) => void; onClose: () => void }) {
  const [name,    setName]    = useState("");
  const [type,    setType]    = useState("bank");
  const [initial, setInitial] = useState("0");
  const [color,   setColor]   = useState(ACCT_COLORS[0]!);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState<string|null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("Name required"); return; }
    setSaving(true); setErr(null);
    const meta = ACCT_TYPES.find((t) => t.value === type);
    try {
      const r = await fetch("/api/finance/accounts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), type, initial_balance: parseFloat(initial)||0,
          color, is_liability: meta?.is_liability ?? false,
        }),
      });
      const j = await r.json() as { account?: FinAccount; error?: string };
      if (j.error) { setErr(j.error); return; }
      if (j.account) onSave(j.account);
    } catch (ex) { setErr(String(ex)); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">New account</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={(e) => void submit(e)} className="fin2-tx-form">
          <div className="fin2-tx-grid">
            <label className="fin2-field fin2-field-full">
              <span>Account name</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="fin2-input" placeholder="Revolut, SEB, Piggy…" autoFocus />
            </label>
            <label className="fin2-field">
              <span>Type</span>
              <select value={type} onChange={(e) => setType(e.target.value)} className="fin2-input">
                {ACCT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="fin2-field">
              <span>Opening balance (€)</span>
              <input type="number" step="0.01" value={initial}
                onChange={(e) => setInitial(e.target.value)} className="fin2-input" />
            </label>
            <div className="fin2-field fin2-field-full">
              <span className="fin2-field-label">Colour</span>
              <div className="fin2-color-row">
                {ACCT_COLORS.map((c) => (
                  <button key={c} type="button"
                    className={`fin2-color-swatch${color===c?" active":""}`}
                    style={{ background: c }} onClick={() => setColor(c)} />
                ))}
              </div>
            </div>
          </div>
          {err && <p className="fin2-err">{err}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Savings Goal Modal ────────────────────────────────────────────────────────

const GOAL_EMOJIS = ["🐷","🏖️","🎮","🚗","🏠","✈️","💍","📱","🎓","🌱"];
const GOAL_COLORS = ["#2E6B45","#7A6BDE","#C99C4A","#B85C5C","#3A7DBE","#D4822A"];

function GoalModal({ onSave, onClose, initial }: {
  onSave: (g: SavingsGoal) => void; onClose: () => void; initial?: SavingsGoal;
}) {
  const [name,    setName]    = useState(initial?.name ?? "");
  const [target,  setTarget]  = useState(initial?.target_amount?.toString() ?? "");
  const [current, setCurrent] = useState(initial?.current_amount?.toString() ?? "0");
  const [emoji,   setEmoji]   = useState(initial?.emoji ?? "🐷");
  const [color,   setColor]   = useState(initial?.color ?? "#2E6B45");
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState<string|null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !target) { setErr("Name and target required"); return; }
    setSaving(true); setErr(null);
    const body = {
      name: name.trim(), target_amount: parseFloat(target), current_amount: parseFloat(current)||0,
      emoji, color,
    };
    try {
      const url    = initial ? `/api/finance/savings-goals?id=${initial.id}` : "/api/finance/savings-goals";
      const method = initial ? "PATCH" : "POST";
      const r      = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const j = await r.json() as { goal?: SavingsGoal; error?: string };
      if (j.error) { setErr(j.error); return; }
      if (j.goal) onSave(j.goal);
    } catch (ex) { setErr(String(ex)); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">{initial ? "Edit" : "New"} savings goal</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={(e) => void submit(e)} className="fin2-tx-form">
          <div className="fin2-tx-grid">
            <label className="fin2-field fin2-field-full">
              <span>Goal name</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="fin2-input" placeholder="Emergency Fund, Vacation…" autoFocus />
            </label>
            <label className="fin2-field">
              <span>Target (€)</span>
              <input type="number" step="1" min="1" value={target}
                onChange={(e) => setTarget(e.target.value)} className="fin2-input" placeholder="3000" />
            </label>
            <label className="fin2-field">
              <span>Current saved (€)</span>
              <input type="number" step="0.01" min="0" value={current}
                onChange={(e) => setCurrent(e.target.value)} className="fin2-input" placeholder="0" />
            </label>
            <div className="fin2-field fin2-field-full">
              <span className="fin2-field-label">Emoji</span>
              <div className="fin2-emoji-row">
                {GOAL_EMOJIS.map((em) => (
                  <button key={em} type="button"
                    className={`fin2-emoji-btn${emoji===em?" active":""}`}
                    onClick={() => setEmoji(em)}>{em}</button>
                ))}
              </div>
            </div>
            <div className="fin2-field fin2-field-full">
              <span className="fin2-field-label">Colour</span>
              <div className="fin2-color-row">
                {GOAL_COLORS.map((c) => (
                  <button key={c} type="button"
                    className={`fin2-color-swatch${color===c?" active":""}`}
                    style={{ background: c }} onClick={() => setColor(c)} />
                ))}
              </div>
            </div>
          </div>
          {err && <p className="fin2-err">{err}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : initial ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Inventory Modal ───────────────────────────────────────────────────────────

function InventoryModal({ onSave, onClose, initial }: {
  onSave: (i: InventoryItem) => void; onClose: () => void; initial?: InventoryItem;
}) {
  const today = new Date().toISOString().split("T")[0]!;
  const [name,     setName]    = useState(initial?.name ?? "");
  const [buyPrice, setBuy]     = useState(initial?.purchase_price?.toString() ?? "");
  const [sellExp,  setSellExp] = useState(initial?.expected_sale_price?.toString() ?? "");
  const [sellAct,  setSellAct] = useState(initial?.actual_sale_price?.toString() ?? "");
  const [status,   setStatus]  = useState<"active"|"listed"|"sold">(initial?.status ?? "active");
  const [boughtAt, setBoughtAt]= useState(initial?.purchased_at ?? today);
  const [soldAt,   setSoldAt]  = useState(initial?.sold_at ?? "");
  const [note,     setNote]    = useState(initial?.note ?? "");
  const [saving,   setSaving]  = useState(false);
  const [err,      setErr]     = useState<string|null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("Name required"); return; }
    setSaving(true); setErr(null);
    const body = {
      name: name.trim(), purchase_price: parseFloat(buyPrice)||0,
      expected_sale_price: parseFloat(sellExp)||0,
      actual_sale_price: sellAct ? parseFloat(sellAct) : null,
      status, purchased_at: boughtAt,
      sold_at: soldAt || null, note: note || null,
    };
    try {
      const url    = initial ? `/api/finance/inventory?id=${initial.id}` : "/api/finance/inventory";
      const method = initial ? "PATCH" : "POST";
      const r      = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const j = await r.json() as { item?: InventoryItem; error?: string };
      if (j.error) { setErr(j.error); return; }
      if (j.item) onSave(j.item);
    } catch (ex) { setErr(String(ex)); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">{initial ? "Edit" : "Add"} inventory item</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={(e) => void submit(e)} className="fin2-tx-form">
          <div className="fin2-tx-grid">
            <label className="fin2-field fin2-field-full">
              <span>Item name</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="fin2-input" placeholder="Nintendo Switch, Sneakers…" autoFocus />
            </label>
            <label className="fin2-field">
              <span>Purchase price (€)</span>
              <input type="number" step="0.01" value={buyPrice}
                onChange={(e) => setBuy(e.target.value)} className="fin2-input" />
            </label>
            <label className="fin2-field">
              <span>Expected sale (€)</span>
              <input type="number" step="0.01" value={sellExp}
                onChange={(e) => setSellExp(e.target.value)} className="fin2-input" />
            </label>
            <label className="fin2-field">
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as "active"|"listed"|"sold")} className="fin2-input">
                <option value="active">Active</option>
                <option value="listed">Listed</option>
                <option value="sold">Sold</option>
              </select>
            </label>
            <label className="fin2-field">
              <span>Purchased on</span>
              <input type="date" value={boughtAt} onChange={(e) => setBoughtAt(e.target.value)} className="fin2-input" />
            </label>
            {status === "sold" && (
              <>
                <label className="fin2-field">
                  <span>Actual sale (€)</span>
                  <input type="number" step="0.01" value={sellAct}
                    onChange={(e) => setSellAct(e.target.value)} className="fin2-input" />
                </label>
                <label className="fin2-field">
                  <span>Sold on</span>
                  <input type="date" value={soldAt} onChange={(e) => setSoldAt(e.target.value)} className="fin2-input" />
                </label>
              </>
            )}
            <label className="fin2-field fin2-field-full">
              <span>Note</span>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="fin2-input" />
            </label>
          </div>
          {err && <p className="fin2-err">{err}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : initial ? "Update" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Spending pie chart (SVG) ──────────────────────────────────────────────────

function SpendingPie({ txs, currency }: { txs: FinTransaction[]; currency: string }) {
  const expenses = txs.filter((t) => t.type === "expense");
  const catMap   = new Map<string, number>();
  for (const tx of expenses) {
    catMap.set(tx.category, (catMap.get(tx.category) ?? 0) + tx.amount);
  }
  const total = [...catMap.values()].reduce((s, v) => s + v, 0);
  if (total === 0) return <p className="fin2-empty-sub">No expenses this month.</p>;

  const sorted = [...catMap.entries()].sort((a, b) => b[1] - a[1]);
  const CAT_COLORS = [
    "#B85C5C","#C99C4A","#2E6B45","#7A6BDE","#3A7DBE","#D4822A","#8F6B7A",
    "#6B8F7A","#9C7A2E","#5C7AB8",
  ];

  // Build pie slices
  let angle = -Math.PI / 2;
  const R = 70, cx = 90, cy = 90;
  const slices = sorted.map(([ cat, val ], i) => {
    const sweep = (val / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(angle);
    const y1 = cy + R * Math.sin(angle);
    angle += sweep;
    const x2 = cx + R * Math.cos(angle);
    const y2 = cy + R * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    return {
      cat, val, color: CAT_COLORS[i % CAT_COLORS.length]!,
      d: `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`,
    };
  });

  return (
    <div className="fin2-pie-wrap">
      <svg viewBox="0 0 180 180" width="180" height="180">
        {slices.map((s) => <path key={s.cat} d={s.d} fill={s.color} />)}
        <circle cx={cx} cy={cy} r="38" fill="var(--surface-hex,#fff)" />
        <text x={cx} y={cy-6}  textAnchor="middle" fontSize="11" fill="rgba(28,26,23,0.5)">Total</text>
        <text x={cx} y={cy+10} textAnchor="middle" fontSize="13" fontWeight="700" fill="rgba(28,26,23,0.85)">
          {fmt(total, currency)}
        </text>
      </svg>
      <div className="fin2-pie-legend">
        {slices.map((s) => (
          <div key={s.cat} className="fin2-pie-legend-row">
            <span className="fin2-pie-dot" style={{ background: s.color }} />
            <span className="fin2-pie-cat">{s.cat}</span>
            <span className="fin2-pie-val">{fmt(s.val, currency)}</span>
            <span className="fin2-pie-pct">{((s.val/total)*100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

type Modal =
  | { type: "tx";    initial?: FinTransaction }
  | { type: "account" }
  | { type: "goal";  initial?: SavingsGoal }
  | { type: "inv";   initial?: InventoryItem }
  | { type: "delete-tx"; tx: FinTransaction }
  | null;

type Tab = "overview" | "transactions" | "inventory";

export function FinanceDashboard() {
  const [summary,    setSummary]    = useState<FinSummary | null>(null);
  const [accounts,   setAccounts]   = useState<FinAccount[]>([]);
  const [txs,        setTxs]        = useState<FinTransaction[]>([]);
  const [goals,      setGoals]      = useState<SavingsGoal[]>([]);
  const [inventory,  setInventory]  = useState<InventoryItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState<Modal>(null);
  const [tab,        setTab]        = useState<Tab>("overview");
  const [search,     setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [undoTx,     setUndoTx]     = useState<FinTransaction | null>(null);
  const undoTimer                   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currency = summary?.currency ?? "EUR";

  const load = useCallback(async () => {
    setLoading(true);
    const [sumRes, accsRes, txsRes, goalsRes, invRes] = await Promise.all([
      fetch("/api/finance/summary").then((r) => r.json() as Promise<{ summary: FinSummary }>),
      fetch("/api/finance/accounts").then((r) => r.json() as Promise<{ accounts: FinAccount[] }>),
      fetch("/api/finance/transactions?days=90").then((r) => r.json() as Promise<{ transactions: FinTransaction[] }>),
      fetch("/api/finance/savings-goals").then((r) => r.json() as Promise<{ goals: SavingsGoal[] }>),
      fetch("/api/finance/inventory").then((r) => r.json() as Promise<{ items: InventoryItem[] }>),
    ]);
    setSummary(sumRes.summary ?? null);
    setAccounts(accsRes.accounts ?? []);
    setTxs(txsRes.transactions ?? []);
    setGoals(goalsRes.goals ?? []);
    setInventory(invRes.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Filter this-month txs for spending pie
  const thisMonthStart = new Date(); thisMonthStart.setDate(1);
  const thisMonthKey   = thisMonthStart.toISOString().split("T")[0]!;
  const thisMonthTxs   = txs.filter((t) => t.date >= thisMonthKey);

  // Filtered tx list
  const filtered = txs.filter((t) => {
    if (typeFilter && t.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (t.note?.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.account_name?.toLowerCase().includes(q));
    }
    return true;
  });

  // Group by date
  const grouped: { date: string; label: string; txs: FinTransaction[] }[] = [];
  for (const tx of filtered) {
    const last = grouped[grouped.length - 1];
    if (last && last.date === tx.date) { last.txs.push(tx); }
    else { grouped.push({ date: tx.date, label: fmtDate(tx.date), txs: [tx] }); }
  }

  async function deleteTx(tx: FinTransaction) {
    const r = await fetch(`/api/finance/transactions?id=${tx.id}`, { method: "DELETE" });
    const j = await r.json() as { ok?: boolean; deleted?: FinTransaction };
    if (j.ok) {
      setTxs((prev) => prev.filter((t) => t.id !== tx.id));
      setSummary(null); void load(); // recalc
      setUndoTx(j.deleted ?? tx);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setUndoTx(null), 6000);
    }
    setModal(null);
  }

  async function undoDelete() {
    if (!undoTx) return;
    const r = await fetch("/api/finance/transactions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: undoTx.date, type: undoTx.type, category: undoTx.category,
        account_id: undoTx.account_id, to_account_id: undoTx.to_account_id,
        amount: undoTx.amount, note: undoTx.note,
      }),
    });
    const j = await r.json() as { transaction?: FinTransaction };
    if (j.transaction) {
      setUndoTx(null);
      void load();
    }
  }

  if (loading && !summary) {
    return (
      <div className="fin2-page">
        <div className="fin2-loading">
          <div className="fin2-loading-spinner" />
          <p>Loading your finances…</p>
          {accounts.length === 0 && !loading && (
            <p className="fin2-empty-sub">No accounts yet — click + Account to get started.</p>
          )}
        </div>
      </div>
    );
  }

  const noData = accounts.length === 0;

  return (
    <div className="fin2-page">
      {/* ── Header ── */}
      <div className="fin2-header">
        <div>
          <p className="fin2-eyebrow">Finance</p>
          <h1 className="fin2-title">Dashboard</h1>
        </div>
        <div className="fin2-header-actions">
          <button className="fin2-btn-secondary" onClick={() => setModal({ type: "account" })}>+ Account</button>
          <button className="btn-primary" onClick={() => setModal({ type: "tx" })}>+ Transaction</button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="fin2-tabs">
        {(["overview","transactions","inventory"] as Tab[]).map((t) => (
          <button key={t} className={`fin2-tab${tab===t?" fin2-tab-active":""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
      {tab === "overview" && (
        <>
          {/* Overview cards */}
          {summary && (
            <div className="fin2-ov-grid">
              <OverviewCard label="Net Worth" value={fmt(summary.net_worth, currency)} accent="#2E6B45"
                badge={diffBadge(summary.monthly_savings, summary.prev_month_income - summary.prev_month_expenses, currency)}
                sub="all accounts combined"
              />
              <OverviewCard label="Cash Available" value={fmt(summary.cash_available, currency)} accent="#3A7DBE"
                sub="liquid accounts"
              />
              <OverviewCard label="Monthly Savings" value={fmt(summary.monthly_savings, currency)}
                accent={summary.monthly_savings >= 0 ? "#2E6B45" : "#B85C5C"}
                badge={diffBadge(summary.monthly_savings, summary.prev_month_income - summary.prev_month_expenses, currency)}
                sub="income − expenses"
              />
              <OverviewCard label="Monthly Expenses" value={fmt(summary.monthly_expenses, currency)} accent="#B85C5C"
                badge={diffBadge(summary.monthly_expenses, summary.prev_month_expenses, currency)}
                sub="this month"
              />
              <OverviewCard label="Inventory Value" value={fmt(summary.inventory_value, currency)} accent="#C99C4A"
                sub={`${fmt(summary.potential_profit, currency)} potential profit`}
              />
              <OverviewCard label="Expected Profit" value={fmt(summary.potential_profit + summary.realized_profit_month, currency)} accent="#7A6BDE"
                sub={`${fmt(summary.realized_profit_month, currency)} realized this month`}
              />
            </div>
          )}

          {noData && (
            <div className="fin2-empty-state">
              <div className="fin2-empty-icon">💰</div>
              <h2>Set up your finances</h2>
              <p>Start by creating your accounts (cash, bank, credit card…), then log transactions.</p>
              <div className="fin2-empty-actions">
                <button className="btn-primary" onClick={() => setModal({ type: "account" })}>+ Add first account</button>
              </div>
            </div>
          )}

          {/* Accounts */}
          {!noData && (
            <div className="fin2-section">
              <div className="fin2-section-head">
                <h2 className="fin2-section-title">Accounts</h2>
              </div>
              <div className="fin2-accounts-grid">
                {(summary?.accounts ?? []).map((acc) => (
                  <div key={acc.id} className="fin2-account-card" style={{ borderLeftColor: acc.color ?? "#2E6B45" }}>
                    <div className="fin2-account-name">{acc.name}</div>
                    <div className="fin2-account-type">{ACCT_TYPES.find((t) => t.value === acc.type)?.label ?? acc.type}</div>
                    <div className={`fin2-account-bal ${acc.balance < 0 ? "fin2-neg" : ""}`}>
                      {fmtD(acc.balance, acc.currency)}
                    </div>
                    <div className={`fin2-account-change ${acc.monthly_change >= 0 ? "fin2-pos" : "fin2-neg"}`}>
                      {acc.monthly_change >= 0 ? "+" : ""}{fmtD(acc.monthly_change, acc.currency)} this month
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Savings Goals */}
          <div className="fin2-section">
            <div className="fin2-section-head">
              <h2 className="fin2-section-title">Savings Goals</h2>
              <button className="fin2-btn-ghost-sm" onClick={() => setModal({ type: "goal" })}>+ Goal</button>
            </div>
            {goals.length === 0 ? (
              <div className="fin2-goals-empty">
                <span className="fin2-goals-empty-icon">🐷</span>
                <p>No savings goals yet.</p>
                <button className="fin2-btn-secondary" onClick={() => setModal({ type: "goal" })}>Create first goal</button>
              </div>
            ) : (
              <div className="fin2-goals-grid">
                {goals.map((g) => {
                  const pct = Math.min(100, g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0);
                  const remaining  = g.target_amount - g.current_amount;
                  return (
                    <div key={g.id} className="fin2-goal-card" onClick={() => setModal({ type: "goal", initial: g })}>
                      <div className="fin2-goal-top">
                        <span className="fin2-goal-emoji">{g.emoji}</span>
                        <div className="fin2-goal-info">
                          <div className="fin2-goal-name">{g.name}</div>
                          <div className="fin2-goal-amounts">
                            <span className="fin2-goal-current" style={{ color: g.color }}>{fmtD(g.current_amount, g.currency)}</span>
                            <span className="fin2-goal-sep"> / </span>
                            <span className="fin2-goal-target">{fmtD(g.target_amount, g.currency)}</span>
                          </div>
                        </div>
                        <span className="fin2-goal-pct" style={{ color: g.color }}>{Math.round(pct)}%</span>
                      </div>
                      <div className="fin2-goal-bar-wrap">
                        <div className="fin2-goal-bar-fill" style={{ width: `${pct}%`, background: g.color }} />
                      </div>
                      <div className="fin2-goal-footer">
                        <span>{fmtD(remaining, g.currency)} to go</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Spending breakdown */}
          {thisMonthTxs.length > 0 && (
            <div className="fin2-section">
              <div className="fin2-section-head">
                <h2 className="fin2-section-title">Spending this month</h2>
              </div>
              <SpendingPie txs={thisMonthTxs} currency={currency} />
            </div>
          )}

          {/* Recent transactions (preview) */}
          {txs.length > 0 && (
            <div className="fin2-section">
              <div className="fin2-section-head">
                <h2 className="fin2-section-title">Recent transactions</h2>
                <button className="fin2-btn-ghost-sm" onClick={() => setTab("transactions")}>See all →</button>
              </div>
              <TxFeed
                grouped={grouped.slice(0, 3)}
                currency={currency}
                onEdit={(tx) => setModal({ type: "tx", initial: tx })}
                onDelete={(tx) => setModal({ type: "delete-tx", tx })}
              />
            </div>
          )}
        </>
      )}

      {/* ═══════════════ TRANSACTIONS TAB ═══════════════ */}
      {tab === "transactions" && (
        <div className="fin2-section">
          <div className="fin2-tx-toolbar">
            <input className="fin2-search" placeholder="Search transactions…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="fin2-filter-sel" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
            <button className="btn-primary" onClick={() => setModal({ type: "tx" })}>+ Add</button>
          </div>

          {filtered.length === 0 ? (
            <div className="fin2-empty-state">
              <div className="fin2-empty-icon">📋</div>
              <p>{accounts.length === 0 ? "Create an account first." : "No transactions yet."}</p>
            </div>
          ) : (
            <TxFeed
              grouped={grouped}
              currency={currency}
              onEdit={(tx) => setModal({ type: "tx", initial: tx })}
              onDelete={(tx) => setModal({ type: "delete-tx", tx })}
            />
          )}
        </div>
      )}

      {/* ═══════════════ INVENTORY TAB ═══════════════ */}
      {tab === "inventory" && (
        <div className="fin2-section">
          <div className="fin2-section-head">
            <h2 className="fin2-section-title">Inventory</h2>
            <button className="btn-primary" onClick={() => setModal({ type: "inv" })}>+ Item</button>
          </div>

          {/* Stats */}
          {inventory.length > 0 && summary && (
            <div className="fin2-inv-stats">
              <div className="fin2-inv-stat">
                <div className="fin2-inv-stat-val">{fmt(summary.inventory_value, currency)}</div>
                <div className="fin2-inv-stat-label">Inventory value</div>
              </div>
              <div className="fin2-inv-stat">
                <div className="fin2-inv-stat-val fin2-pos">{fmt(summary.potential_profit, currency)}</div>
                <div className="fin2-inv-stat-label">Potential profit</div>
              </div>
              <div className="fin2-inv-stat">
                <div className="fin2-inv-stat-val fin2-pos">{fmt(summary.realized_profit_month, currency)}</div>
                <div className="fin2-inv-stat-label">Realized this month</div>
              </div>
            </div>
          )}

          {inventory.length === 0 ? (
            <div className="fin2-empty-state">
              <div className="fin2-empty-icon">📦</div>
              <h2>No inventory items</h2>
              <p>Track items you bought to resell. Add purchase price, expected sale price, and update status when sold.</p>
              <button className="btn-primary" onClick={() => setModal({ type: "inv" })}>+ Add first item</button>
            </div>
          ) : (
            <div className="fin2-inv-table">
              <div className="fin2-inv-head">
                <span>Item</span>
                <span className="fin2-col-r">Bought</span>
                <span className="fin2-col-r">Expected</span>
                <span className="fin2-col-r">Profit</span>
                <span>Status</span>
                <span />
              </div>
              {inventory.map((item) => (
                <div key={item.id} className="fin2-inv-row" onClick={() => setModal({ type: "inv", initial: item })}>
                  <span className="fin2-inv-name">{item.name}</span>
                  <span className="fin2-col-r">{fmtD(item.purchase_price, currency)}</span>
                  <span className="fin2-col-r">{fmtD(item.expected_sale_price, currency)}</span>
                  <span className={`fin2-col-r ${(item.potential_profit ?? 0) >= 0 ? "fin2-pos" : "fin2-neg"}`}>
                    {fmtD(item.potential_profit ?? 0, currency)}
                  </span>
                  <span>
                    <span className={`fin2-inv-badge fin2-inv-badge-${item.status}`}>{item.status}</span>
                  </span>
                  <span />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Undo toast ── */}
      {undoTx && (
        <div className="fin2-undo-toast">
          Transaction deleted.{" "}
          <button className="fin2-undo-btn" onClick={() => void undoDelete()}>Undo</button>
        </div>
      )}

      {/* ── Modals ── */}
      {modal?.type === "tx" && modal.initial && (
        <TxModal accounts={accounts} initial={modal.initial}
          onSave={() => { setModal(null); void load(); }} onClose={() => setModal(null)} />
      )}
      {modal?.type === "tx" && !modal.initial && (
        <TxModal accounts={accounts}
          onSave={() => { setModal(null); void load(); }} onClose={() => setModal(null)} />
      )}
      {modal?.type === "account" && (
        <AccountModal
          onSave={() => { setModal(null); void load(); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "goal" && modal.initial && (
        <GoalModal initial={modal.initial}
          onSave={() => { setModal(null); void load(); }} onClose={() => setModal(null)} />
      )}
      {modal?.type === "goal" && !modal.initial && (
        <GoalModal
          onSave={() => { setModal(null); void load(); }} onClose={() => setModal(null)} />
      )}
      {modal?.type === "inv" && modal.initial && (
        <InventoryModal initial={modal.initial}
          onSave={() => { setModal(null); void load(); }} onClose={() => setModal(null)} />
      )}
      {modal?.type === "inv" && !modal.initial && (
        <InventoryModal
          onSave={() => { setModal(null); void load(); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "delete-tx" && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal-box fin2-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <p className="fin2-confirm-text">
              Delete <strong>{modal.tx.note || modal.tx.category}</strong> ({fmtD(modal.tx.amount, currency)})?
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="fin2-btn-danger" onClick={() => void deleteTx(modal.tx)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Transaction feed sub-component ───────────────────────────────────────────

function TxFeed({ grouped, currency, onEdit, onDelete }: {
  grouped:  { date: string; label: string; txs: FinTransaction[] }[];
  currency: string;
  onEdit:   (tx: FinTransaction) => void;
  onDelete: (tx: FinTransaction) => void;
}) {
  return (
    <div className="fin2-tx-feed">
      {grouped.map(({ label, txs }) => (
        <div key={label} className="fin2-tx-group">
          <div className="fin2-tx-date-label">{label}</div>
          {txs.map((tx) => (
            <div key={tx.id} className="fin2-tx-row">
              <div className={`fin2-tx-type-dot fin2-tx-dot-${tx.type}`} />
              <div className="fin2-tx-info">
                <div className="fin2-tx-note">{tx.note || tx.category}</div>
                <div className="fin2-tx-meta">{tx.category} · {tx.account_name}</div>
              </div>
              <div className={`fin2-tx-amount ${tx.type === "income" ? "fin2-pos" : tx.type === "expense" ? "fin2-neg" : ""}`}>
                {tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "⇄"}{fmtD(tx.amount, currency)}
              </div>
              <div className="fin2-tx-actions">
                <button className="fin2-tx-action-btn" onClick={() => onEdit(tx)} title="Edit">✎</button>
                <button className="fin2-tx-action-btn fin2-tx-action-del" onClick={() => onDelete(tx)} title="Delete">✕</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
