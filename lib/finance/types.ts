// Shared finance types — imported by both API routes and client components

export type AccountType = "cash" | "bank" | "savings" | "credit_card" | "investment" | "other";

export interface FinAccount {
  id:              string;
  name:            string;
  type:            AccountType;
  currency:        string;
  initial_balance: number;
  color:           string | null;
  is_liability:    boolean;
  sort_order:      number;
  created_at:      string;
  // computed on client / summary
  balance?:        number;
  monthly_change?: number;
}

export type TxType = "income" | "expense" | "transfer";

export interface FinTransaction {
  id:               string;
  date:             string;
  type:             TxType;
  category:         string;
  account_id:       string;
  account_name?:    string | null;
  to_account_id:    string | null;
  to_account_name?: string | null;
  amount:           number;
  note:             string | null;
  created_at:       string;
}

export interface SavingsGoal {
  id:             string;
  name:           string;
  target_amount:  number;
  current_amount: number;
  currency:       string;
  color:          string;
  emoji:          string;
  sort_order:     number;
  created_at:     string;
}

export type InventoryStatus = "active" | "listed" | "sold";

export interface InventoryItem {
  id:                   string;
  name:                 string;
  purchase_price:       number;
  expected_sale_price:  number;
  actual_sale_price:    number | null;
  status:               InventoryStatus;
  purchased_at:         string;
  sold_at:              string | null;
  note:                 string | null;
  created_at:           string;
  potential_profit?:    number;
  realized_profit?:     number | undefined;
}

export interface AccountBalance {
  id:             string;
  name:           string;
  type:           string;
  currency:       string;
  color:          string | null;
  is_liability:   boolean;
  balance:        number;
  this_month_in:  number;
  this_month_out: number;
  monthly_change: number;
}

export interface FinSummary {
  net_worth:             number;
  cash_available:        number;
  monthly_income:        number;
  monthly_expenses:      number;
  monthly_savings:       number;
  prev_month_income:     number;
  prev_month_expenses:   number;
  inventory_value:       number;
  potential_profit:      number;
  realized_profit_month: number;
  accounts:              AccountBalance[];
  currency:              string;
}

export const EXPENSE_CATEGORIES = [
  "Food & Groceries", "Transport", "Housing", "Entertainment",
  "Subscriptions", "Shopping", "Health", "Education",
  "Utilities", "Dining Out", "Travel", "Other",
];

export const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Resale", "Investment Return",
  "Gift", "Other Income",
];
