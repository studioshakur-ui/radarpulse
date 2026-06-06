create table public.opportunity_workflows (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null
    references public.opportunities(id)
    on delete cascade,
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
  workflow_status text not null
    check (workflow_status in ('NEW', 'REVIEWED', 'GO', 'PREPARATION', 'READY', 'SUBMITTED', 'EXPIRED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (opportunity_id, user_id)
);

create index opportunity_workflows_user_id_idx
  on public.opportunity_workflows (user_id);

create index opportunity_workflows_opportunity_id_idx
  on public.opportunity_workflows (opportunity_id);

create or replace function public.set_updated_at_opportunity_workflows()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_opportunity_workflows_updated_at
  before update on public.opportunity_workflows
  for each row execute procedure public.set_updated_at_opportunity_workflows();

alter table public.opportunity_workflows enable row level security;

create policy "Users manage own workflows"
  on public.opportunity_workflows
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Service role reads all workflows"
  on public.opportunity_workflows
  for select
  to service_role
  using (true);

comment on table public.opportunity_workflows is 'Current workflow status per opportunity and user.';
comment on column public.opportunity_workflows.workflow_status is 'User-scoped dossier progression state.';
