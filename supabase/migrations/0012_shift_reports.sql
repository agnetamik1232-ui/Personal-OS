-- ── Shift Reports (End-of-Shift Workflow) ────────────────────────────────────
-- Separate from work_shifts (salary calendar). This tracks daily hub sessions.
create table if not exists public.work_shift_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  shift_date   date not null default current_date,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  status       text not null default 'active', -- active | ended
  summary_lt   text,                           -- Lithuanian AI-generated report
  summary_data jsonb,                          -- snapshot: notes, issues, ideas, defects
  created_at   timestamptz not null default now(),
  unique(user_id, shift_date)
);

alter table public.work_shift_reports enable row level security;
