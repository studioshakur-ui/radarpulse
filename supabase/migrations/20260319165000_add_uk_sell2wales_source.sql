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
  'uk_sell2wales_active',
  'Sell2Wales - Contract notices',
  'api',
  'https://api.sell2wales.gov.wales/v1/Notices',
  'GB',
  true,
  60,
  jsonb_build_object(
    'provider', 'uk_sell2wales',
    'notice_types', jsonb_build_array(2, 51),
    'output_type', 0,
    'locale', 2057,
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
