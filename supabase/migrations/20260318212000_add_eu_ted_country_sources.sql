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
    'eu_ted_fr_active',
    'TED - France (active notices)',
    'api',
    'https://api.ted.europa.eu/v3/notices/search',
    'FR',
    true,
    60,
    jsonb_build_object(
      'provider', 'eu_ted_search',
      'base_url', 'https://api.ted.europa.eu/v3/notices/search',
      'scope', 'ACTIVE',
      'page', 1,
      'limit', 25,
      'paginationMode', 'PAGE_NUMBER',
      'onlyLatestVersions', true,
      'query', 'publication-date >= 20250318 AND buyer-country IN (FRA)'
    ),
    'EU'
  ),
  (
    'eu_ted_de_active',
    'TED - Germany (active notices)',
    'api',
    'https://api.ted.europa.eu/v3/notices/search',
    'DE',
    true,
    60,
    jsonb_build_object(
      'provider', 'eu_ted_search',
      'base_url', 'https://api.ted.europa.eu/v3/notices/search',
      'scope', 'ACTIVE',
      'page', 1,
      'limit', 25,
      'paginationMode', 'PAGE_NUMBER',
      'onlyLatestVersions', true,
      'query', 'publication-date >= 20250318 AND buyer-country IN (DEU)'
    ),
    'EU'
  ),
  (
    'eu_ted_es_active',
    'TED - Spain (active notices)',
    'api',
    'https://api.ted.europa.eu/v3/notices/search',
    'ES',
    true,
    60,
    jsonb_build_object(
      'provider', 'eu_ted_search',
      'base_url', 'https://api.ted.europa.eu/v3/notices/search',
      'scope', 'ACTIVE',
      'page', 1,
      'limit', 25,
      'paginationMode', 'PAGE_NUMBER',
      'onlyLatestVersions', true,
      'query', 'publication-date >= 20250318 AND buyer-country IN (ESP)'
    ),
    'EU'
  ),
  (
    'eu_ted_pl_active',
    'TED - Poland (active notices)',
    'api',
    'https://api.ted.europa.eu/v3/notices/search',
    'PL',
    true,
    60,
    jsonb_build_object(
      'provider', 'eu_ted_search',
      'base_url', 'https://api.ted.europa.eu/v3/notices/search',
      'scope', 'ACTIVE',
      'page', 1,
      'limit', 25,
      'paginationMode', 'PAGE_NUMBER',
      'onlyLatestVersions', true,
      'query', 'publication-date >= 20250318 AND buyer-country IN (POL)'
    ),
    'EU'
  ),
  (
    'eu_ted_ro_active',
    'TED - Romania (active notices)',
    'api',
    'https://api.ted.europa.eu/v3/notices/search',
    'RO',
    true,
    60,
    jsonb_build_object(
      'provider', 'eu_ted_search',
      'base_url', 'https://api.ted.europa.eu/v3/notices/search',
      'scope', 'ACTIVE',
      'page', 1,
      'limit', 25,
      'paginationMode', 'PAGE_NUMBER',
      'onlyLatestVersions', true,
      'query', 'publication-date >= 20250318 AND buyer-country IN (ROU)'
    ),
    'EU'
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
