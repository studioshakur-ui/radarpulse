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
  'it_eappalti_fvg_active',
  'eAppaltiFVG - Bandi/Avvisi attivi',
  'api',
  'https://eappalti.regione.fvg.it/esop/guest/go/public/opportunity/current',
  'IT',
  true,
  90,
  jsonb_build_object(
    'provider', 'it_eappalti_fvg'
  ),
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
