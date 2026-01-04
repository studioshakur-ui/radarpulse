-- supabase/sql/real_sources_us_uk_eu.sql
-- RadarPulse — Activation des vraies sources AO (US / UK / UE)

begin;

-- 0) Stopper les sources test
update public.sources
set is_active = false
where key in ('test_rss', 'test_source');

-- 1) US — SAM.gov Contract Opportunities
insert into public.sources (
  key, name, kind, url, country_code, is_active, schedule_minutes, meta
)
values (
  'us_sam_gov_contract_opportunities',
  'SAM.gov — Contract Opportunities (US)',
  'api',
  'https://api.sam.gov/prod/opportunities/v2/search',
  'US',
  true,
  30,
  jsonb_build_object(
    'provider', 'us_sam_gov',
    'limit', 50,
    'max_pages', 5,
    'ptypes', 'p,o,k',
    'q', ''
  )
)
on conflict (key) do update
set name = excluded.name,
    kind = excluded.kind,
    url = excluded.url,
    country_code = excluded.country_code,
    is_active = excluded.is_active,
    schedule_minutes = excluded.schedule_minutes,
    meta = excluded.meta;

-- 2) UK — Find a Tender (FTS) — OCDS Release Packages
insert into public.sources (
  key, name, kind, url, country_code, is_active, schedule_minutes, meta
)
values (
  'uk_find_a_tender',
  'Find a Tender — OCDS Release Packages (UK)',
  'api',
  'https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages',
  'GB',
  true,
  30,
  jsonb_build_object(
    'provider', 'uk_find_tender',
    'limit', 50,
    'max_pages', 10
  )
)
on conflict (key) do update
set name = excluded.name,
    kind = excluded.kind,
    url = excluded.url,
    country_code = excluded.country_code,
    is_active = excluded.is_active,
    schedule_minutes = excluded.schedule_minutes,
    meta = excluded.meta;

-- 3) UE — TED Search API (scope ACTIVE)
insert into public.sources (
  key, name, kind, url, country_code, is_active, schedule_minutes, meta
)
values (
  'eu_ted_active',
  'TED — Active notices (EU)',
  'api',
  'https://api.ted.europa.eu/v3/notices/search',
  null,
  true,
  60,
  jsonb_build_object(
    'provider', 'eu_ted_search',
    'scope', 'ACTIVE',
    'page', 1,
    'limit', 25
  )
)
on conflict (key) do update
set name = excluded.name,
    kind = excluded.kind,
    url = excluded.url,
    country_code = excluded.country_code,
    is_active = excluded.is_active,
    schedule_minutes = excluded.schedule_minutes,
    meta = excluded.meta;

commit;
