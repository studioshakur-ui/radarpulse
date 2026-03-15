-- Sprint 3 / Phase 1 Step 2: persist AI briefs server-side.
-- One brief per opportunity (shared across users).
-- Edge function uses service role (bypasses RLS).
-- Authenticated users can read briefs via supabase client.

create table public.opportunity_briefs (
  id                  uuid        primary key default gen_random_uuid(),
  opportunity_id      uuid        not null
                                  references public.opportunities(id)
                                  on delete cascade,
  executive_summary   text        not null default '',
  fit_assessment      text        not null default '',
  risk_flags          text[]      not null default '{}',
  required_documents  text[]      not null default '{}',
  next_action         text        not null default '',
  model               text        not null default '',
  prompt_version      text        not null default 'v1',
  generation_ms       integer,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (opportunity_id)
);

create index opportunity_briefs_opportunity_id_idx
  on public.opportunity_briefs (opportunity_id);

-- Updated-at trigger
create or replace function public.set_updated_at_opportunity_briefs()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_opportunity_briefs_updated_at
  before update on public.opportunity_briefs
  for each row execute procedure public.set_updated_at_opportunity_briefs();

-- RLS
alter table public.opportunity_briefs enable row level security;

-- Authenticated users can read any brief (briefs are shared, not user-specific)
create policy "Authenticated can read opportunity briefs"
  on public.opportunity_briefs
  for select
  to authenticated
  using (true);

-- Service role can do everything (edge function writes)
create policy "Service role manages opportunity briefs"
  on public.opportunity_briefs
  for all
  to service_role
  using (true)
  with check (true);
