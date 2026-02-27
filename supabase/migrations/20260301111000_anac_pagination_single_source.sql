update public.sources
set
  is_active = true,
  country_code = 'IT',
  origin_type = 'IT_NATIVE',
  meta = jsonb_build_object(
    'provider', 'it_anac_ocds',
    'base_url', 'https://dati.anticorruzione.it/opendata/ocds/api',
    'page', 1,
    'limit', 50,
    'cursor', null
  ),
  updated_at = now()
where key = 'it_anac_ocds';

update public.sources
set
  is_active = false,
  updated_at = now()
where key = 'it_anac_ocds_p2';
