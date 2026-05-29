-- 0003: Finance v2 — categories, budgets, recurring, extended transactions

alter table public.fin_transactions
  add column if not exists subcategory text,
  add column if not exists merchant    text,
  add column if not exists tags        text[] default '{}';

create table if not exists public.fin_categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  parent_id  uuid references public.fin_categories(id) on delete cascade,
  icon       text not null default '📦',
  color      text not null default '#6B7280',
  cat_type   text not null default 'expense',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists fin_categories_user on public.fin_categories(user_id);
alter table public.fin_categories enable row level security;
create policy "deny all fin_categories" on public.fin_categories as restrictive for all to authenticated, anon using (false);

create table if not exists public.fin_budgets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  category   text not null,
  amount     numeric(14,2) not null check (amount > 0),
  period     text not null default 'monthly',
  created_at timestamptz not null default now()
);
create unique index if not exists fin_budgets_user_cat on public.fin_budgets(user_id, category);
alter table public.fin_budgets enable row level security;
create policy "deny all fin_budgets" on public.fin_budgets as restrictive for all to authenticated, anon using (false);

create table if not exists public.fin_recurring (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  type        text not null default 'expense',
  amount      numeric(14,2) not null check (amount > 0),
  category    text not null default 'Other',
  account_id  uuid references public.fin_accounts(id) on delete set null,
  frequency   text not null default 'monthly',
  next_date   date not null,
  note        text,
  auto_create boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists fin_recurring_user on public.fin_recurring(user_id);
alter table public.fin_recurring enable row level security;
create policy "deny all fin_recurring" on public.fin_recurring as restrictive for all to authenticated, anon using (false);
