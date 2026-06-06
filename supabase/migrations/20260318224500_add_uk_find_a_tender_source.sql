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
  'uk_find_a_tender',
  'Find a Tender - OCDS Release Packages (UK)',
  'api',
  'https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages',
  'GB',
  true,
  30,
  jsonb_build_object(
    'provider', 'uk_find_tender',
    'limit', 50,
    'max_pages', 10
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
