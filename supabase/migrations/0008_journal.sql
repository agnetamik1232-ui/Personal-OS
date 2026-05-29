-- Reflection Center: rich journal entries, wins vault, lessons learned
create table if not exists public.journal_entries (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  date               date not null,
  title              text,
  content            text not null default '',
  prompts            jsonb not null default '{}',
  mood               integer check (mood between 1 and 5),
  energy             integer check (energy between 1 and 5),
  stress             integer check (stress between 1 and 5),
  focus              integer check (focus between 1 and 5),
  score_productivity integer check (score_productivity between 1 and 10),
  score_mood         integer check (score_mood between 1 and 10),
  score_energy       integer check (score_energy between 1 and 10),
  score_focus        integer check (score_focus between 1 and 10),
  score_overall      integer check (score_overall between 1 and 10),
  tags               text[] not null default '{}',
  life_area          text,
  word_count         integer not null default 0,
  gratitude          text[] not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique(user_id, date)
);
create index if not exists journal_entries_user_date on public.journal_entries(user_id, date desc);
alter table public.journal_entries enable row level security;
create policy "deny all journal_entries" on public.journal_entries as restrictive for all to authenticated, anon using (false);

create table if not exists public.journal_wins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null default current_date,
  title       text not null,
  description text,
  category    text,
  created_at  timestamptz not null default now()
);
alter table public.journal_wins enable row level security;
create policy "deny all journal_wins" on public.journal_wins as restrictive for all to authenticated, anon using (false);

create table if not exists public.journal_lessons (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null default current_date,
  title       text not null,
  description text,
  category    text,
  created_at  timestamptz not null default now()
);
alter table public.journal_lessons enable row level security;
create policy "deny all journal_lessons" on public.journal_lessons as restrictive for all to authenticated, anon using (false);
