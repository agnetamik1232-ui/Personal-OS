create table if not exists public.books (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  author        text,
  genre         text,
  cover_color   text default '#3D52D5',
  total_pages   integer,
  current_page  integer default 0,
  status        text not null default 'want',  -- want | reading | finished | dnf
  rating        integer,                        -- 1-5
  started_at    date,
  finished_at   date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.books enable row level security;
