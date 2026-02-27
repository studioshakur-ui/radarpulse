alter table public.sources
add column if not exists origin_type text default 'EU';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sources_origin_type_check'
      and conrelid = 'public.sources'::regclass
  ) then
    alter table public.sources
      add constraint sources_origin_type_check
      check (origin_type in ('IT_NATIVE', 'EU', 'OTHER'));
  end if;
end $$;

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
  'it_anac_ocds',
  'ANAC - Open Data OCDS',
  'api',
  'https://dati.anticorruzione.it/opendata/ocds/api',
  'IT',
  true,
  60,
  jsonb_build_object(
    'provider', 'it_anac_ocds',
    'base_url', 'https://dati.anticorruzione.it/opendata/ocds/api',
    'page', 1,
    'limit', 50
  ),
  'IT_NATIVE'
)
on conflict (key) do update set
  kind = excluded.kind,
  url = excluded.url,
  country_code = 'IT',
  is_active = true,
  meta = excluded.meta,
  origin_type = 'IT_NATIVE',
  updated_at = now();

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
  'it_anac_ocds_p2',
  'ANAC - Open Data OCDS (Page 2)',
  'api',
  'https://dati.anticorruzione.it/opendata/ocds/api',
  'IT',
  true,
  60,
  jsonb_build_object(
    'provider', 'it_anac_ocds',
    'base_url', 'https://dati.anticorruzione.it/opendata/ocds/api',
    'page', 2,
    'limit', 50
  ),
  'IT_NATIVE'
)
on conflict (key) do update set
  kind = excluded.kind,
  url = excluded.url,
  country_code = 'IT',
  is_active = true,
  meta = excluded.meta,
  origin_type = 'IT_NATIVE',
  updated_at = now();
