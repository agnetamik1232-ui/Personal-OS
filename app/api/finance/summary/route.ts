/**
 * GET /api/finance/summary
 * Calculates all derived finance figures from transactions.
 *
 * Net Worth = sum of all account balances (assets − liabilities)
 * Account balance = initial_balance + income − expense + transfers_in − transfers_out
 */

import { NextResponse }   from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

function uid(): string {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

function monthStart(offset = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().split("T")[0]!;
}
function monthEnd(offset = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset + 1);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0]!;
}

import type { FinSummary, AccountBalance, FinInsight, UpcomingBill } from "@/lib/finance/types";

function fmt(n: number): string {
  return "€" + n.toLocaleString("en-IE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createAdminClient();
    const userId   = uid();

    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const in30Str = in30.toISOString().split("T")[0]!;
    const todayStr = new Date().toISOString().split("T")[0]!;

    // Load accounts + all-time transactions + inventory + upcoming recurring in parallel
    const [accsRes, txsRes, invRes, recRes] = await Promise.all([
      supabase.from("fin_accounts").select("*").eq("user_id", userId),
      supabase.from("fin_transactions").select("*").eq("user_id", userId),
      supabase.from("fin_inventory").select("*").eq("user_id", userId),
      supabase.from("fin_recurring").select("*").eq("user_id", userId)
        .eq("is_active", true).gte("next_date", todayStr).lte("next_date", in30Str)
        .order("next_date", { ascending: true }),
    ]);

    if (accsRes.error) return NextResponse.json({ error: accsRes.error.message }, { status: 500 });
    if (txsRes.error)  return NextResponse.json({ error: txsRes.error.message  }, { status: 500 });

    type RawAccount = {
      id: string; name: string; type: string; currency: string;
      color: string | null; is_liability: boolean; initial_balance: number;
    };
    type RawTx = {
      id: string; date: string; type: string;
      account_id: string; to_account_id: string | null; amount: number;
    };
    type RawInv = {
      status: string; expected_sale_price: number;
      purchase_price: number; actual_sale_price: number | null; sold_at: string | null;
    };

    const accounts = (accsRes.data ?? []) as RawAccount[];
    const txs      = (txsRes.data ?? []) as RawTx[];
    const inv      = (invRes.data ?? []) as RawInv[];

    const thisStart = monthStart(0);
    const thisEnd   = monthEnd(0);
    const prevStart = monthStart(-1);
    const prevEnd   = monthEnd(-1);

    // Compute per-account balance
    const acctMap = new Map<string, AccountBalance>();
    for (const acc of accounts) {
      acctMap.set(acc.id, {
        id:             acc.id,
        name:           acc.name,
        type:           acc.type,
        currency:       acc.currency,
        color:          acc.color,
        is_liability:   acc.is_liability,
        balance:        acc.initial_balance,
        this_month_in:  0,
        this_month_out: 0,
        monthly_change: 0,
      });
    }

    let monthlyIncome   = 0;
    let monthlyExpenses = 0;
    let prevIncome      = 0;
    let prevExpenses    = 0;

    for (const tx of txs) {
      const inThisMonth = tx.date >= thisStart && tx.date <= thisEnd;
      const inPrevMonth = tx.date >= prevStart && tx.date <= prevEnd;
      const acc = acctMap.get(tx.account_id);
      const toAcc = tx.to_account_id ? acctMap.get(tx.to_account_id) : undefined;

      if (tx.type === "income") {
        if (acc) {
          acc.balance += tx.amount;
          if (inThisMonth) { acc.this_month_in += tx.amount; monthlyIncome += tx.amount; }
          if (inPrevMonth) prevIncome += tx.amount;
        }
      } else if (tx.type === "expense") {
        if (acc) {
          acc.balance -= tx.amount;
          if (inThisMonth) { acc.this_month_out += tx.amount; monthlyExpenses += tx.amount; }
          if (inPrevMonth) prevExpenses += tx.amount;
        }
      } else if (tx.type === "transfer") {
        // Transfer: deduct from source, add to destination — net worth unchanged
        if (acc)   { acc.balance -= tx.amount; if (inThisMonth) acc.this_month_out += tx.amount; }
        if (toAcc) { toAcc.balance += tx.amount; if (inThisMonth) toAcc.this_month_in += tx.amount; }
      }
    }

    // monthly_change per account
    for (const acc of acctMap.values()) {
      acc.monthly_change = acc.this_month_in - acc.this_month_out;
    }

    const accountsList = [...acctMap.values()];

    // Net worth = sum of balances (liabilities count negative)
    // Convention: credit cards are liabilities — their balance is owed money
    // For credit cards: balance negative means you owe money (decreases net worth)
    const netWorth = accountsList.reduce((sum, acc) => {
      // For liability accounts, the balance represents what's owed — already negative after expenses
      return sum + acc.balance;
    }, 0);

    // Cash available = sum of cash/bank/other non-savings non-investment accounts
    const cashTypes   = new Set(["cash", "bank", "other"]);
    const cashAvail   = accountsList
      .filter((a) => cashTypes.has(a.type) && !a.is_liability)
      .reduce((s, a) => s + a.balance, 0);

    // Inventory stats
    const activeInv = inv.filter((i) => i.status === "active" || i.status === "listed");
    const inventoryValue  = activeInv.reduce((s, i) => s + i.expected_sale_price, 0);
    const potentialProfit = activeInv.reduce((s, i) => s + (i.expected_sale_price - i.purchase_price), 0);
    const realizedMonth   = inv
      .filter((i) => i.status === "sold" && i.sold_at && i.sold_at >= thisStart && i.sold_at <= thisEnd)
      .reduce((s, i) => s + ((i.actual_sale_price ?? i.expected_sale_price) - i.purchase_price), 0);

    const monthlySavings = monthlyIncome - monthlyExpenses;
    const prevSavings    = prevIncome - prevExpenses;
    const savingsRate    = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0;

    const daysElapsed   = new Date().getDate();
    const dailyAvgSpend = monthlyExpenses / Math.max(daysElapsed, 1);

    // Upcoming bills (recurring, next 30 days)
    type RawRec = {
      id: string; name: string; amount: number; next_date: string; category: string;
    };
    const recRows = (recRes.data ?? []) as RawRec[];
    const upcomingBills: UpcomingBill[] = recRows.map((r) => {
      const d = new Date(r.next_date); d.setHours(0, 0, 0, 0);
      const t = new Date(); t.setHours(0, 0, 0, 0);
      return {
        id:         r.id,
        name:       r.name,
        amount:     r.amount,
        due_date:   r.next_date,
        category:   r.category,
        days_until: Math.round((d.getTime() - t.getTime()) / 86400000),
      };
    });
    const upcomingSum     = upcomingBills.reduce((s, b) => s + b.amount, 0);
    const availableToSpend = cashAvail - upcomingSum;

    // Health score
    const savingsPoints   = Math.min(savingsRate * 200, 40);
    const emergencyMonths = monthlyExpenses > 0 ? cashAvail / monthlyExpenses : 0;
    const emergencyPoints = Math.min(emergencyMonths * 10, 30);
    const liabilityBalance = accountsList.filter((a) => a.is_liability).reduce((s, a) => s + Math.abs(a.balance), 0);
    const debtPoints      = liabilityBalance === 0 ? 10 : Math.max(0, 10 - (liabilityBalance / Math.max(netWorth, 1)) * 10);
    const budgetPoints    = 20;
    const healthScore = Math.round(Math.min(100, Math.max(0, savingsPoints + emergencyPoints + debtPoints + budgetPoints)));

    // Insights
    const insights: FinInsight[] = [];
    if (monthlySavings > 0) insights.push({ type: "positive", text: `You saved ${fmt(monthlySavings)} this month` });
    if (savingsRate >= 0.2) insights.push({ type: "positive", text: `Excellent savings rate of ${Math.round(savingsRate * 100)}%` });
    else if (savingsRate > 0) insights.push({ type: "neutral", text: `Savings rate: ${Math.round(savingsRate * 100)}%` });
    if (prevExpenses > 0) {
      const diff = (monthlyExpenses - prevExpenses) / prevExpenses;
      if (diff > 0.05) insights.push({ type: "warning", text: `Spending up ${Math.round(diff * 100)}% vs last month` });
      else if (diff < -0.05) insights.push({ type: "positive", text: `Spending down ${Math.round(Math.abs(diff) * 100)}% vs last month` });
    }
    if (emergencyMonths >= 3) insights.push({ type: "positive", text: `${emergencyMonths.toFixed(1)} months of expenses in cash` });
    else if (emergencyMonths < 1 && cashAvail < monthlyExpenses) insights.push({ type: "warning", text: "Less than 1 month of emergency cash" });
    if (netWorth > 0) insights.push({ type: "neutral", text: `Net worth: ${fmt(netWorth)}` });

    const summary: FinSummary = {
      net_worth:             netWorth,
      cash_available:        cashAvail,
      monthly_income:        monthlyIncome,
      monthly_expenses:      monthlyExpenses,
      monthly_savings:       monthlySavings,
      monthly_savings_rate:  savingsRate,
      prev_month_income:     prevIncome,
      prev_month_expenses:   prevExpenses,
      prev_month_savings:    prevSavings,
      inventory_value:       inventoryValue,
      potential_profit:      potentialProfit,
      realized_profit_month: realizedMonth,
      available_to_spend:    availableToSpend,
      daily_avg_spend:       dailyAvgSpend,
      health_score:          healthScore,
      insights,
      upcoming_bills:        upcomingBills,
      accounts:              accountsList,
      currency:              accounts[0]?.currency ?? "EUR",
    };

    return NextResponse.json({ summary });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
