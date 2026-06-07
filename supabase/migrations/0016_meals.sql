-- ── Recipes ───────────────────────────────────────────────────────────────────
create table if not exists public.recipes (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  description         text,
  emoji               text default '🍽️',
  color               text default '#3D52D5',
  servings            integer not null default 1,
  prep_time           integer,   -- minutes
  cook_time           integer,   -- minutes
  kcal_per_serving    numeric(7,1) not null default 0,
  protein_per_serving numeric(6,1) not null default 0,
  carbs_per_serving   numeric(6,1) not null default 0,
  fat_per_serving     numeric(6,1) not null default 0,
  ingredients         jsonb not null default '[]',  -- [{name, amount, unit}]
  instructions        text,
  tags                text[] not null default '{}', -- e.g. pcos-friendly, high-protein, quick
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.recipes enable row level security;

-- ── Meal Plan ─────────────────────────────────────────────────────────────────
create table if not exists public.meal_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  plan_date   date not null,
  meal_type   text not null,  -- breakfast | lunch | dinner | snack
  recipe_id   uuid references public.recipes(id) on delete set null,
  custom_name text,           -- free-text if not from recipe
  servings    numeric(4,2) not null default 1,
  kcal        numeric(7,1) not null default 0,
  protein     numeric(6,1) not null default 0,
  carbs       numeric(6,1) not null default 0,
  fat         numeric(6,1) not null default 0,
  logged      boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.meal_plans enable row level security;
