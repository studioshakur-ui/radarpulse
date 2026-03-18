alter table public.opportunity_scores
add column if not exists recommendation text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'opportunity_scores_recommendation_check'
  ) then
    alter table public.opportunity_scores
      add constraint opportunity_scores_recommendation_check
      check (recommendation is null or recommendation in ('GO', 'HOLD', 'NO_GO'));
  end if;
end
$$;

comment on column public.opportunity_scores.recommendation is
  'Explicit recommendation derived from the current score: GO, HOLD, or NO_GO.';
