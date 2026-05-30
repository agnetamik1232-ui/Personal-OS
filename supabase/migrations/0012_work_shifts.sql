-- ── Work Shifts ───────────────────────────────────────────────────────────────
create table if not exists public.work_shifts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  shift_date   date not null default current_date,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  status       text not null default 'active', -- active | ended
  summary_lt   text,                           -- Lithuanian AI summary
  summary_data jsonb,                          -- snapshot of collected data
  created_at   timestamptz not null default now(),
  unique(user_id, shift_date)
);

alter table public.work_shifts enable row level security;
-- RLS: deny all — service role bypasses
