-- ═══════════════════════════════════════════════════════════════════════════
-- Personal OS — 0001 initial schema
-- ═══════════════════════════════════════════════════════════════════════════

-- pgvector extension (must be enabled before referencing vector type)
create extension if not exists vector with schema extensions;

-- ─── Helper: auto-update updated_at ─────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: entities
-- Named things the user cares about: people, companies, projects, places, etc.
-- ════════════════════════════════════════════════════════════════════════════
create table public.entities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  kind        text not null,                 -- e.g. 'person', 'company', 'project'
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index entities_user_id_idx  on public.entities (user_id);
create index entities_kind_idx     on public.entities (user_id, kind);
create index entities_metadata_idx on public.entities using gin (metadata);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: raw_captures
-- Raw inbound items from Telegram, email, web, voice, etc.
-- ════════════════════════════════════════════════════════════════════════════
create table public.raw_captures (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  source          text not null,             -- 'telegram' | 'email' | 'web' | 'voice' | 'manual'
  raw_text        text,
  audio_url       text,
  classification  jsonb not null default '{}',  -- LLM classification output
  llm_source      text,                      -- which model performed classification
  routed_to       text,                      -- 'task' | 'daily_log' | 'memory' | 'entity' | null
  routed_id       uuid,                      -- FK to the record it was routed into
  created_at      timestamptz not null default now()
);

create index raw_captures_user_id_idx   on public.raw_captures (user_id);
create index raw_captures_source_idx    on public.raw_captures (user_id, source);
create index raw_captures_routed_idx    on public.raw_captures (user_id, routed_to, routed_id);
create index raw_captures_created_idx   on public.raw_captures (user_id, created_at desc);
create index raw_captures_class_idx     on public.raw_captures using gin (classification);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: tasks
-- ════════════════════════════════════════════════════════════════════════════
create table public.tasks (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  title               text not null,
  description         text,
  urgency             text,                  -- 'low' | 'medium' | 'high' | 'urgent'
  key                 boolean not null default false,
  priority_score      numeric(5, 2),         -- computed / AI-assigned 0–100
  time_estimate_min   integer,               -- estimated effort in minutes
  tags                text[] not null default '{}',
  due_date            date,
  owner               text,                  -- free-text assignee / person label
  entity_id           uuid references public.entities(id) on delete set null,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index tasks_user_id_idx      on public.tasks (user_id);
create index tasks_due_date_idx     on public.tasks (user_id, due_date);
create index tasks_completed_idx    on public.tasks (user_id, completed_at);
create index tasks_entity_id_idx    on public.tasks (entity_id);
create index tasks_tags_idx         on public.tasks using gin (tags);
create index tasks_priority_idx     on public.tasks (user_id, priority_score desc nulls last);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: daily_logs
-- One row per user per calendar day. notes stores structured JSON (habits,
-- nutrition, finance, goals) for flexibility without schema lock-in.
-- ════════════════════════════════════════════════════════════════════════════
create table public.daily_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  log_date    date not null,
  notes       text,                          -- serialised JSON blob
  mood        smallint check (mood between 1 and 10),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (user_id, log_date)
);

create index daily_logs_user_date_idx on public.daily_logs (user_id, log_date desc);

create trigger daily_logs_set_updated_at
  before update on public.daily_logs
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: memory_chunks
-- Chunked text + embeddings for semantic search / AI memory.
-- Requires pgvector (enabled above).
-- ════════════════════════════════════════════════════════════════════════════
create table public.memory_chunks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  source_type  text not null,                -- 'task' | 'daily_log' | 'capture' | 'note' | 'entity'
  source_id    uuid,                         -- FK to originating record (nullable for manual entries)
  text         text not null,
  embedding    extensions.vector(1536),      -- OpenAI text-embedding-3-small / ada-002
  created_at   timestamptz not null default now()
);

create index memory_chunks_user_id_idx on public.memory_chunks (user_id);
create index memory_chunks_source_idx  on public.memory_chunks (user_id, source_type, source_id);

-- ivfflat index for approximate nearest-neighbour cosine search.
-- lists=100 is a reasonable default; tune upward when row count exceeds ~1M.
create index memory_chunks_embedding_idx
  on public.memory_chunks
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: audit_log
-- Immutable append-only log — no updated_at, no on delete cascade.
-- user_id set null if the user is deleted (retain the audit trail).
-- ════════════════════════════════════════════════════════════════════════════
create table public.audit_log (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,
  action         text not null,              -- 'create' | 'update' | 'delete' | 'route' | etc.
  resource_type  text not null,              -- table / domain name
  resource_id    uuid,
  metadata       jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

create index audit_log_user_id_idx    on public.audit_log (user_id);
create index audit_log_resource_idx   on public.audit_log (resource_type, resource_id);
create index audit_log_created_idx    on public.audit_log (created_at desc);
create index audit_log_metadata_idx   on public.audit_log using gin (metadata);

-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- Deny-all on every table. The service role bypasses RLS automatically.
-- Real user-facing policies will be added in subsequent migrations.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.entities       enable row level security;
alter table public.raw_captures   enable row level security;
alter table public.tasks          enable row level security;
alter table public.daily_logs     enable row level security;
alter table public.memory_chunks  enable row level security;
alter table public.audit_log      enable row level security;

-- Deny-all fallback policies (no authenticated or anon role can read or write)
create policy "deny all — entities"
  on public.entities as restrictive
  for all to authenticated, anon
  using (false);

create policy "deny all — raw_captures"
  on public.raw_captures as restrictive
  for all to authenticated, anon
  using (false);

create policy "deny all — tasks"
  on public.tasks as restrictive
  for all to authenticated, anon
  using (false);

create policy "deny all — daily_logs"
  on public.daily_logs as restrictive
  for all to authenticated, anon
  using (false);

create policy "deny all — memory_chunks"
  on public.memory_chunks as restrictive
  for all to authenticated, anon
  using (false);

create policy "deny all — audit_log"
  on public.audit_log as restrictive
  for all to authenticated, anon
  using (false);
