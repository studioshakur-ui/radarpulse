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
    'fr_boamp_ile_de_france',
    'BOAMP - Ile-de-France',
    'api',
    'https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records',
    'FR',
    true,
    60,
    jsonb_build_object(
      'provider', 'fr_boamp',
      'limit', 100,
      'max_pages', 5,
      'where', 'code_departement in (''75'',''77'',''78'',''91'',''92'',''93'',''94'',''95'')'
    ),
    'OTHER'
  ),
  (
    'fr_boamp_auvergne_rhone_alpes',
    'BOAMP - Auvergne-Rhone-Alpes',
    'api',
    'https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records',
    'FR',
    true,
    60,
    jsonb_build_object(
      'provider', 'fr_boamp',
      'limit', 100,
      'max_pages', 5,
      'where', 'code_departement in (''01'',''03'',''07'',''15'',''26'',''38'',''42'',''43'',''63'',''69'',''73'',''74'')'
    ),
    'OTHER'
  ),
  (
    'fr_boamp_provence_alpes_cote_azur',
    'BOAMP - Provence-Alpes-Cote d''Azur',
    'api',
    'https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records',
    'FR',
    true,
    60,
    jsonb_build_object(
      'provider', 'fr_boamp',
      'limit', 100,
      'max_pages', 5,
      'where', 'code_departement in (''04'',''05'',''06'',''13'',''83'',''84'')'
    ),
    'OTHER'
  ),
  (
    'fr_boamp_occitanie',
    'BOAMP - Occitanie',
    'api',
    'https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records',
    'FR',
    true,
    60,
    jsonb_build_object(
      'provider', 'fr_boamp',
      'limit', 100,
      'max_pages', 5,
      'where', 'code_departement in (''09'',''11'',''12'',''30'',''31'',''32'',''34'',''46'',''48'',''65'',''66'',''81'',''82'')'
    ),
    'OTHER'
  ),
  (
    'fr_boamp_nouvelle_aquitaine',
    'BOAMP - Nouvelle-Aquitaine',
    'api',
    'https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records',
    'FR',
    true,
    60,
    jsonb_build_object(
      'provider', 'fr_boamp',
      'limit', 100,
      'max_pages', 5,
      'where', 'code_departement in (''16'',''17'',''19'',''23'',''24'',''33'',''40'',''47'',''64'',''79'',''86'',''87'')'
    ),
    'OTHER'
  ),
  (
    'fr_boamp_hauts_de_france',
    'BOAMP - Hauts-de-France',
    'api',
    'https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records',
    'FR',
    true,
    60,
    jsonb_build_object(
      'provider', 'fr_boamp',
      'limit', 100,
      'max_pages', 5,
      'where', 'code_departement in (''02'',''59'',''60'',''62'',''80'')'
    ),
    'OTHER'
  ),
  (
    'it_anac_ocds_p3',
    'ANAC - Open Data OCDS (page 3)',
    'api',
    'https://dati.anticorruzione.it/opendata/ocds/api',
    'IT',
    true,
    90,
    jsonb_build_object('provider', 'it_anac_ocds', 'page', 3, 'limit', 25),
    'IT_NATIVE'
  ),
  (
    'it_anac_ocds_p4',
    'ANAC - Open Data OCDS (page 4)',
    'api',
    'https://dati.anticorruzione.it/opendata/ocds/api',
    'IT',
    true,
    90,
    jsonb_build_object('provider', 'it_anac_ocds', 'page', 4, 'limit', 25),
    'IT_NATIVE'
  ),
  (
    'it_anac_ocds_p5',
    'ANAC - Open Data OCDS (page 5)',
    'api',
    'https://dati.anticorruzione.it/opendata/ocds/api',
    'IT',
    true,
    90,
    jsonb_build_object('provider', 'it_anac_ocds', 'page', 5, 'limit', 25),
    'IT_NATIVE'
  ),
  (
    'it_anac_ocds_p6',
    'ANAC - Open Data OCDS (page 6)',
    'api',
    'https://dati.anticorruzione.it/opendata/ocds/api',
    'IT',
    true,
    90,
    jsonb_build_object('provider', 'it_anac_ocds', 'page', 6, 'limit', 25),
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
