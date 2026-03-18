with seeded_regions as (
  select *
  from (
    values
      ('FR', 'auvergne-rhone-alpes', 'Auvergne-Rhone-Alpes', 'auvergne-rhone-alpes', 'ARA', 10),
      ('FR', 'bourgogne-franche-comte', 'Bourgogne-Franche-Comte', 'bourgogne-franche-comte', 'BFC', 20),
      ('FR', 'bretagne', 'Bretagne', 'bretagne', 'BRE', 30),
      ('FR', 'centre-val-de-loire', 'Centre-Val de Loire', 'centre-val-de-loire', 'CVL', 40),
      ('FR', 'corse', 'Corse', 'corse', 'COR', 50),
      ('FR', 'grand-est', 'Grand Est', 'grand-est', 'GES', 60),
      ('FR', 'hauts-de-france', 'Hauts-de-France', 'hauts-de-france', 'HDF', 70),
      ('FR', 'ile-de-france', 'Ile-de-France', 'ile-de-france', 'IDF', 80),
      ('FR', 'normandie', 'Normandie', 'normandie', 'NOR', 90),
      ('FR', 'nouvelle-aquitaine', 'Nouvelle-Aquitaine', 'nouvelle-aquitaine', 'NAQ', 100),
      ('FR', 'occitanie', 'Occitanie', 'occitanie', 'OCC', 110),
      ('FR', 'pays-de-la-loire', 'Pays de la Loire', 'pays-de-la-loire', 'PDL', 120),
      ('FR', 'provence-alpes-cote-d-azur', 'Provence-Alpes-Cote d''Azur', 'provence-alpes-cote-d-azur', 'PAC', 130),
      ('FR', 'guadeloupe', 'Guadeloupe', 'guadeloupe', 'GUA', 140),
      ('FR', 'martinique', 'Martinique', 'martinique', 'MTQ', 150),
      ('FR', 'guyane', 'Guyane', 'guyane', 'GUF', 160),
      ('FR', 'la-reunion', 'La Reunion', 'la-reunion', 'REU', 170),
      ('FR', 'mayotte', 'Mayotte', 'mayotte', 'MYT', 180),
      ('GB', 'north-east', 'North East', 'north-east', 'NE', 10),
      ('GB', 'north-west', 'North West', 'north-west', 'NW', 20),
      ('GB', 'yorkshire-and-the-humber', 'Yorkshire and The Humber', 'yorkshire-and-the-humber', 'YH', 30),
      ('GB', 'east-midlands', 'East Midlands', 'east-midlands', 'EM', 40),
      ('GB', 'west-midlands', 'West Midlands', 'west-midlands', 'WM', 50),
      ('GB', 'east-of-england', 'East of England', 'east-of-england', 'EE', 60),
      ('GB', 'london', 'London', 'london', 'LON', 70),
      ('GB', 'south-east', 'South East', 'south-east', 'SE', 80),
      ('GB', 'south-west', 'South West', 'south-west', 'SW', 90),
      ('GB', 'scotland', 'Scotland', 'scotland', 'SCT', 100),
      ('GB', 'wales', 'Wales', 'wales', 'WLS', 110),
      ('GB', 'northern-ireland', 'Northern Ireland', 'northern-ireland', 'NIR', 120)
  ) as v(country_code, slug, name, normalized_name, code, sort_order)
)
insert into public.geo_regions (country_id, slug, name, normalized_name, code, sort_order)
select
  gc.id,
  sr.slug,
  sr.name,
  sr.normalized_name,
  sr.code,
  sr.sort_order
from seeded_regions sr
join public.geo_countries gc on gc.country_code = sr.country_code
on conflict (country_id, slug) do update
set
  name = excluded.name,
  normalized_name = excluded.normalized_name,
  code = excluded.code,
  sort_order = excluded.sort_order,
  is_active = true;
