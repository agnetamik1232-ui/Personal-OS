"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp, TrendingDown, Plus, X, Search, Pencil, Trash2,
  Target, Wallet, CreditCard, BarChart2, Calendar, Repeat as RepeatIcon,
  Package, CheckCircle, AlertCircle, Info, XCircle, LayoutGrid, ListOrdered,
} from "lucide-react";
import {
  type FinSummary, type FinTransaction, type FinAccount, type SavingsGoal,
  type InventoryItem, type FinBudget, type FinRecurring, type AccountType,
  type TxType, type InventoryStatus, type RecurringFrequency, type FinInsight,
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, ALL_CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS,
} from "@/lib/finance/types";

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, currency = "€"): string {
  const sign = n < 0 ? "-" : "";
  return sign + currency + Math.abs(n).toLocaleString("en-IE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(d: string): string {
  const dt = new Date(d + "T12:00:00Z");
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(dt);
}

function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

function isToday(d: string): boolean {
  const t = startOfDay(new Date());
  const dd = startOfDay(new Date(d + "T00:00:00"));
  return t.getTime() === dd.getTime();
}
function isYesterday(d: string): boolean {
  const y = startOfDay(new Date()); y.setDate(y.getDate() - 1);
  const dd = startOfDay(new Date(d + "T00:00:00"));
  return y.getTime() === dd.getTime();
}
function dateLabel(d: string): string {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return fmtDate(d);
}

function diffPct(current: number, prev: number): { pct: number; up: boolean } | null {
  if (prev === 0) return null;
  const diff = current - prev;
  return { pct: Math.abs(diff / prev) * 100, up: diff >= 0 };
}

function getCatIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? "📦";
}
function getCatColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#6b7280";
}

function healthColor(score: number): string {
  if (score < 40) return "#dc2626";
  if (score < 70) return "#d97706";
  return "#16a34a";
}

function progressClass(pct: number): string {
  if (pct >= 90) return "fin3-progress-red";
  if (pct >= 70) return "fin3-progress-amber";
  return "fin3-progress-green";
}

const FREQUENCIES: RecurringFrequency[] = ["daily", "weekly", "monthly", "quarterly", "yearly"];
const ACCOUNT_TYPES: AccountType[] = ["cash", "bank", "savings", "credit_card", "investment", "other"];
const INV_STATUSES: InventoryStatus[] = ["active", "listed", "sold"];

