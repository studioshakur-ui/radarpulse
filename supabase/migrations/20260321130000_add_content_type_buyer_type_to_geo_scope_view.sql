drop view if exists public.opportunities_geo_scope_v1;

create view public.opportunities_geo_scope_v1 (
  id,
  title,
  buyer_name,
  region,
  locality,
  budget_amount,
  budget_currency,
  deadline_at,
  published_at,
  source_key,
  status,
  is_public,
  country_code,
  quality_score,
  completeness_score,
  sector,
  content_type,
  buyer_type,
  origin_type,
  geo_zone_slug,
  geo_zone_name,
  geo_country_slug,
  geo_country_code,
  geo_country_name,
  geo_region_slug,
  geo_region_name,
  geo_locality_slug,
  geo_locality_name,
  geo_resolution_confidence
) as
with fr_department_regions as (
  select *
  from (
    values
      ('01', 'auvergne-rhone-alpes', 'Auvergne-Rhone-Alpes'),
      ('03', 'auvergne-rhone-alpes', 'Auvergne-Rhone-Alpes'),
      ('07', 'auvergne-rhone-alpes', 'Auvergne-Rhone-Alpes'),
      ('15', 'auvergne-rhone-alpes', 'Auvergne-Rhone-Alpes'),
      ('26', 'auvergne-rhone-alpes', 'Auvergne-Rhone-Alpes'),
      ('38', 'auvergne-rhone-alpes', 'Auvergne-Rhone-Alpes'),
      ('42', 'auvergne-rhone-alpes', 'Auvergne-Rhone-Alpes'),
      ('43', 'auvergne-rhone-alpes', 'Auvergne-Rhone-Alpes'),
      ('63', 'auvergne-rhone-alpes', 'Auvergne-Rhone-Alpes'),
      ('69', 'auvergne-rhone-alpes', 'Auvergne-Rhone-Alpes'),
      ('73', 'auvergne-rhone-alpes', 'Auvergne-Rhone-Alpes'),
      ('74', 'auvergne-rhone-alpes', 'Auvergne-Rhone-Alpes'),
      ('21', 'bourgogne-franche-comte', 'Bourgogne-Franche-Comte'),
      ('25', 'bourgogne-franche-comte', 'Bourgogne-Franche-Comte'),
      ('39', 'bourgogne-franche-comte', 'Bourgogne-Franche-Comte'),
      ('58', 'bourgogne-franche-comte', 'Bourgogne-Franche-Comte'),
      ('70', 'bourgogne-franche-comte', 'Bourgogne-Franche-Comte'),
      ('71', 'bourgogne-franche-comte', 'Bourgogne-Franche-Comte'),
      ('89', 'bourgogne-franche-comte', 'Bourgogne-Franche-Comte'),
      ('90', 'bourgogne-franche-comte', 'Bourgogne-Franche-Comte'),
      ('22', 'bretagne', 'Bretagne'),
      ('29', 'bretagne', 'Bretagne'),
      ('35', 'bretagne', 'Bretagne'),
      ('56', 'bretagne', 'Bretagne'),
      ('18', 'centre-val-de-loire', 'Centre-Val de Loire'),
      ('28', 'centre-val-de-loire', 'Centre-Val de Loire'),
      ('36', 'centre-val-de-loire', 'Centre-Val de Loire'),
      ('37', 'centre-val-de-loire', 'Centre-Val de Loire'),
      ('41', 'centre-val-de-loire', 'Centre-Val de Loire'),
      ('45', 'centre-val-de-loire', 'Centre-Val de Loire'),
      ('2A', 'corse', 'Corse'),
      ('2B', 'corse', 'Corse'),
      ('08', 'grand-est', 'Grand Est'),
      ('10', 'grand-est', 'Grand Est'),
      ('51', 'grand-est', 'Grand Est'),
      ('52', 'grand-est', 'Grand Est'),
      ('54', 'grand-est', 'Grand Est'),
      ('55', 'grand-est', 'Grand Est'),
      ('57', 'grand-est', 'Grand Est'),
      ('67', 'grand-est', 'Grand Est'),
      ('68', 'grand-est', 'Grand Est'),
      ('88', 'grand-est', 'Grand Est'),
      ('02', 'hauts-de-france', 'Hauts-de-France'),
      ('59', 'hauts-de-france', 'Hauts-de-France'),
      ('60', 'hauts-de-france', 'Hauts-de-France'),
      ('62', 'hauts-de-france', 'Hauts-de-France'),
      ('80', 'hauts-de-france', 'Hauts-de-France'),
      ('75', 'ile-de-france', 'Ile-de-France'),
      ('77', 'ile-de-france', 'Ile-de-France'),
      ('78', 'ile-de-france', 'Ile-de-France'),
      ('91', 'ile-de-france', 'Ile-de-France'),
      ('92', 'ile-de-france', 'Ile-de-France'),
      ('93', 'ile-de-france', 'Ile-de-France'),
      ('94', 'ile-de-france', 'Ile-de-France'),
      ('95', 'ile-de-france', 'Ile-de-France'),
      ('14', 'normandie', 'Normandie'),
      ('27', 'normandie', 'Normandie'),
      ('50', 'normandie', 'Normandie'),
      ('61', 'normandie', 'Normandie'),
      ('76', 'normandie', 'Normandie'),
      ('16', 'nouvelle-aquitaine', 'Nouvelle-Aquitaine'),
      ('17', 'nouvelle-aquitaine', 'Nouvelle-Aquitaine'),
      ('19', 'nouvelle-aquitaine', 'Nouvelle-Aquitaine'),
      ('23', 'nouvelle-aquitaine', 'Nouvelle-Aquitaine'),
      ('24', 'nouvelle-aquitaine', 'Nouvelle-Aquitaine'),
      ('33', 'nouvelle-aquitaine', 'Nouvelle-Aquitaine'),
      ('40', 'nouvelle-aquitaine', 'Nouvelle-Aquitaine'),
      ('47', 'nouvelle-aquitaine', 'Nouvelle-Aquitaine'),
      ('64', 'nouvelle-aquitaine', 'Nouvelle-Aquitaine'),
      ('79', 'nouvelle-aquitaine', 'Nouvelle-Aquitaine'),
      ('86', 'nouvelle-aquitaine', 'Nouvelle-Aquitaine'),
      ('87', 'nouvelle-aquitaine', 'Nouvelle-Aquitaine'),
      ('09', 'occitanie', 'Occitanie'),
      ('11', 'occitanie', 'Occitanie'),
      ('12', 'occitanie', 'Occitanie'),
      ('30', 'occitanie', 'Occitanie'),
      ('31', 'occitanie', 'Occitanie'),
      ('32', 'occitanie', 'Occitanie'),
      ('34', 'occitanie', 'Occitanie'),
      ('46', 'occitanie', 'Occitanie'),
      ('48', 'occitanie', 'Occitanie'),
      ('65', 'occitanie', 'Occitanie'),
      ('66', 'occitanie', 'Occitanie'),
      ('81', 'occitanie', 'Occitanie'),
      ('82', 'occitanie', 'Occitanie'),
      ('44', 'pays-de-la-loire', 'Pays de la Loire'),
      ('49', 'pays-de-la-loire', 'Pays de la Loire'),
      ('53', 'pays-de-la-loire', 'Pays de la Loire'),
      ('72', 'pays-de-la-loire', 'Pays de la Loire'),
      ('85', 'pays-de-la-loire', 'Pays de la Loire'),
      ('04', 'provence-alpes-cote-d-azur', 'Provence-Alpes-Cote d''Azur'),
      ('05', 'provence-alpes-cote-d-azur', 'Provence-Alpes-Cote d''Azur'),
      ('06', 'provence-alpes-cote-d-azur', 'Provence-Alpes-Cote d''Azur'),
      ('13', 'provence-alpes-cote-d-azur', 'Provence-Alpes-Cote d''Azur'),
      ('83', 'provence-alpes-cote-d-azur', 'Provence-Alpes-Cote d''Azur'),
      ('84', 'provence-alpes-cote-d-azur', 'Provence-Alpes-Cote d''Azur'),
      ('971', 'guadeloupe', 'Guadeloupe'),
      ('972', 'martinique', 'Martinique'),
      ('973', 'guyane', 'Guyane'),
      ('974', 'la-reunion', 'La Reunion'),
      ('976', 'mayotte', 'Mayotte')
  ) as v(code_departement, region_slug, region_name)
),
fr_raw_geo as (
  select
    o.id as opportunity_id,
    fdr.region_slug,
    fdr.region_name
  from public.opportunities o
  join fr_department_regions fdr
    on upper(coalesce(o.raw->>'code_departement', '')) = fdr.code_departement
)
select
  o.id,
  o.title,
  coalesce(b.name, nullif(o.buyer_name, '')) as buyer_name,
  coalesce(gr_linked.name, fr_raw_geo.region_name, oe.region) as region,
  coalesce(gl_linked.name, oe.locality) as locality,
  oe.budget_value as budget_amount,
  oe.budget_currency,
  o.deadline_at,
  o.published_at,
  coalesce(s.key, o.raw->>'source_key', o.source_id::text) as source_key,
  o.status,
  o.is_public,
  coalesce(gc_linked.country_code, gc_fallback.country_code, oe.country_code, o.country_code) as country_code,
  oe.quality_score,
  oe.completeness_score,
  oe.sector,
  oe.content_type::text,
  oe.buyer_type::text,
  s.origin_type,
  gz.slug as geo_zone_slug,
  gz.name as geo_zone_name,
  coalesce(gc_linked.slug, gc_fallback.slug) as geo_country_slug,
  coalesce(gc_linked.country_code, gc_fallback.country_code) as geo_country_code,
  coalesce(gc_linked.name, gc_fallback.name) as geo_country_name,
  coalesce(gr_linked.slug, fr_raw_geo.region_slug) as geo_region_slug,
  coalesce(gr_linked.name, fr_raw_geo.region_name) as geo_region_name,
  gl_linked.slug as geo_locality_slug,
  gl_linked.name as geo_locality_name,
  oe.geo_resolution_confidence
from public.opportunities o
left join public.buyers b on b.id = o.buyer_id
left join public.sources s on s.id = o.source_id
left join public.opportunity_extractions oe
  on oe.opportunity_id = o.id
 and oe.is_current = true
left join public.geo_countries gc_linked
  on gc_linked.id = oe.geo_country_id
left join public.geo_countries gc_fallback
  on gc_fallback.country_code = upper(coalesce(oe.country_code, o.country_code, ''))
left join public.geo_regions gr_linked
  on gr_linked.id = oe.geo_region_id
left join public.geo_localities gl_linked
  on gl_linked.id = oe.geo_locality_id
left join public.geo_zones gz
  on gz.id = coalesce(gc_linked.zone_id, gc_fallback.zone_id)
left join fr_raw_geo
  on fr_raw_geo.opportunity_id = o.id
where coalesce((to_jsonb(o)->>'is_deleted')::boolean, false) = false;

grant select on public.opportunities_geo_scope_v1 to anon;
grant select on public.opportunities_geo_scope_v1 to authenticated;
