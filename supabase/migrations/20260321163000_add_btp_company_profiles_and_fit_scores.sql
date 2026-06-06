create table if not exists public.btp_company_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  regions_active jsonb not null default '[]'::jsonb,
  cpv_focus jsonb not null default '[]'::jsonb,
  soa_profile jsonb not null default '[]'::jsonb,
  min_amount numeric(14,2),
  max_amount numeric(14,2),
  preferred_buyer_types jsonb not null default '[]'::jsonb,
  document_maturity_level text not null default 'STANDARD',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint btp_company_profiles_document_maturity_level_check check (document_maturity_level in ('BASIC','STANDARD','ADVANCED'))
);

create table if not exists public.btp_fit_scores (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.btp_company_profiles(id) on delete set null,
  fit_score integer not null,
  fit_band text not null,
  effort_band text not null,
  risk_band text not null,
  rationale_json jsonb not null default '{}'::jsonb,
  created_by_run_id uuid references public.agent_runs(id) on delete set null,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint btp_fit_scores_fit_score_check check (fit_score between 0 and 100),
  constraint btp_fit_scores_fit_band_check check (fit_band in ('LOW','MEDIUM','HIGH')),
  constraint btp_fit_scores_effort_band_check check (effort_band in ('LOW','MEDIUM','HIGH')),
  constraint btp_fit_scores_risk_band_check check (risk_band in ('LOW','MEDIUM','HIGH','BLOCKER'))
);

create unique index if not exists btp_company_profiles_one_default_per_user_idx
on public.btp_company_profiles(user_id)
where is_default = true;

create index if not exists btp_fit_scores_opportunity_user_idx on public.btp_fit_scores(opportunity_id, user_id);
create index if not exists btp_fit_scores_profile_id_idx on public.btp_fit_scores(profile_id);
create index if not exists btp_fit_scores_is_current_idx on public.btp_fit_scores(is_current);

create or replace function public.set_btp_company_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_btp_company_profiles_updated_at on public.btp_company_profiles;
create trigger trg_set_btp_company_profiles_updated_at
before update on public.btp_company_profiles
for each row execute function public.set_btp_company_profiles_updated_at();

create or replace function public.set_btp_fit_scores_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_btp_fit_scores_updated_at on public.btp_fit_scores;
create trigger trg_set_btp_fit_scores_updated_at
before update on public.btp_fit_scores
for each row execute function public.set_btp_fit_scores_updated_at();

alter table public.btp_company_profiles enable row level security;
alter table public.btp_fit_scores enable row level security;

create policy "users manage own btp_company_profiles"
on public.btp_company_profiles
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users read own btp_fit_scores"
on public.btp_fit_scores
for select
using (auth.uid() = user_id);

grant select, insert, update, delete on public.btp_company_profiles to authenticated;
grant all on public.btp_company_profiles to service_role;
grant select on public.btp_fit_scores to authenticated;
grant all on public.btp_fit_scores to service_role;
