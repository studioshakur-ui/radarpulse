-- Sprint 3 / Phase 1 Step 4: persist GO/HOLD/NO_GO decisions server-side.
-- One decision per (opportunity, user). Toggle = delete row.
-- Web client uses user JWT (RLS enforced).

create table public.opportunity_decisions (
  id              uuid        primary key default gen_random_uuid(),
  opportunity_id  uuid        not null
                              references public.opportunities(id)
                              on delete cascade,
  user_id         uuid        not null
                              references auth.users(id)
                              on delete cascade,
  decision        text        not null
                              check (decision in ('GO', 'HOLD', 'NO_GO')),
  note            text,
  decided_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (opportunity_id, user_id)
);

create index opportunity_decisions_user_id_idx
  on public.opportunity_decisions (user_id);

create index opportunity_decisions_opportunity_id_idx
  on public.opportunity_decisions (opportunity_id);

-- Updated-at trigger
create or replace function public.set_updated_at_opportunity_decisions()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_opportunity_decisions_updated_at
  before update on public.opportunity_decisions
  for each row execute procedure public.set_updated_at_opportunity_decisions();

-- RLS
alter table public.opportunity_decisions enable row level security;

-- Users can read, insert, update and delete their own decisions only
create policy "Users manage own decisions"
  on public.opportunity_decisions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role can read all (for analytics / admin)
create policy "Service role reads all decisions"
  on public.opportunity_decisions
  for select
  to service_role
  using (true);
