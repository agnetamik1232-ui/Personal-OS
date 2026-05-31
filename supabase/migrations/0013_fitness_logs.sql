-- ── Fitness Workout Logs ──────────────────────────────────────────────────────
create table if not exists public.fitness_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  log_date      date not null default current_date,
  workout_day   text not null,   -- 'A' | 'B' | 'C' | '1' | '2' | '3' | '4'
  exercise_name text not null,
  set_number    integer not null default 1,
  weight_kg     numeric(6,2),    -- null = bodyweight
  reps_completed integer not null,
  reps_target   integer,         -- target from the plan
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists fitness_logs_user_date on public.fitness_logs(user_id, log_date desc);
create index if not exists fitness_logs_exercise   on public.fitness_logs(user_id, exercise_name, log_date desc);

alter table public.fitness_logs enable row level security;
-- RLS: deny all — service role bypasses
