-- Daily Check-In: core personal health + mood + reflection data
create table if not exists public.daily_checkins (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  date              date not null,
  -- Mood & Energy (1–10)
  mood              integer check (mood between 1 and 10),
  energy            integer check (energy between 1 and 10),
  mental_energy     integer check (mental_energy between 1 and 10),
  -- Sleep
  sleep_hours       numeric(3,1) check (sleep_hours between 0 and 24),
  sleep_quality     integer check (sleep_quality between 1 and 10),
  -- Weight (optional)
  weight_kg         numeric(5,2),
  -- Workout
  workout_done      boolean,
  workout_type      text,
  workout_minutes   integer,
  -- Digestion & symptoms
  digestion         integer check (digestion between 1 and 10),
  symptoms          text[] not null default '{}',
  -- Reflection
  biggest_win       text,
  biggest_challenge text,
  notes             text,
  -- Status
  completed         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(user_id, date)
);
create index if not exists daily_checkins_user_date on public.daily_checkins(user_id, date desc);
alter table public.daily_checkins enable row level security;
create policy "deny all daily_checkins" on public.daily_checkins as restrictive for all to authenticated, anon using (false);
