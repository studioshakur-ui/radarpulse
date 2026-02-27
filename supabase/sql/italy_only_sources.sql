-- RadarPulse - IT-only ingestion policy
-- Goal: keep all sources, but deactivate any non-Italian source.

-- 1) Default: disable non-IT country sources
update public.sources
set is_active = false
where coalesce(country_code, '') <> 'IT';

-- 2) Provider-level safeguard: keep only eu_ted_search active
update public.sources
set is_active = false
where coalesce(meta->>'provider', '') <> ''
  and coalesce(meta->>'provider', '') <> 'eu_ted_search';

-- 3) Ensure TED Italy source is marked IT and active
update public.sources
set country_code = 'IT',
    is_active = true
where coalesce(meta->>'provider', '') = 'eu_ted_search';

-- 4) Optional visibility query: active sources after enforcement
-- select key, name, country_code, is_active, meta->>'provider' as provider
-- from public.sources
-- where is_active = true
-- order by key;
