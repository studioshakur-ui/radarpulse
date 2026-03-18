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
  'fr_boamp_active',
  'BOAMP - Active notices (France)',
  'api',
  'https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records',
  'FR',
  true,
  60,
  jsonb_build_object(
    'provider', 'fr_boamp',
    'base_url', 'https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records',
    'limit', 50,
    'max_pages', 10,
    'select', 'idweb,dateparution,objet,nomacheteur,datelimitereponse,type_marche,url_avis,code_departement',
    'order_by', 'dateparution desc'
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
