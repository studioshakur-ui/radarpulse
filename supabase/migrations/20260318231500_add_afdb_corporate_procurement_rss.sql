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
  'afdb_corporate_procurement_rss',
  'African Development Bank - Corporate Procurement RSS',
  'rss',
  'https://www.afdb.org/en/corporate-procurement/projects-and-operations/news-and-events/projects-and-operations/news-and-events/rss',
  null,
  true,
  120,
  jsonb_build_object(
    'default_lang', 'en',
    'default_type', 'tender',
    'default_buyer', 'African Development Bank'
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
