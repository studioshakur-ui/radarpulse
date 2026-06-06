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
values
  (
    'it_anac_ocds_p7',
    'ANAC - Open Data OCDS (page 7)',
    'api',
    'https://dati.anticorruzione.it/opendata/ocds/api',
    'IT',
    true,
    90,
    jsonb_build_object('provider', 'it_anac_ocds', 'page', 7, 'limit', 25),
    'IT_NATIVE'
  ),
  (
    'it_anac_ocds_p8',
    'ANAC - Open Data OCDS (page 8)',
    'api',
    'https://dati.anticorruzione.it/opendata/ocds/api',
    'IT',
    true,
    90,
    jsonb_build_object('provider', 'it_anac_ocds', 'page', 8, 'limit', 25),
    'IT_NATIVE'
  ),
  (
    'it_anac_ocds_p9',
    'ANAC - Open Data OCDS (page 9)',
    'api',
    'https://dati.anticorruzione.it/opendata/ocds/api',
    'IT',
    true,
    90,
    jsonb_build_object('provider', 'it_anac_ocds', 'page', 9, 'limit', 25),
    'IT_NATIVE'
  ),
  (
    'it_anac_ocds_p10',
    'ANAC - Open Data OCDS (page 10)',
    'api',
    'https://dati.anticorruzione.it/opendata/ocds/api',
    'IT',
    true,
    90,
    jsonb_build_object('provider', 'it_anac_ocds', 'page', 10, 'limit', 25),
    'IT_NATIVE'
  ),
  (
    'it_anac_ocds_p11',
    'ANAC - Open Data OCDS (page 11)',
    'api',
    'https://dati.anticorruzione.it/opendata/ocds/api',
    'IT',
    true,
    90,
    jsonb_build_object('provider', 'it_anac_ocds', 'page', 11, 'limit', 25),
    'IT_NATIVE'
  ),
  (
    'it_anac_ocds_p12',
    'ANAC - Open Data OCDS (page 12)',
    'api',
    'https://dati.anticorruzione.it/opendata/ocds/api',
    'IT',
    true,
    90,
    jsonb_build_object('provider', 'it_anac_ocds', 'page', 12, 'limit', 25),
    'IT_NATIVE'
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

update public.sources
set
  is_active = true,
  last_error = null,
  updated_at = now()
where key in (
  'it_roma_bandi_rss',
  'it_aria_lombardia_rss'
);

update public.sources
set
  is_active = false,
  last_error = 'Disabled: Comune di Milano RSS endpoint returns 403 Forbidden with current generic RSS connector',
  updated_at = now()
where key = 'it_milano_bandi_rss';
