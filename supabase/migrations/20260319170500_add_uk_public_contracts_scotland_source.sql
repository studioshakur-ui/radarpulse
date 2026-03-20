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
  'uk_public_contracts_scotland_active',
  'Public Contracts Scotland - Notices',
  'api',
  'https://api.publiccontractsscotland.gov.uk/v1/Notices',
  'GB',
  true,
  60,
  jsonb_build_object(
    'provider', 'uk_public_contracts_scotland',
    'notice_types', jsonb_build_array(2, 102),
    'output_type', 0,
    'months_back', 1
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
