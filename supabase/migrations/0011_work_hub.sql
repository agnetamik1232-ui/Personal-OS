-- ── Work Issues ───────────────────────────────────────────────────────────────
create table if not exists public.work_issues (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  priority    text not null default 'medium', -- low | medium | high | critical
  status      text not null default 'open',   -- open | in_progress | resolved | closed
  owner       text,
  workstation text,
  due_date    date,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Work Notes (production log) ───────────────────────────────────────────────
create table if not exists public.work_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  content    text not null,
  category   text not null default 'observation', -- observation | issue | defect | training | material | machine | quality | handover
  tags       text[] not null default '{}',
  pinned     boolean not null default false,
  shift_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ── Improvement Ideas ─────────────────────────────────────────────────────────
create table if not exists public.work_ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  category    text not null default 'process', -- process | quality | cost | automation | safety
  status      text not null default 'pending', -- pending | approved | in_progress | implemented | rejected
  impact      text not null default 'medium',  -- low | medium | high
  owner       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Defects ───────────────────────────────────────────────────────────────────
create table if not exists public.work_defects (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  defect_type      text not null,
  quantity         integer not null default 1,
  workstation      text,
  operator         text,
  root_cause       text,
  corrective_action text,
  status           text not null default 'open', -- open | resolved
  shift_date       date not null default current_date,
  created_at       timestamptz not null default now()
);

-- ── Checklist Items ───────────────────────────────────────────────────────────
create table if not exists public.work_checklist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  period      text not null, -- morning | midday | end_of_shift | daily | monday | friday | weekly | monthly
  shift_type  text not null default 'day', -- day | night | both
  sort_order  integer not null default 0,
  active      boolean not null default true
);

-- ── Checklist Completions ─────────────────────────────────────────────────────
create table if not exists public.work_checklist_done (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  item_id     uuid not null references public.work_checklist(id) on delete cascade,
  done_date   date not null default current_date,
  unique(user_id, item_id, done_date)
);

-- RLS: deny all (service role bypasses)
alter table public.work_issues         enable row level security;
alter table public.work_notes          enable row level security;
alter table public.work_ideas          enable row level security;
alter table public.work_defects        enable row level security;
alter table public.work_checklist      enable row level security;
alter table public.work_checklist_done enable row level security;

create policy "deny all" on public.work_issues         as restrictive for all using (false);
create policy "deny all" on public.work_notes          as restrictive for all using (false);
create policy "deny all" on public.work_ideas          as restrictive for all using (false);
create policy "deny all" on public.work_defects        as restrictive for all using (false);
create policy "deny all" on public.work_checklist      as restrictive for all using (false);
create policy "deny all" on public.work_checklist_done as restrictive for all using (false);

-- ── Seed default checklist items ─────────────────────────────────────────────
-- These will be inserted via the API on first load
