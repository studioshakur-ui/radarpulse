create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id),
  source_key text not null,
  started_at timestamp with time zone not null default now(),
  finished_at timestamp with time zone,
  status text not null default 'RUNNING',
  fetched_count int not null default 0,
  raw_upserted_count int not null default 0,
  opp_upserted_count int not null default 0,
  error text,
  cursor text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists ingestion_runs_source_key_started_idx
  on public.ingestion_runs (source_key, started_at desc);
