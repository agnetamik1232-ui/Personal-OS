-- ═══════════════════════════════════════════════════════════════════════════
-- Personal OS — 0002 finance system
-- Transaction-based finance: accounts → transactions → calculated dashboards
-- ═══════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: fin_accounts
-- User-defined accounts (cash, bank, savings, credit card, etc.)
-- ════════════════════════════════════════════════════════════════════════════
create table public.fin_accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  type            text not null,           -- 'cash' | 'bank' | 'savings' | 'credit_card' | 'investment' | 'other'
  currency        text not null default 'EUR',
  initial_balance numeric(14,2) not null default 0,
  color           text,                    -- hex colour for UI
  is_liability    boolean not null default false,  -- true = credit card / loan
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index fin_accounts_user_idx on public.fin_accounts (user_id);

alter table public.fin_accounts enable row level security;
create policy "deny all — fin_accounts"
  on public.fin_accounts as restrictive
  for all to authenticated, anon using (false);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: fin_transactions
-- Every money movement. Single source of truth.
-- ════════════════════════════════════════════════════════════════════════════
create table public.fin_transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  type            text not null,           -- 'income' | 'expense' | 'transfer'
  category        text not null default 'Other',
  account_id      uuid not null references public.fin_accounts(id) on delete cascade,
  to_account_id   uuid references public.fin_accounts(id) on delete set null,  -- transfers only
  amount          numeric(14,2) not null check (amount > 0),
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index fin_transactions_user_date_idx on public.fin_transactions (user_id, date desc);
create index fin_transactions_account_idx   on public.fin_transactions (account_id);
create index fin_transactions_type_idx      on public.fin_transactions (user_id, type);

create trigger fin_transactions_set_updated_at
  before update on public.fin_transactions
  for each row execute function public.set_updated_at();

alter table public.fin_transactions enable row level security;
create policy "deny all — fin_transactions"
  on public.fin_transactions as restrictive
  for all to authenticated, anon using (false);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: fin_savings_goals
-- Named savings targets with optional linked account
-- ════════════════════════════════════════════════════════════════════════════
create table public.fin_savings_goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  target_amount   numeric(14,2) not null,
  current_amount  numeric(14,2) not null default 0,
  currency        text not null default 'EUR',
  color           text default '#2E6B45',
  emoji           text default '🐷',
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index fin_savings_goals_user_idx on public.fin_savings_goals (user_id);

alter table public.fin_savings_goals enable row level security;
create policy "deny all — fin_savings_goals"
  on public.fin_savings_goals as restrictive
  for all to authenticated, anon using (false);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: fin_inventory
-- Reseller / flipper inventory tracking
-- ════════════════════════════════════════════════════════════════════════════
create table public.fin_inventory (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  purchase_price      numeric(14,2) not null,
  expected_sale_price numeric(14,2) not null,
  actual_sale_price   numeric(14,2),
  status              text not null default 'active',  -- 'active' | 'listed' | 'sold'
  purchased_at        date not null default current_date,
  sold_at             date,
  note                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index fin_inventory_user_idx    on public.fin_inventory (user_id);
create index fin_inventory_status_idx  on public.fin_inventory (user_id, status);

create trigger fin_inventory_set_updated_at
  before update on public.fin_inventory
  for each row execute function public.set_updated_at();

alter table public.fin_inventory enable row level security;
create policy "deny all — fin_inventory"
  on public.fin_inventory as restrictive
  for all to authenticated, anon using (false);