type NwPoint = { date: string; net_worth: number };
type TabKey = "overview" | "transactions" | "savings" | "budgets" | "recurring" | "analytics" | "accounts" | "inventory";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview",     label: "Overview",     icon: <LayoutGrid size={15} /> },
  { key: "transactions", label: "Transactions", icon: <ListOrdered size={15} /> },
  { key: "savings",      label: "Savings",      icon: <Target size={15} /> },
  { key: "budgets",      label: "Budgets",      icon: <Wallet size={15} /> },
  { key: "recurring",    label: "Recurring",    icon: <RepeatIcon size={15} /> },
  { key: "analytics",    label: "Analytics",    icon: <BarChart2 size={15} /> },
  { key: "accounts",     label: "Accounts",     icon: <CreditCard size={15} /> },
  { key: "inventory",    label: "Inventory",    icon: <Package size={15} /> },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function FinanceDashboard() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [summary, setSummary] = useState<FinSummary | null>(null);
  const [transactions, setTransactions] = useState<FinTransaction[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [budgets, setBudgets] = useState<FinBudget[]>([]);
  const [recurring, setRecurring] = useState<FinRecurring[]>([]);
  const [accounts, setAccounts] = useState<FinAccount[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [txSearch, setTxSearch] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState<"" | "income" | "expense" | "transfer">("");
  const [txCatFilter, setTxCatFilter] = useState("");

  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState<FinTransaction | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinAccount | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<FinBudget | null>(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<FinRecurring | null>(null);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; label: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [undoTx, setUndoTx] = useState<FinTransaction | null>(null);

  const [invStatus, setInvStatus] = useState<InventoryStatus>("active");
  const [nwHistory, setNwHistory] = useState<NwPoint[]>([]);

  const cur = summary?.currency === "EUR" ? "€" : (summary?.currency ?? "€");

  const loadAll = async () => {
    setLoading(true);
    const [sumRes, txRes, goalRes, budgetRes, recRes, accRes, invRes, histRes] = await Promise.all([
      fetch("/api/finance/summary").then((r) => r.json()),
      fetch("/api/finance/transactions?days=90").then((r) => r.json()),
      fetch("/api/finance/savings-goals").then((r) => r.json()),
      fetch("/api/finance/budgets").then((r) => r.json()),
      fetch("/api/finance/recurring").then((r) => r.json()),
      fetch("/api/finance/accounts").then((r) => r.json()),
      fetch("/api/finance/inventory").then((r) => r.json()),
      fetch("/api/finance/history?days=365").then((r) => r.json()),
    ]);
    if (sumRes.summary) setSummary(sumRes.summary as FinSummary);
    if (txRes.transactions) setTransactions(txRes.transactions as FinTransaction[]);
    if (goalRes.goals) setGoals(goalRes.goals as SavingsGoal[]);
    if (budgetRes.budgets) setBudgets(budgetRes.budgets as FinBudget[]);
    if (recRes.recurring) setRecurring(recRes.recurring as FinRecurring[]);
    if (accRes.accounts) setAccounts(accRes.accounts as FinAccount[]);
    if (invRes.items) setInventory(invRes.items as InventoryItem[]);
    if (histRes.points) setNwHistory(histRes.points as NwPoint[]);
    setLoading(false);
  };

  useEffect(() => { void loadAll(); }, []);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  }

  // ── CRUD actions ────────────────────────────────────────────────────────────

  async function deleteTransaction(id: string) {
    const res = await fetch(`/api/finance/transactions?id=${id}`, { method: "DELETE" }).then((r) => r.json());
    if (res.deleted) {
      setUndoTx(res.deleted as FinTransaction);
      setTimeout(() => setUndoTx(null), 6000);
    }
    await loadAll();
  }

  async function undoDelete() {
    if (!undoTx) return;
    const t = undoTx;
    await fetch("/api/finance/transactions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: t.date, type: t.type, category: t.category, subcategory: t.subcategory,
        merchant: t.merchant, tags: t.tags, account_id: t.account_id,
        to_account_id: t.to_account_id, amount: t.amount, note: t.note,
      }),
    });
    setUndoTx(null);
    await loadAll();
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    const endpoints: Record<string, string> = {
      account: "accounts", goal: "savings-goals", budget: "budgets",
      recurring: "recurring", inventory: "inventory",
    };
    const ep = endpoints[type];
    if (ep) {
      await fetch(`/api/finance/${ep}?id=${id}`, { method: "DELETE" });
      showToast("Deleted");
    }
    setDeleteConfirm(null);
    await loadAll();
  }

  async function toggleRecurring(r: FinRecurring) {
    await fetch(`/api/finance/recurring?id=${r.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !r.is_active }),
    });
    await loadAll();
  }

  async function markPaid(r: FinRecurring) {
    // Advance next_date by one period
    const current = new Date(r.next_date + "T12:00:00");
    const next = new Date(current);
    if (r.frequency === "weekly")       next.setDate(next.getDate() + 7);
    else if (r.frequency === "monthly") next.setMonth(next.getMonth() + 1);
    else if (r.frequency === "yearly")  next.setFullYear(next.getFullYear() + 1);
    else if (r.frequency === "daily")   next.setDate(next.getDate() + 1);
    else                                next.setMonth(next.getMonth() + 1); // default monthly
    const nextStr = next.toISOString().split("T")[0]!;
    await fetch(`/api/finance/recurring?id=${r.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ next_date: nextStr }),
    });
    await loadAll();
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const filteredTx = transactions.filter((t) => {
    if (txTypeFilter && t.type !== txTypeFilter) return false;
    if (txCatFilter && t.category !== txCatFilter) return false;
    if (txSearch) {
      const q = txSearch.toLowerCase();
      const hay = `${t.merchant ?? ""} ${t.note ?? ""} ${t.category} ${t.subcategory ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const txGroups: { date: string; items: FinTransaction[] }[] = [];
  for (const t of filteredTx) {
    const last = txGroups[txGroups.length - 1];
    if (last && last.date === t.date) last.items.push(t);
    else txGroups.push({ date: t.date, items: [t] });
  }

  if (loading) {
    return <div className="fin3-wrap"><div className="fin3-body"><div className="fin3-empty">Loading…</div></div></div>;
  }

  return (
    <div className="fin3-wrap">
      <div className="fin3-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`fin3-tab ${tab === t.key ? "fin3-tab-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="fin3-body">
        {tab === "overview"     && <OverviewTab summary={summary} nwHistory={nwHistory} cur={cur} />}
        {tab === "transactions" && (
          <TransactionsTab
            groups={txGroups}
            search={txSearch} setSearch={setTxSearch}
            typeFilter={txTypeFilter} setTypeFilter={setTxTypeFilter}
            catFilter={txCatFilter} setCatFilter={setTxCatFilter}
            cur={cur}
            onAdd={() => { setEditingTx(null); setShowTxModal(true); }}
            onEdit={(t) => { setEditingTx(t); setShowTxModal(true); }}
            onDelete={(id) => { void deleteTransaction(id); }}
          />
        )}
        {tab === "savings" && (
          <SavingsTab goals={goals} monthlySavings={summary?.monthly_savings ?? 0} cur={cur}
            onAdd={() => { setEditingGoal(null); setShowGoalModal(true); }}
            onEdit={(g) => { setEditingGoal(g); setShowGoalModal(true); }}
            onDelete={(g) => setDeleteConfirm({ type: "goal", id: g.id, label: g.name })}
          />
        )}
        {tab === "budgets" && (
          <BudgetsTab budgets={budgets} cur={cur}
            onAdd={() => { setEditingBudget(null); setShowBudgetModal(true); }}
            onEdit={(b) => { setEditingBudget(b); setShowBudgetModal(true); }}
            onDelete={(b) => setDeleteConfirm({ type: "budget", id: b.id, label: b.category })}
          />
        )}
        {tab === "recurring" && (
          <RecurringTab recurring={recurring} cur={cur}
            onAdd={() => { setEditingRecurring(null); setShowRecurringModal(true); }}
            onEdit={(r) => { setEditingRecurring(r); setShowRecurringModal(true); }}
            onDelete={(r) => setDeleteConfirm({ type: "recurring", id: r.id, label: r.name })}
            onToggle={(r) => { void toggleRecurring(r); }}
            onMarkPaid={(r) => { void markPaid(r); }}
          />
        )}
        {tab === "analytics" && <AnalyticsTab transactions={transactions} cur={cur} />}
        {tab === "accounts" && (
          <AccountsTab accounts={summary?.accounts ?? []} cur={cur}
            onAdd={() => { setEditingAccount(null); setShowAccountModal(true); }}
            onEdit={(id) => {
              const a = accounts.find((x) => x.id === id) ?? null;
              setEditingAccount(a); setShowAccountModal(true);
            }}
            onDelete={(id, name) => setDeleteConfirm({ type: "account", id, label: name })}
          />
        )}
        {tab === "inventory" && (
          <InventoryTab items={inventory} status={invStatus} setStatus={setInvStatus} cur={cur}
            onAdd={() => { setEditingInventory(null); setShowInventoryModal(true); }}
            onEdit={(i) => { setEditingInventory(i); setShowInventoryModal(true); }}
            onDelete={(i) => setDeleteConfirm({ type: "inventory", id: i.id, label: i.name })}
          />
        )}
      </div>

      <button className="fin3-fab" onClick={() => { setEditingTx(null); setShowTxModal(true); }} aria-label="Add transaction">
        <Plus size={24} />
      </button>

      {showTxModal && (
        <TxModal
          tx={editingTx} accounts={accounts}
          onClose={() => setShowTxModal(false)}
          onSaved={async () => { setShowTxModal(false); await loadAll(); showToast("Saved"); }}
        />
      )}
      {showAccountModal && (
        <AccountModal account={editingAccount}
          onClose={() => setShowAccountModal(false)}
          onSaved={async () => { setShowAccountModal(false); await loadAll(); showToast("Saved"); }}
        />
      )}
      {showGoalModal && (
        <GoalModal goal={editingGoal}
          onClose={() => setShowGoalModal(false)}
          onSaved={async () => { setShowGoalModal(false); await loadAll(); showToast("Saved"); }}
        />
      )}
      {showBudgetModal && (
        <BudgetModal budget={editingBudget}
          onClose={() => setShowBudgetModal(false)}
          onSaved={async () => { setShowBudgetModal(false); await loadAll(); showToast("Saved"); }}
        />
      )}
      {showRecurringModal && (
        <RecurringModal recurring={editingRecurring} accounts={accounts}
          onClose={() => setShowRecurringModal(false)}
          onSaved={async () => { setShowRecurringModal(false); await loadAll(); showToast("Saved"); }}
        />
      )}
      {showInventoryModal && (
        <InventoryModal item={editingInventory}
          onClose={() => setShowInventoryModal(false)}
          onSaved={async () => { setShowInventoryModal(false); await loadAll(); showToast("Saved"); }}
        />
      )}

      {deleteConfirm && (
        <div className="fin3-modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="fin3-modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="fin3-modal-title">Delete {deleteConfirm.label}?</div>
            <div style={{ fontSize: 14, color: "#6b7280" }}>This cannot be undone.</div>
            <div className="fin3-modal-footer">
              <button className="fin3-btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="fin3-btn-danger" onClick={() => { void confirmDelete(); }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {undoTx && (
        <div className="fin3-toast">
          Transaction deleted
          <button className="fin3-toast-undo" onClick={() => { void undoDelete(); }}>Undo</button>
        </div>
      )}
      {!undoTx && toastMsg && (
        <div className="fin3-toast">{toastMsg}</div>
      )}
    </div>
  );
}

// ── Insight chip icon ──────────────────────────────────────────────────────────

function insightIcon(type: FinInsight["type"]): React.ReactNode {
  if (type === "positive") return <CheckCircle size={15} color="#16a34a" />;
  if (type === "warning") return <AlertCircle size={15} color="#d97706" />;
  if (type === "negative") return <XCircle size={15} color="#dc2626" />;
  return <Info size={15} color="#9ca3af" />;
}

// ── Health ring ──────────────────────────────────────────────────────────────

function HealthRing({ score }: { score: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = healthColor(score);
  return (
    <div className="fin3-health-ring">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#f0ece3" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 32 32)" />
        <text x="32" y="37" textAnchor="middle" fontSize="16" fontWeight="700" fill={color}>{score}</text>
      </svg>
    </div>
  );
}

// ── Overview tab ────────────────────────────────────────────────────────────

function OverviewTab({ summary, nwHistory, cur }: { summary: FinSummary | null; nwHistory: NwPoint[]; cur: string }) {
  if (!summary) return <div className="fin3-empty">No data yet</div>;
  const incomeDiff   = diffPct(summary.monthly_income, summary.prev_month_income);
  const expenseDiff  = diffPct(summary.monthly_expenses, summary.prev_month_expenses);
  const savingsRatePct = Math.round(summary.monthly_savings_rate * 100);

  return (
    <>
      <div className="fin3-metric-grid">
        <div className="fin3-metric-card">
          <div className="fin3-metric-label">Net Worth</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="fin3-metric-value">{fmt(summary.net_worth, cur)}</div>
            <HealthRing score={summary.health_score} />
          </div>
        </div>

        <div className="fin3-metric-card">
          <div className="fin3-metric-label"><Wallet size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />Cash Available</div>
          <div className="fin3-metric-value">{fmt(summary.cash_available, cur)}</div>
        </div>

        <div className="fin3-metric-card">
          <div className="fin3-metric-label">Monthly Income</div>
          <div className="fin3-metric-value">{fmt(summary.monthly_income, cur)}</div>
          {incomeDiff && (
            <div className={incomeDiff.up ? "fin3-trend-up" : "fin3-trend-down"}>
              {incomeDiff.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {incomeDiff.pct.toFixed(0)}% vs last month
            </div>
          )}
        </div>

        <div className="fin3-metric-card">
          <div className="fin3-metric-label">Monthly Expenses</div>
          <div className="fin3-metric-value">{fmt(summary.monthly_expenses, cur)}</div>
          {expenseDiff && (
            <div className={expenseDiff.up ? "fin3-trend-down" : "fin3-trend-up"}>
              {expenseDiff.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {expenseDiff.pct.toFixed(0)}% vs last month
            </div>
          )}
        </div>

        <div className="fin3-metric-card">
          <div className="fin3-metric-label">Monthly Savings</div>
          <div className="fin3-metric-value">{fmt(summary.monthly_savings, cur)}</div>
          <div className="fin3-metric-sub">{savingsRatePct}% savings rate</div>
        </div>

        <div className="fin3-metric-card">
          <div className="fin3-metric-label">Available to Spend</div>
          <div className="fin3-metric-value">{fmt(summary.available_to_spend, cur)}</div>
          <div className="fin3-metric-sub">Safe to spend after bills</div>
        </div>

        <div className="fin3-metric-card">
          <div className="fin3-metric-label">Health Score</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <HealthRing score={summary.health_score} />
            <div className="fin3-metric-sub" style={{ marginTop: 0 }}>
              {summary.health_score >= 70 ? "Strong" : summary.health_score >= 40 ? "Okay" : "Needs work"}
            </div>
          </div>
        </div>
      </div>

      {summary.insights.length > 0 && (
        <div>
          <div className="fin3-section-title">Insights</div>
          <div className="fin3-insights-scroll">
            {summary.insights.map((ins, i) => (
              <div key={i} className={`fin3-insight-chip fin3-insight-${ins.type}`}>
                {insightIcon(ins.type)}{ins.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.upcoming_bills.length > 0 && (
        <div className="fin3-card">
          <div className="fin3-section-title">Upcoming Bills</div>
          {summary.upcoming_bills.slice(0, 5).map((b) => (
            <div key={b.id} className="fin3-bill-row">
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{getCatIcon(b.category)} {b.name}</div>
                <div className="fin3-tx-meta">{fmtDate(b.due_date)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 700 }}>{fmt(b.amount, cur)}</span>
                <span className={`fin3-bill-days ${b.days_until <= 7 ? "fin3-bill-days-soon" : "fin3-bill-days-ok"}`}>
                  {b.days_until <= 0 ? "Due" : `${b.days_until}d`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <NetWorthTimeline points={nwHistory} cur={cur} />
    </>
  );
}

function NetWorthTimeline({ points, cur }: { points: NwPoint[]; cur: string }) {
  const data = points.slice(-12);
  if (data.length < 2) {
    return (
      <div className="fin3-chart-wrap">
        <div className="fin3-section-title">Net Worth Timeline</div>
        <div className="fin3-empty"><div className="fin3-empty-text">Not enough history yet</div></div>
      </div>
    );
  }
  const W = 600, H = 200, padX = 40, padY = 24;
  const vals = data.map((d) => d.net_worth);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const x = (i: number) => padX + (i / (data.length - 1)) * (W - padX * 2);
  const y = (v: number) => padY + (1 - (v - min) / range) * (H - padY * 2);
  const poly = data.map((d, i) => `${x(i)},${y(d.net_worth)}`).join(" ");

  return (
    <div className="fin3-chart-wrap">
      <div className="fin3-section-title">Net Worth Timeline</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <polyline fill="none" stroke="#111" strokeWidth="2" points={poly} />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.net_worth)} r="3" fill="#111">
              <title>{`${fmtDate(d.date)}: ${fmt(d.net_worth, cur)}`}</title>
            </circle>
            {(i === 0 || i === data.length - 1) && (
              <text x={x(i)} y={H - 6} fontSize="10" fill="#9ca3af" textAnchor={i === 0 ? "start" : "end"}>
                {fmtDate(d.date)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Transactions tab ────────────────────────────────────────────────────────

function TransactionsTab(props: {
  groups: { date: string; items: FinTransaction[] }[];
  search: string; setSearch: (v: string) => void;
  typeFilter: "" | "income" | "expense" | "transfer"; setTypeFilter: (v: "" | "income" | "expense" | "transfer") => void;
  catFilter: string; setCatFilter: (v: string) => void;
  cur: string;
  onAdd: () => void; onEdit: (t: FinTransaction) => void; onDelete: (id: string) => void;
}) {
  const { groups, search, setSearch, typeFilter, setTypeFilter, catFilter, setCatFilter, cur, onAdd, onEdit, onDelete } = props;
  const types: ("" | "income" | "expense" | "transfer")[] = ["", "income", "expense", "transfer"];
  const labels: Record<string, string> = { "": "All", income: "Income", expense: "Expense", transfer: "Transfer" };

  return (
    <>
      <div className="fin3-search-bar">
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: 12, color: "#9ca3af" }} />
          <input className="fin3-search-input" style={{ paddingLeft: 34 }} placeholder="Search transactions…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="fin3-filter-pills">
          {types.map((t) => (
            <button key={t || "all"} className={`fin3-filter-pill ${typeFilter === t ? "fin3-filter-pill-active" : ""}`}
              onClick={() => setTypeFilter(t)}>{labels[t]}</button>
          ))}
        </div>
        <select className="fin3-filter-select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="">All categories</option>
          {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="fin3-btn-add" onClick={onAdd}><Plus size={15} />Add</button>
      </div>

      {groups.length === 0 ? (
        <div className="fin3-empty"><div className="fin3-empty-icon">🧾</div><div className="fin3-empty-text">No transactions found</div></div>
      ) : (
        <div className="fin3-card">
          {groups.map((g) => (
            <div key={g.date}>
              <div className="fin3-date-group">{dateLabel(g.date)}</div>
              {g.items.map((t) => {
                const cls = t.type === "income" ? "fin3-tx-amount-income" : t.type === "expense" ? "fin3-tx-amount-expense" : "fin3-tx-amount-transfer";
                const prefix = t.type === "income" ? "+" : t.type === "expense" ? "-" : "";
                return (
                  <div key={t.id} className="fin3-tx-row">
                    <div className="fin3-tx-icon" style={{ background: getCatColor(t.category) + "22" }}>{getCatIcon(t.category)}</div>
                    <div className="fin3-tx-info">
                      <div className="fin3-tx-name">{t.merchant || t.note || t.category}</div>
                      <div className="fin3-tx-meta">{t.category}{t.subcategory ? ` · ${t.subcategory}` : ""} · {t.account_name ?? "—"}{t.to_account_name ? ` → ${t.to_account_name}` : ""}</div>
                    </div>
                    <div className="fin3-tx-actions">
                      <button className="fin3-tx-action-btn" onClick={() => onEdit(t)}><Pencil size={14} /></button>
                      <button className="fin3-tx-action-btn" onClick={() => onDelete(t.id)}><Trash2 size={14} /></button>
                    </div>
                    <div className={cls}>{prefix}{fmt(t.amount, cur)}</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Savings tab ────────────────────────────────────────────────────────────

function SavingsTab({ goals, monthlySavings, cur, onAdd, onEdit, onDelete }: {
  goals: SavingsGoal[]; monthlySavings: number; cur: string;
  onAdd: () => void; onEdit: (g: SavingsGoal) => void; onDelete: (g: SavingsGoal) => void;
}) {
  return (
    <>
      <div className="fin3-section-row">
        <div className="fin3-section-title">Savings Goals</div>
        <button className="fin3-btn-add" onClick={onAdd}><Plus size={15} />Add Goal</button>
      </div>
      {goals.length === 0 ? (
        <div className="fin3-empty"><div className="fin3-empty-icon">🎯</div><div className="fin3-empty-text">No savings goals yet</div></div>
      ) : (
        <div className="fin3-metric-grid">
          {goals.map((g) => {
            const pct = g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100) : 0;
            const remaining = g.target_amount - g.current_amount;
            const months = monthlySavings > 0 && remaining > 0 ? Math.ceil(remaining / monthlySavings) : 0;
            return (
              <div key={g.id} className="fin3-goal-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div className="fin3-goal-emoji">{g.emoji || "🎯"}</div>
                  <div className="fin3-tx-actions" style={{ opacity: 1 }}>
                    <button className="fin3-tx-action-btn" onClick={() => onEdit(g)}><Pencil size={14} /></button>
                    <button className="fin3-tx-action-btn" onClick={() => onDelete(g)}><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="fin3-goal-name">{g.name}</div>
                <div className="fin3-goal-current">{fmt(g.current_amount, cur)}</div>
                <div className="fin3-goal-amounts">
                  <span>{pct.toFixed(0)}% complete</span>
                  <span>of {fmt(g.target_amount, cur)}</span>
                </div>
                <div className="fin3-progress-wrap">
                  <div className="fin3-progress-fill" style={{ width: `${pct}%`, background: g.color || "#16a34a" }} />
                </div>
                {months > 0 && <div className="fin3-metric-sub">~{months} {months === 1 ? "month" : "months"} to go</div>}
                <button className="fin3-btn-outline" style={{ marginTop: 10 }} onClick={() => onEdit(g)}>Add to goal</button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Budgets tab ────────────────────────────────────────────────────────────

function BudgetsTab({ budgets, cur, onAdd, onEdit, onDelete }: {
  budgets: FinBudget[]; cur: string;
  onAdd: () => void; onEdit: (b: FinBudget) => void; onDelete: (b: FinBudget) => void;
}) {
  return (
    <>
      <div className="fin3-section-row">
        <div className="fin3-section-title">Monthly Budgets</div>
        <button className="fin3-btn-add" onClick={onAdd}><Plus size={15} />Add Budget</button>
      </div>
      {budgets.length === 0 ? (
        <div className="fin3-empty"><div className="fin3-empty-icon">💰</div><div className="fin3-empty-text">No budgets set up yet</div></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {budgets.map((b) => {
            const pct = b.pct ?? 0;
            return (
              <div key={b.id} className="fin3-budget-row">
                <div className="fin3-budget-header">
                  <div className="fin3-budget-cat">{getCatIcon(b.category)} {b.category}</div>
                  <div className="fin3-tx-actions" style={{ opacity: 1 }}>
                    <button className="fin3-tx-action-btn" onClick={() => onEdit(b)}><Pencil size={14} /></button>
                    <button className="fin3-tx-action-btn" onClick={() => onDelete(b)}><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="fin3-progress-wrap">
                  <div className={`fin3-progress-fill ${progressClass(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="fin3-budget-amounts" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{fmt(b.spent ?? 0, cur)} / {fmt(b.amount, cur)}</span>
                  <span>{(b.remaining ?? 0) >= 0 ? `${fmt(b.remaining ?? 0, cur)} left` : `${fmt(Math.abs(b.remaining ?? 0), cur)} over`} · {pct.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Recurring tab ────────────────────────────────────────────────────────────

function RecurringTab({ recurring, cur, onAdd, onEdit, onDelete, onToggle, onMarkPaid }: {
  recurring: FinRecurring[]; cur: string;
  onAdd: () => void; onEdit: (r: FinRecurring) => void; onDelete: (r: FinRecurring) => void;
  onToggle: (r: FinRecurring) => void; onMarkPaid: (r: FinRecurring) => void;
}) {
  const dueSoon = recurring.filter((r) => (r.days_until ?? 0) <= 7);
  const thisMonth = recurring.filter((r) => (r.days_until ?? 0) > 7 && (r.days_until ?? 0) <= 30);
  const future = recurring.filter((r) => (r.days_until ?? 0) > 30);

  const renderGroup = (title: string, items: FinRecurring[]) => items.length > 0 && (
    <div key={title}>
      <div className="fin3-divider-label">{title}</div>
      <div className="fin3-card">
        {items.map((r) => (
          <div key={r.id} className="fin3-rec-row">
            <div className="fin3-tx-icon" style={{ background: getCatColor(r.category) + "22" }}>{getCatIcon(r.category)}</div>
            <div className="fin3-tx-info">
              <div className="fin3-tx-name">{r.name}</div>
              <div className="fin3-tx-meta"><span className="fin3-freq-badge">{r.frequency}</span> · {fmtDate(r.next_date)}{r.account_name ? ` · ${r.account_name}` : ""}</div>
            </div>
            <button className={`fin3-toggle ${r.is_active ? "fin3-toggle-on" : ""}`} onClick={() => onToggle(r)} aria-label="Toggle active" />
            <span className={(r.days_until ?? 0) <= 7 ? "fin3-days-badge-soon" : "fin3-days-badge-ok"}>
              {(r.days_until ?? 0) <= 0 ? "Due" : `${r.days_until}d`}
            </span>
            <span style={{ fontWeight: 700, color: r.type === "income" ? "#16a34a" : "#dc2626" }}>
              {r.type === "income" ? "+" : "-"}{fmt(r.amount, cur)}
            </span>
            <button
              className="fin3-paid-btn"
              onClick={() => onMarkPaid(r)}
              title="Mark as paid — advances to next due date"
            >
              ✓ Paid
            </button>
            <div className="fin3-tx-actions" style={{ opacity: 1 }}>
              <button className="fin3-tx-action-btn" onClick={() => onEdit(r)}><Pencil size={14} /></button>
              <button className="fin3-tx-action-btn" onClick={() => onDelete(r)}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div className="fin3-section-row">
        <div className="fin3-section-title"><Calendar size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />Recurring</div>
        <button className="fin3-btn-add" onClick={onAdd}><Plus size={15} />Add Recurring</button>
      </div>
      {recurring.length === 0 ? (
        <div className="fin3-empty"><div className="fin3-empty-icon">🔁</div><div className="fin3-empty-text">No recurring items yet</div></div>
      ) : (
        <>
          {renderGroup("Due Soon", dueSoon)}
          {renderGroup("This Month", thisMonth)}
          {renderGroup("Future", future)}
        </>
      )}
    </>
  );
}

// ── Analytics tab ────────────────────────────────────────────────────────────

function AnalyticsTab({ transactions, cur }: { transactions: FinTransaction[]; cur: string }) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]!;
  const monthExpenses = transactions.filter((t) => t.type === "expense" && t.date >= monthStart);

  const byCat = new Map<string, number>();
  for (const t of monthExpenses) byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
  const catEntries = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const totalExpense = catEntries.reduce((s, [, v]) => s + v, 0);

  // Donut arcs
  const R = 70, CX = 90, CY = 90, SW = 28;
  let angle = -Math.PI / 2;
  const arcs = catEntries.map(([cat, val]) => {
    const frac = totalExpense > 0 ? val / totalExpense : 0;
    const start = angle;
    const end = angle + frac * 2 * Math.PI;
    angle = end;
    const x1 = CX + R * Math.cos(start), y1 = CY + R * Math.sin(start);
    const x2 = CX + R * Math.cos(end), y2 = CY + R * Math.sin(end);
    const large = end - start > Math.PI ? 1 : 0;
    return { cat, val, frac, d: `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}` };
  });

  // Monthly trend (last 6 months)
  const months: { key: string; label: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label: d.toLocaleString("en-GB", { month: "short" }), income: 0, expense: 0 });
  }
  for (const t of transactions) {
    const key = t.date.slice(0, 7);
    const m = months.find((x) => x.key === key);
    if (!m) continue;
    if (t.type === "income") m.income += t.amount;
    else if (t.type === "expense") m.expense += t.amount;
  }
  const maxBar = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));

  // Top stats
  const largestCat = catEntries[0];
  const largestTx = monthExpenses.reduce<FinTransaction | null>((acc, t) => (!acc || t.amount > acc.amount ? t : acc), null);
  const avgDaily = monthExpenses.length > 0 ? totalExpense / now.getDate() : 0;

  const BW = 600, BH = 200, bPadY = 24, groupW = BW / months.length;

  return (
    <>
      <div className="fin3-chart-wrap">
        <div className="fin3-section-title">Spending Breakdown (This Month)</div>
        {catEntries.length === 0 ? (
          <div className="fin3-empty"><div className="fin3-empty-text">No expenses this month</div></div>
        ) : (
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <svg width="180" height="180" viewBox="0 0 180 180">
              {arcs.map((a) => (
                <path key={a.cat} d={a.d} fill="none" stroke={getCatColor(a.cat)} strokeWidth={SW} />
              ))}
              <text x={CX} y={CY - 4} textAnchor="middle" fontSize="11" fill="#9ca3af">Total</text>
              <text x={CX} y={CY + 14} textAnchor="middle" fontSize="15" fontWeight="700" fill="#111">{fmt(totalExpense, cur)}</text>
            </svg>
            <div style={{ flex: 1, minWidth: 200 }}>
              {catEntries.map(([cat, val]) => (
                <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: getCatColor(cat) }} />
                  <span style={{ flex: 1 }}>{cat}</span>
                  <span style={{ color: "#9ca3af" }}>{((val / totalExpense) * 100).toFixed(0)}%</span>
                  <span style={{ fontWeight: 600 }}>{fmt(val, cur)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fin3-chart-wrap">
        <div className="fin3-section-title">Monthly Trend (Income vs Expenses)</div>
        <svg width="100%" viewBox={`0 0 ${BW} ${BH}`} preserveAspectRatio="none">
          {months.map((m, i) => {
            const gx = i * groupW + groupW / 2;
            const incH = (m.income / maxBar) * (BH - bPadY * 2);
            const expH = (m.expense / maxBar) * (BH - bPadY * 2);
            const bw = Math.min(22, groupW / 3);
            return (
              <g key={m.key}>
                <rect x={gx - bw - 2} y={BH - bPadY - incH} width={bw} height={incH} fill="#16a34a" rx="2">
                  <title>{`${m.label} income: ${fmt(m.income, cur)}`}</title>
                </rect>
                <rect x={gx + 2} y={BH - bPadY - expH} width={bw} height={expH} fill="#dc2626" rx="2">
                  <title>{`${m.label} expense: ${fmt(m.expense, cur)}`}</title>
                </rect>
                <text x={gx} y={BH - 6} fontSize="11" fill="#9ca3af" textAnchor="middle">{m.label}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="fin3-metric-grid">
        <div className="fin3-metric-card">
          <div className="fin3-metric-label">Largest Category</div>
          <div className="fin3-metric-value-sm">{largestCat ? largestCat[0] : "—"}</div>
          {largestCat && <div className="fin3-metric-sub">{fmt(largestCat[1], cur)}</div>}
        </div>
        <div className="fin3-metric-card">
          <div className="fin3-metric-label">Largest Transaction</div>
          <div className="fin3-metric-value-sm">{largestTx ? fmt(largestTx.amount, cur) : "—"}</div>
          {largestTx && <div className="fin3-metric-sub">{largestTx.merchant || largestTx.category}</div>}
        </div>
        <div className="fin3-metric-card">
          <div className="fin3-metric-label">Avg Daily Spend</div>
          <div className="fin3-metric-value-sm">{fmt(avgDaily, cur)}</div>
        </div>
        <div className="fin3-metric-card">
          <div className="fin3-metric-label">Total Transactions</div>
          <div className="fin3-metric-value-sm">{transactions.length}</div>
        </div>
      </div>
    </>
  );
}

// ── Accounts tab ────────────────────────────────────────────────────────────

function AccountsTab({ accounts, cur, onAdd, onEdit, onDelete }: {
  accounts: FinSummary["accounts"]; cur: string;
  onAdd: () => void; onEdit: (id: string) => void; onDelete: (id: string, name: string) => void;
}) {
  const assets = accounts.filter((a) => !a.is_liability);
  const liabilities = accounts.filter((a) => a.is_liability);

  const card = (a: FinSummary["accounts"][number]) => (
    <div key={a.id} className="fin3-account-card">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="fin3-account-type-badge">{a.type.replace("_", " ")}</span>
        <div className="fin3-tx-actions" style={{ opacity: 1 }}>
          <button className="fin3-tx-action-btn" onClick={() => onEdit(a.id)}><Pencil size={14} /></button>
          <button className="fin3-tx-action-btn" onClick={() => onDelete(a.id, a.name)}><Trash2 size={14} /></button>
        </div>
      </div>
      <div className="fin3-account-name">{a.name}</div>
      <div className={`fin3-account-balance ${a.is_liability ? "fin3-account-liability" : ""}`}>{fmt(a.balance, cur)}</div>
      <div className={a.monthly_change >= 0 ? "fin3-trend-up" : "fin3-trend-down"}>
        {a.monthly_change >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {fmt(Math.abs(a.monthly_change), cur)} this month
      </div>
    </div>
  );

  return (
    <>
      <div className="fin3-section-row">
        <div className="fin3-section-title">Accounts</div>
        <button className="fin3-btn-add" onClick={onAdd}><Plus size={15} />Add Account</button>
      </div>
      {accounts.length === 0 ? (
        <div className="fin3-empty"><div className="fin3-empty-icon">🏦</div><div className="fin3-empty-text">No accounts yet</div></div>
      ) : (
        <>
          <div className="fin3-divider-label">Assets</div>
          <div className="fin3-accounts-grid">{assets.map(card)}</div>
          {liabilities.length > 0 && (
            <>
              <div className="fin3-divider-label">Liabilities</div>
              <div className="fin3-accounts-grid">{liabilities.map(card)}</div>
            </>
          )}
        </>
      )}
    </>
  );
}

// ── Inventory tab ────────────────────────────────────────────────────────────

function InventoryTab({ items, status, setStatus, cur, onAdd, onEdit, onDelete }: {
  items: InventoryItem[]; status: InventoryStatus; setStatus: (s: InventoryStatus) => void; cur: string;
  onAdd: () => void; onEdit: (i: InventoryItem) => void; onDelete: (i: InventoryItem) => void;
}) {
  const filtered = items.filter((i) => i.status === status);
  return (
    <>
      <div className="fin3-section-row">
        <div className="fin3-section-title">Inventory</div>
        <button className="fin3-btn-add" onClick={onAdd}><Plus size={15} />Add Item</button>
      </div>
      <div className="fin3-inv-status-tabs">
        {INV_STATUSES.map((s) => (
          <button key={s} className={`fin3-filter-pill ${status === s ? "fin3-filter-pill-active" : ""}`}
            onClick={() => setStatus(s)} style={{ textTransform: "capitalize" }}>{s}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="fin3-empty"><div className="fin3-empty-icon">📦</div><div className="fin3-empty-text">No {status} items</div></div>
      ) : (
        <div className="fin3-inv-grid">
          {filtered.map((i) => {
            const profit = i.status === "sold"
              ? (i.actual_sale_price ?? i.expected_sale_price) - i.purchase_price
              : i.expected_sale_price - i.purchase_price;
            return (
              <div key={i.id} className="fin3-inv-card">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{i.name}</div>
                  <div className="fin3-tx-actions" style={{ opacity: 1 }}>
                    <button className="fin3-tx-action-btn" onClick={() => onEdit(i)}><Pencil size={14} /></button>
                    <button className="fin3-tx-action-btn" onClick={() => onDelete(i)}><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="fin3-tx-meta" style={{ margin: "8px 0" }}>
                  Bought {fmt(i.purchase_price, cur)} · {i.status === "sold" ? `Sold ${fmt(i.actual_sale_price ?? 0, cur)}` : `Est. ${fmt(i.expected_sale_price, cur)}`}
                </div>
                <span className={`fin3-profit-badge ${profit >= 0 ? "fin3-profit-pos" : "fin3-profit-neg"}`}>
                  {profit >= 0 ? "+" : "-"}{fmt(Math.abs(profit), cur)} {i.status === "sold" ? "realized" : "potential"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Modal building blocks ──────────────────────────────────────────────────────

function ModalShell({ title, onClose, children, onSubmit }: {
  title: string; onClose: () => void; children: React.ReactNode; onSubmit: () => void;
}) {
  return (
    <div className="fin3-modal-backdrop" onClick={onClose}>
      <div className="fin3-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="fin3-modal-title">{title}</div>
          <button className="fin3-btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        {children}
        <div className="fin3-modal-footer">
          <button className="fin3-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="fin3-btn-primary" onClick={onSubmit}>Save</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="fin3-modal-field">
      <label className="fin3-modal-label">{label}</label>
      {children}
    </div>
  );
}

// ── Transaction modal ──────────────────────────────────────────────────────────

function TxModal({ tx, accounts, onClose, onSaved }: {
  tx: FinTransaction | null; accounts: FinAccount[]; onClose: () => void; onSaved: () => void;
}) {
  const [date, setDate] = useState(tx?.date ?? new Date().toISOString().split("T")[0]!);
  const [type, setType] = useState<TxType>(tx?.type ?? "expense");
  const [amount, setAmount] = useState(tx ? String(tx.amount) : "");
  const [category, setCategory] = useState(tx?.category ?? EXPENSE_CATEGORIES[0]!);
  const [subcategory, setSubcategory] = useState(tx?.subcategory ?? "");
  const [accountId, setAccountId] = useState(tx?.account_id ?? accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(tx?.to_account_id ?? "");
  const [merchant, setMerchant] = useState(tx?.merchant ?? "");
  const [note, setNote] = useState(tx?.note ?? "");

  const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function save() {
    const body = {
      date, type, amount: parseFloat(amount), category,
      subcategory: subcategory.trim() || null, merchant: merchant.trim() || null,
      account_id: accountId, to_account_id: type === "transfer" ? (toAccountId || null) : null,
      note: note.trim() || null,
    };
    if (!body.account_id || !body.amount || body.amount <= 0) return;
    if (tx) {
      await fetch(`/api/finance/transactions?id=${tx.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/finance/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    onSaved();
  }

  const typePill = (t: TxType, label: string) => (
    <div className={`fin3-type-pill ${type === t ? `fin3-type-pill-${t}` : ""}`} onClick={() => setType(t)}>{label}</div>
  );

  return (
    <ModalShell title={tx ? "Edit Transaction" : "Add Transaction"} onClose={onClose} onSubmit={() => { void save(); }}>
      <Field label="Type">
        <div className="fin3-type-pills">{typePill("income", "Income")}{typePill("expense", "Expense")}{typePill("transfer", "Transfer")}</div>
      </Field>
      <div className="fin3-modal-row">
        <Field label="Date"><input className="fin3-modal-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Amount"><input className="fin3-modal-input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      </div>
      {type !== "transfer" && (
        <div className="fin3-modal-row">
          <Field label="Category">
            <select className="fin3-modal-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Subcategory"><input className="fin3-modal-input" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} /></Field>
        </div>
      )}
      <Field label={type === "transfer" ? "From Account" : "Account"}>
        <select className="fin3-modal-select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      {type === "transfer" && (
        <Field label="To Account">
          <select className="fin3-modal-select" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
            <option value="">Select…</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      )}
      {type !== "transfer" && (
        <Field label="Merchant / Payee"><input className="fin3-modal-input" value={merchant} onChange={(e) => setMerchant(e.target.value)} /></Field>
      )}
      <Field label="Note"><textarea className="fin3-modal-textarea" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </ModalShell>
  );
}

// ── Account modal ──────────────────────────────────────────────────────────────

function AccountModal({ account, onClose, onSaved }: { account: FinAccount | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "bank");
  const [currency, setCurrency] = useState(account?.currency ?? "EUR");
  const [initialBalance, setInitialBalance] = useState(account ? String(account.initial_balance) : "0");
  const [color, setColor] = useState(account?.color ?? "#6b7280");
  const [isLiability, setIsLiability] = useState(account?.is_liability ?? false);

  async function save() {
    const body = { name: name.trim(), type, currency, initial_balance: parseFloat(initialBalance) || 0, color, is_liability: isLiability };
    if (!body.name) return;
    if (account) {
      await fetch(`/api/finance/accounts?id=${account.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/finance/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    onSaved();
  }

  return (
    <ModalShell title={account ? "Edit Account" : "Add Account"} onClose={onClose} onSubmit={() => { void save(); }}>
      <Field label="Name"><input className="fin3-modal-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <div className="fin3-modal-row">
        <Field label="Type">
          <select className="fin3-modal-select" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </select>
        </Field>
        <Field label="Currency"><input className="fin3-modal-input" value={currency} onChange={(e) => setCurrency(e.target.value)} /></Field>
      </div>
      <div className="fin3-modal-row">
        <Field label="Initial Balance"><input className="fin3-modal-input" type="number" step="0.01" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} /></Field>
        <Field label="Color"><input className="fin3-modal-input" type="color" value={color} onChange={(e) => setColor(e.target.value)} /></Field>
      </div>
      <Field label="Liability">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={isLiability} onChange={(e) => setIsLiability(e.target.checked)} /> This is money I owe
        </label>
      </Field>
    </ModalShell>
  );
}

// ── Goal modal ──────────────────────────────────────────────────────────────────

function GoalModal({ goal, onClose, onSaved }: { goal: SavingsGoal | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(goal?.name ?? "");
  const [emoji, setEmoji] = useState(goal?.emoji ?? "🎯");
  const [target, setTarget] = useState(goal ? String(goal.target_amount) : "");
  const [current, setCurrent] = useState(goal ? String(goal.current_amount) : "0");
  const [color, setColor] = useState(goal?.color ?? "#16a34a");
  const [currency, setCurrency] = useState(goal?.currency ?? "EUR");

  async function save() {
    const body = { name: name.trim(), emoji, target_amount: parseFloat(target) || 0, current_amount: parseFloat(current) || 0, color, currency };
    if (!body.name || body.target_amount <= 0) return;
    if (goal) {
      await fetch(`/api/finance/savings-goals?id=${goal.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/finance/savings-goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    onSaved();
  }

  return (
    <ModalShell title={goal ? "Edit Goal" : "Add Goal"} onClose={onClose} onSubmit={() => { void save(); }}>
      <div className="fin3-modal-row">
        <Field label="Name"><input className="fin3-modal-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Emoji"><input className="fin3-modal-input" value={emoji} onChange={(e) => setEmoji(e.target.value)} /></Field>
      </div>
      <div className="fin3-modal-row">
        <Field label="Target Amount"><input className="fin3-modal-input" type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
        <Field label="Current Amount"><input className="fin3-modal-input" type="number" step="0.01" value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
      </div>
      <div className="fin3-modal-row">
        <Field label="Color"><input className="fin3-modal-input" type="color" value={color} onChange={(e) => setColor(e.target.value)} /></Field>
        <Field label="Currency"><input className="fin3-modal-input" value={currency} onChange={(e) => setCurrency(e.target.value)} /></Field>
      </div>
    </ModalShell>
  );
}

// ── Budget modal ──────────────────────────────────────────────────────────────

function BudgetModal({ budget, onClose, onSaved }: { budget: FinBudget | null; onClose: () => void; onSaved: () => void }) {
  const [category, setCategory] = useState(budget?.category ?? EXPENSE_CATEGORIES[0]!);
  const [amount, setAmount] = useState(budget ? String(budget.amount) : "");

  async function save() {
    const body = { category, amount: parseFloat(amount) || 0 };
    if (body.amount <= 0) return;
    if (budget) {
      await fetch(`/api/finance/budgets?id=${budget.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/finance/budgets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    onSaved();
  }

  return (
    <ModalShell title={budget ? "Edit Budget" : "Add Budget"} onClose={onClose} onSubmit={() => { void save(); }}>
      <Field label="Category">
        <select className="fin3-modal-select" value={category} onChange={(e) => setCategory(e.target.value)} disabled={!!budget}>
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Monthly Amount"><input className="fin3-modal-input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
    </ModalShell>
  );
}

// ── Recurring modal ──────────────────────────────────────────────────────────

function RecurringModal({ recurring, accounts, onClose, onSaved }: {
  recurring: FinRecurring | null; accounts: FinAccount[]; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(recurring?.name ?? "");
  const [type, setType] = useState<"income" | "expense">(recurring?.type ?? "expense");
  const [amount, setAmount] = useState(recurring ? String(recurring.amount) : "");
  const [category, setCategory] = useState(recurring?.category ?? EXPENSE_CATEGORIES[0]!);
  const [accountId, setAccountId] = useState(recurring?.account_id ?? "");
  const [frequency, setFrequency] = useState<RecurringFrequency>(recurring?.frequency ?? "monthly");
  const [nextDate, setNextDate] = useState(recurring?.next_date ?? new Date().toISOString().split("T")[0]!);
  const [note, setNote] = useState(recurring?.note ?? "");
  const [autoCreate, setAutoCreate] = useState(recurring?.auto_create ?? false);

  const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function save() {
    const body = {
      name: name.trim(), type, amount: parseFloat(amount) || 0, category,
      account_id: accountId || null, frequency, next_date: nextDate,
      note: note.trim() || null, auto_create: autoCreate,
    };
    if (!body.name || body.amount <= 0) return;
    if (recurring) {
      await fetch(`/api/finance/recurring?id=${recurring.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/finance/recurring", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    onSaved();
  }

  return (
    <ModalShell title={recurring ? "Edit Recurring" : "Add Recurring"} onClose={onClose} onSubmit={() => { void save(); }}>
      <Field label="Name"><input className="fin3-modal-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <div className="fin3-modal-row">
        <Field label="Type">
          <select className="fin3-modal-select" value={type} onChange={(e) => setType(e.target.value as "income" | "expense")}>
            <option value="expense">Expense</option><option value="income">Income</option>
          </select>
        </Field>
        <Field label="Amount"><input className="fin3-modal-input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      </div>
      <div className="fin3-modal-row">
        <Field label="Category">
          <select className="fin3-modal-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Account">
          <select className="fin3-modal-select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">None</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="fin3-modal-row">
        <Field label="Frequency">
          <select className="fin3-modal-select" value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}>
            {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Next Date"><input className="fin3-modal-input" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} /></Field>
      </div>
      <Field label="Note"><textarea className="fin3-modal-textarea" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <Field label="Auto Create">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
          <input type="checkbox" checked={autoCreate} onChange={(e) => setAutoCreate(e.target.checked)} /> Automatically create transactions
        </label>
      </Field>
    </ModalShell>
  );
}

// ── Inventory modal ──────────────────────────────────────────────────────────

function InventoryModal({ item, onClose, onSaved }: { item: InventoryItem | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [status, setStatus] = useState<InventoryStatus>(item?.status ?? "active");
  const [purchasePrice, setPurchasePrice] = useState(item ? String(item.purchase_price) : "");
  const [expectedPrice, setExpectedPrice] = useState(item ? String(item.expected_sale_price) : "");
  const [actualPrice, setActualPrice] = useState(item?.actual_sale_price != null ? String(item.actual_sale_price) : "");
  const [purchasedAt, setPurchasedAt] = useState(item?.purchased_at ?? new Date().toISOString().split("T")[0]!);
  const [soldAt, setSoldAt] = useState(item?.sold_at ?? "");
  const [note, setNote] = useState(item?.note ?? "");

  async function save() {
    const body = {
      name: name.trim(), status,
      purchase_price: parseFloat(purchasePrice) || 0,
      expected_sale_price: parseFloat(expectedPrice) || 0,
      actual_sale_price: status === "sold" && actualPrice ? parseFloat(actualPrice) : null,
      purchased_at: purchasedAt,
      sold_at: status === "sold" ? (soldAt || new Date().toISOString().split("T")[0]!) : null,
      note: note.trim() || null,
    };
    if (!body.name) return;
    if (item) {
      await fetch(`/api/finance/inventory?id=${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/finance/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    onSaved();
  }

  return (
    <ModalShell title={item ? "Edit Item" : "Add Item"} onClose={onClose} onSubmit={() => { void save(); }}>
      <Field label="Name"><input className="fin3-modal-input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Status">
        <select className="fin3-modal-select" value={status} onChange={(e) => setStatus(e.target.value as InventoryStatus)}>
          {INV_STATUSES.map((s) => <option key={s} value={s} style={{ textTransform: "capitalize" }}>{s}</option>)}
        </select>
      </Field>
      <div className="fin3-modal-row">
        <Field label="Purchase Price"><input className="fin3-modal-input" type="number" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} /></Field>
        <Field label="Expected Sale"><input className="fin3-modal-input" type="number" step="0.01" value={expectedPrice} onChange={(e) => setExpectedPrice(e.target.value)} /></Field>
      </div>
      {status === "sold" && (
        <div className="fin3-modal-row">
          <Field label="Actual Sale"><input className="fin3-modal-input" type="number" step="0.01" value={actualPrice} onChange={(e) => setActualPrice(e.target.value)} /></Field>
          <Field label="Sold At"><input className="fin3-modal-input" type="date" value={soldAt} onChange={(e) => setSoldAt(e.target.value)} /></Field>
        </div>
      )}
      <Field label="Purchased At"><input className="fin3-modal-input" type="date" value={purchasedAt} onChange={(e) => setPurchasedAt(e.target.value)} /></Field>
      <Field label="Note"><textarea className="fin3-modal-textarea" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </ModalShell>
  );
}

export default FinanceDashboard;
