-- Work Calendar & Salary Engine
create table if not exists public.work_shifts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  shift_type  text not null default 'day',
  start_time  text not null default '09:00',
  end_time    text not null default '17:00',
  break_min   integer not null default 30,
  notes       text,
  hours_worked numeric(5,2) not null default 0,
  gross_pay   numeric(10,2) not null default 0,
  is_holiday  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists work_shifts_user_date on public.work_shifts(user_id, date desc);
create unique index if not exists work_shifts_user_date_unique on public.work_shifts(user_id, date);
alter table public.work_shifts enable row level security;
create policy "deny all work_shifts" on public.work_shifts as restrictive for all to authenticated, anon using (false);

create table if not exists public.work_settings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade unique,
  hourly_rate     numeric(8,2) not null default 7.00,
  currency        text not null default 'EUR',
  tax_rate        numeric(5,4) not null default 0.3600,
  mult_day        numeric(4,2) not null default 1.00,
  mult_night      numeric(4,2) not null default 1.50,
  mult_overtime_day  numeric(4,2) not null default 1.50,
  mult_overtime_night numeric(4,2) not null default 2.00,
  mult_day_off    numeric(4,2) not null default 2.00,
  mult_holiday    numeric(4,2) not null default 2.00,
  mult_vacation   numeric(4,2) not null default 1.00,
  mult_sick       numeric(4,2) not null default 0.00,
  mult_unpaid     numeric(4,2) not null default 0.00,
  mult_custom     numeric(4,2) not null default 1.00,
  night_start     text not null default '18:00',
  night_end       text not null default '06:00',
  updated_at      timestamptz not null default now()
);
alter table public.work_settings enable row level security;
create policy "deny all work_settings" on public.work_settings as restrictive for all to authenticated, anon using (false);
