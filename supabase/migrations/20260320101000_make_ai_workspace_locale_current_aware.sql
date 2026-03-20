update public.opportunity_briefs
set output_locale = 'en'
where output_locale is null;

update public.brief_versions
set output_locale = 'en'
where output_locale is null;

update public.opportunity_scores
set output_locale = 'en'
where output_locale is null;

update public.opportunity_preps
set output_locale = 'en'
where output_locale is null;

alter table public.opportunity_briefs
  alter column output_locale set not null;

alter table public.brief_versions
  alter column output_locale set not null;

alter table public.opportunity_scores
  alter column output_locale set not null;

alter table public.opportunity_preps
  alter column output_locale set not null;

alter table public.opportunity_briefs
  drop constraint if exists opportunity_briefs_opportunity_id_key;

alter table public.opportunity_briefs
  add constraint opportunity_briefs_opportunity_id_output_locale_key
  unique (opportunity_id, output_locale);

drop index if exists public.brief_versions_one_current_per_opportunity_idx;

create unique index if not exists brief_versions_one_current_per_opportunity_locale_idx
  on public.brief_versions (opportunity_id, output_locale)
  where is_current = true;

drop index if exists public.opportunity_scores_one_current_per_user_opportunity_idx;

create unique index if not exists opportunity_scores_one_current_per_user_opportunity_locale_idx
  on public.opportunity_scores (opportunity_id, user_id, output_locale)
  where is_current = true;

drop index if exists public.opportunity_preps_one_current_per_user_opportunity_idx;

create unique index if not exists opportunity_preps_one_current_per_user_opportunity_locale_idx
  on public.opportunity_preps (opportunity_id, user_id, output_locale)
  where is_current = true;
