-- RadarPulse: enforce IT-only ingestion policy.
-- Idempotent and production-safe.

-- 1) Keep visibility default aligned with Inbox expectations.
alter table public.opportunities
  alter column is_public set default true;

-- 2) Make existing Italian opportunities publicly visible by default.
update public.opportunities
set is_public = true
where country_code = 'IT'
  and is_public = false;

-- 3) Deactivate all non-Italian sources.
update public.sources
set is_active = false,
    updated_at = now()
where coalesce(country_code, '') <> 'IT';

-- 4) Defensive provider-level lockdown (only TED provider allowed).
update public.sources
set is_active = false,
    updated_at = now()
where coalesce(meta->>'provider', '') in ('uk_find_tender', 'us_sam_gov', 'us_grants_gov');

-- 5) Ensure TED sources are IT and active for this deployment mode.
update public.sources
set country_code = 'IT',
    is_active = true,
    updated_at = now()
where coalesce(meta->>'provider', '') = 'eu_ted_search';
