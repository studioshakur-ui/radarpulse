-- RadarPulse local seed adjustments (applied after migrations on db reset).
-- Keep this file idempotent.

-- Multi-country source policy: all known providers active on local reset.
update public.sources
set is_active = true,
    updated_at = now()
where coalesce(meta->>'provider', '') in (
  'eu_ted_search', 'uk_find_tender', 'us_sam_gov', 'us_grants_gov', 'it_anac_ocds'
);

-- TED covers the whole EU — keep its country_code as "EU".
update public.sources
set country_code = 'EU',
    is_active = true,
    updated_at = now()
where coalesce(meta->>'provider', '') = 'eu_ted_search';

-- Ensure Inbox visibility for all existing opportunities.
update public.opportunities
set is_public = true
where is_public = false;
