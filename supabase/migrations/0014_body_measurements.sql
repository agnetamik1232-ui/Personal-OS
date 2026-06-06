-- ── Body Measurements ────────────────────────────────────────────────────────
create table if not exists public.body_measurements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  log_date    date not null default current_date,
  weight_kg   numeric(5,2),
  waist_cm    numeric(5,1),
  hips_cm     numeric(5,1),
  chest_cm    numeric(5,1),
  arm_cm      numeric(5,1),
  thigh_cm    numeric(5,1),
  notes       text,
  created_at  timestamptz not null default now(),
  unique(user_id, log_date)
);
alter table public.body_measurements enable row level security;

-- ── Period Tracker ────────────────────────────────────────────────────────────
create table if not exists public.period_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  log_date    date not null,
  flow        text,   -- none | spotting | light | medium | heavy
  symptoms    text[], -- cramps | bloating | mood_swings | fatigue | headache | acne | cravings
  mood        text,   -- great | good | okay | low | bad
  pain_level  integer, -- 0-10
  notes       text,
  created_at  timestamptz not null default now(),
  unique(user_id, log_date)
);
alter table public.period_logs enable row level security;

-- ── Supplements ───────────────────────────────────────────────────────────────
create table if not exists public.supplements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  dose        text,
  timing      text default 'morning', -- morning | afternoon | evening | with_meal | before_bed
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.supplement_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  supplement_id uuid not null references public.supplements(id) on delete cascade,
  log_date    date not null default current_date,
  taken       boolean not null default true,
  unique(user_id, supplement_id, log_date)
);

alter table public.supplements     enable row level security;
alter table public.supplement_logs enable row level security;
