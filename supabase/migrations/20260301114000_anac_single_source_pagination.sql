update public.sources
set
  is_active = false,
  updated_at = now()
where key = 'it_anac_ocds_p2';

update public.sources
set
  country_code = 'IT',
  origin_type = 'IT_NATIVE',
  is_active = true,
  meta = jsonb_set(
    jsonb_set(
      coalesce(meta, '{}'::jsonb),
      '{page}',
      to_jsonb(coalesce((meta->>'page')::int, 1)),
      true
    ),
    '{limit}',
    to_jsonb(coalesce((meta->>'limit')::int, 50)),
    true
  ),
  updated_at = now()
where key = 'it_anac_ocds';
