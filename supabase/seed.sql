-- RadarPulse local seed adjustments (applied after migrations on db reset).
-- Keep this file idempotent.

-- IT-only source policy for local reset.
update public.sources
set is_active = false,
    updated_at = now()
where coalesce(country_code, '') <> 'IT';

update public.sources
set is_active = false,
    updated_at = now()
where coalesce(meta->>'provider', '') in ('uk_find_tender', 'us_sam_gov', 'us_grants_gov');

update public.sources
set country_code = 'IT',
    is_active = true,
    updated_at = now()
where coalesce(meta->>'provider', '') = 'eu_ted_search';

-- Ensure Inbox visibility for IT opportunities.
update public.opportunities
set is_public = true
where country_code = 'IT'
  and is_public = false;
