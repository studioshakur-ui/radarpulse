create table public.dossiers (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null
    references public.opportunities(id)
    on delete cascade,
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
  status text not null
    check (status in ('NEW', 'REVIEW', 'GO', 'HOLD', 'BLOCKED', 'READY', 'SUBMITTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (opportunity_id, user_id)
);

create table public.dossier_tasks (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null
    references public.dossiers(id)
    on delete cascade,
  label text not null,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

create index dossiers_user_id_idx
  on public.dossiers (user_id);

create index dossiers_status_idx
  on public.dossiers (status);

create index dossiers_opportunity_id_idx
  on public.dossiers (opportunity_id);

create index dossier_tasks_dossier_id_idx
  on public.dossier_tasks (dossier_id);

create or replace function public.set_updated_at_dossiers()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_dossiers_updated_at
  before update on public.dossiers
  for each row execute procedure public.set_updated_at_dossiers();

alter table public.dossiers enable row level security;
alter table public.dossier_tasks enable row level security;

create policy "Users read own dossiers"
  on public.dossiers
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Service role manages dossiers"
  on public.dossiers
  for all
  to service_role
  using (true)
  with check (true);

create policy "Users read own dossier tasks"
  on public.dossier_tasks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.dossiers d
      where d.id = dossier_tasks.dossier_id
        and d.user_id = auth.uid()
    )
  );

create policy "Service role manages dossier tasks"
  on public.dossier_tasks
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.dossiers from public;
revoke all on table public.dossiers from anon;
revoke insert, update, delete on table public.dossiers from authenticated;
grant select on table public.dossiers to authenticated;
grant all on table public.dossiers to service_role;

revoke all on table public.dossier_tasks from public;
revoke all on table public.dossier_tasks from anon;
revoke insert, update, delete on table public.dossier_tasks from authenticated;
grant select on table public.dossier_tasks to authenticated;
grant all on table public.dossier_tasks to service_role;

comment on table public.dossiers is 'User-scoped dossier work objects layered on top of canonical opportunities.';
comment on column public.dossiers.opportunity_id is 'Canonical opportunity that anchors this dossier.';
comment on column public.dossiers.user_id is 'User who owns this dossier.';
comment on column public.dossiers.status is 'Minimal dossier work state.';

comment on table public.dossier_tasks is 'Minimal checklist items attached to a dossier.';
comment on column public.dossier_tasks.label is 'Short actionable task label.';
