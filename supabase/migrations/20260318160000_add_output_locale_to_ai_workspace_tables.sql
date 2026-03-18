alter table public.opportunity_briefs
  add column if not exists output_locale text;

alter table public.brief_versions
  add column if not exists output_locale text;

alter table public.opportunity_scores
  add column if not exists output_locale text;

alter table public.opportunity_preps
  add column if not exists output_locale text;

update public.opportunity_scores
set output_locale = 'en'
where output_locale is null;

update public.opportunity_preps
set output_locale = 'en'
where output_locale is null;

alter table public.opportunity_briefs
  alter column output_locale set default 'en';

alter table public.brief_versions
  alter column output_locale set default 'en';

alter table public.opportunity_scores
  alter column output_locale set default 'en';

alter table public.opportunity_preps
  alter column output_locale set default 'en';

alter table public.opportunity_briefs
  add constraint opportunity_briefs_output_locale_check
  check (output_locale in ('en', 'fr', 'it'));

alter table public.brief_versions
  add constraint brief_versions_output_locale_check
  check (output_locale in ('en', 'fr', 'it'));

alter table public.opportunity_scores
  add constraint opportunity_scores_output_locale_check
  check (output_locale in ('en', 'fr', 'it'));

alter table public.opportunity_preps
  add constraint opportunity_preps_output_locale_check
  check (output_locale in ('en', 'fr', 'it'));

comment on column public.opportunity_briefs.output_locale is 'UI locale requested when this brief text was generated.';
comment on column public.brief_versions.output_locale is 'UI locale requested when this brief version text was generated.';
comment on column public.opportunity_scores.output_locale is 'UI locale requested when this score rationale was generated.';
comment on column public.opportunity_preps.output_locale is 'UI locale requested when this prep plan was generated.';
