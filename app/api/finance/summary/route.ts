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

import type { FinSummary, AccountBalance } from "@/lib/finance/types";

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createAdminClient();
    const userId   = uid();

    // Load accounts + all-time transactions in parallel
    const [accsRes, txsRes, invRes] = await Promise.all([
      supabase.from("fin_accounts").select("*").eq("user_id", userId),
      supabase.from("fin_transactions").select("*").eq("user_id", userId),
      supabase.from("fin_inventory").select("*").eq("user_id", userId),
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

    const summary: FinSummary = {
      net_worth:           netWorth,
      cash_available:      cashAvail,
      monthly_income:      monthlyIncome,
      monthly_expenses:    monthlyExpenses,
      monthly_savings:     monthlyIncome - monthlyExpenses,
      prev_month_income:   prevIncome,
      prev_month_expenses: prevExpenses,
      inventory_value:     inventoryValue,
      potential_profit:    potentialProfit,
      realized_profit_month: realizedMonth,
      accounts:            accountsList,
      currency:            accounts[0]?.currency ?? "EUR",
    };

    return NextResponse.json({ summary });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}
