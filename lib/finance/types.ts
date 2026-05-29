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
  balance?:        number;
  monthly_change?: number;
}

export type TxType = "income" | "expense" | "transfer";

export interface FinTransaction {
  id:               string;
  date:             string;
  type:             TxType;
  category:         string;
  subcategory:      string | null;
  merchant:         string | null;
  tags:             string[];
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

export interface FinCategory {
  id:        string;
  name:      string;
  parent_id: string | null;
  icon:      string;
  color:     string;
  cat_type:  "income" | "expense" | "both";
  sort_order: number;
  created_at: string;
  children?:  FinCategory[];
}

export interface FinBudget {
  id:         string;
  category:   string;
  amount:     number;
  period:     string;
  created_at: string;
  spent?:     number;
  remaining?: number;
  pct?:       number;
}

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export interface FinRecurring {
  id:           string;
  name:         string;
  type:         "income" | "expense";
  amount:       number;
  category:     string;
  account_id:   string | null;
  account_name?: string | null;
  frequency:    RecurringFrequency;
  next_date:    string;
  note:         string | null;
  auto_create:  boolean;
  is_active:    boolean;
  created_at:   string;
  days_until?:  number;
}

export interface FinInsight {
  type: "positive" | "negative" | "neutral" | "warning";
  text: string;
}

export interface UpcomingBill {
  id:         string;
  name:       string;
  amount:     number;
  due_date:   string;
  category:   string;
  days_until: number;
}

export interface FinSummary {
  net_worth:             number;
  cash_available:        number;
  monthly_income:        number;
  monthly_expenses:      number;
  monthly_savings:       number;
  monthly_savings_rate:  number;
  prev_month_income:     number;
  prev_month_expenses:   number;
  prev_month_savings:    number;
  inventory_value:       number;
  potential_profit:      number;
  realized_profit_month: number;
  available_to_spend:    number;
  daily_avg_spend:       number;
  health_score:          number;
  insights:              FinInsight[];
  upcoming_bills:        UpcomingBill[];
  accounts:              AccountBalance[];
  currency:              string;
}

export const EXPENSE_CATEGORIES = [
  "Food & Groceries", "Transport", "Housing", "Entertainment",
  "Subscriptions", "Shopping", "Health", "Education",
  "Utilities", "Dining Out", "Travel", "Personal Care", "Other",
];

export const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Resale", "Investment Return",
  "Gift", "Bonus", "Other Income",
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export const CATEGORY_ICONS: Record<string, string> = {
  "Food & Groceries": "🛒",
  "Transport": "🚗",
  "Housing": "🏠",
  "Entertainment": "🎬",
  "Subscriptions": "📱",
  "Shopping": "🛍️",
  "Health": "❤️",
  "Education": "📚",
  "Utilities": "💡",
  "Dining Out": "🍽️",
  "Travel": "✈️",
  "Personal Care": "🪥",
  "Other": "📦",
  "Salary": "💼",
  "Freelance": "💻",
  "Resale": "🔄",
  "Investment Return": "📈",
  "Gift": "🎁",
  "Bonus": "⭐",
  "Other Income": "💰",
};

export const CATEGORY_COLORS: Record<string, string> = {
  "Food & Groceries": "#22c55e",
  "Transport": "#3b82f6",
  "Housing": "#8b5cf6",
  "Entertainment": "#f59e0b",
  "Subscriptions": "#6366f1",
  "Shopping": "#ec4899",
  "Health": "#ef4444",
  "Education": "#0ea5e9",
  "Utilities": "#f97316",
  "Dining Out": "#84cc16",
  "Travel": "#06b6d4",
  "Personal Care": "#a855f7",
  "Other": "#6b7280",
  "Salary": "#10b981",
  "Freelance": "#10b981",
  "Resale": "#14b8a6",
  "Investment Return": "#22c55e",
  "Gift": "#f43f5e",
  "Bonus": "#eab308",
  "Other Income": "#10b981",
};
