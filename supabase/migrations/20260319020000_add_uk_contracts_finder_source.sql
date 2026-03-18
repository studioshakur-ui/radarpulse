insert into public.sources (
  key,
  name,
  kind,
  url,
  country_code,
  is_active,
  schedule_minutes,
  meta,
  origin_type
)
values (
  'uk_contracts_finder_active',
  'Contracts Finder - Published notices',
  'api',
  'https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search',
  'GB',
  true,
  60,
  jsonb_build_object(
    'provider', 'uk_contracts_finder',
    'limit', 100,
    'stages', 'planning,tender'
  ),
  'OTHER'
)
on conflict (key) do update
set
  name = excluded.name,
  kind = excluded.kind,
  url = excluded.url,
  country_code = excluded.country_code,
  is_active = excluded.is_active,
  schedule_minutes = excluded.schedule_minutes,
  meta = excluded.meta,
  origin_type = excluded.origin_type,
  updated_at = now();
