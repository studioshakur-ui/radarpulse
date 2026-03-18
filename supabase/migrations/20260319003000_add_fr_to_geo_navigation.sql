with europe_zone as (
  select id
  from public.geo_zones
  where slug = 'europe'
)
insert into public.geo_countries (zone_id, country_code, slug, name, territory_kind, flag_emoji, sort_order)
select
  europe_zone.id,
  'FR',
  'fr',
  'France',
  'country',
  '🇫🇷',
  15
from europe_zone
on conflict (country_code) do update
set
  zone_id = excluded.zone_id,
  slug = excluded.slug,
  name = excluded.name,
  territory_kind = excluded.territory_kind,
  flag_emoji = excluded.flag_emoji,
  sort_order = excluded.sort_order,
  is_active = true;
