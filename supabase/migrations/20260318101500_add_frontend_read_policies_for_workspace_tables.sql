alter table public.agent_runs enable row level security;
alter table public.opportunity_extractions enable row level security;
alter table public.opportunity_scores enable row level security;
alter table public.brief_versions enable row level security;

grant select on table public.agent_runs to authenticated;
grant select on table public.opportunity_extractions to authenticated;
grant select on table public.opportunity_scores to authenticated;
grant select on table public.brief_versions to authenticated;

drop policy if exists "Authenticated read workspace timeline agent runs" on public.agent_runs;
create policy "Authenticated read workspace timeline agent runs"
  on public.agent_runs
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or (
      user_id is null
      and agent_type = 'extract'
      and opportunity_id is not null
      and exists (
        select 1
        from public.opportunities o
        where o.id = agent_runs.opportunity_id
          and o.is_public = true
          and coalesce(o.is_deleted, false) = false
      )
    )
  );

drop policy if exists "Authenticated can read opportunity extractions" on public.opportunity_extractions;
create policy "Authenticated can read opportunity extractions"
  on public.opportunity_extractions
  for select
  to authenticated
  using (
    is_current = true
    and exists (
      select 1
      from public.opportunities o
      where o.id = opportunity_extractions.opportunity_id
        and o.is_public = true
        and coalesce(o.is_deleted, false) = false
    )
  );

drop policy if exists "Users read own opportunity scores" on public.opportunity_scores;
create policy "Users read own opportunity scores"
  on public.opportunity_scores
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Authenticated can read brief versions" on public.brief_versions;
create policy "Authenticated can read brief versions"
  on public.brief_versions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.opportunities o
      where o.id = brief_versions.opportunity_id
        and o.is_public = true
        and coalesce(o.is_deleted, false) = false
    )
  );
