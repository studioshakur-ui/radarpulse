with candidate_regions as (
  select
    gr.id,
    gc.country_code,
    gr.slug
  from public.geo_regions gr
  join public.geo_countries gc on gc.id = gr.country_id
  where gc.country_code = 'IT'
)
insert into public.geo_localities (region_id, slug, name, normalized_name, code, sort_order)
select
  candidate_regions.id,
  seeded.slug,
  seeded.name,
  seeded.normalized_name,
  seeded.code,
  seeded.sort_order
from candidate_regions
join (
  values
    ('lombardia', 'milano', 'Milano', 'milano', 'IT-MI', 10),
    ('lazio', 'roma', 'Roma', 'roma', 'IT-RM', 10)
) as seeded(region_slug, slug, name, normalized_name, code, sort_order)
  on seeded.region_slug = candidate_regions.slug
on conflict (region_id, slug) do update
set
  name = excluded.name,
  normalized_name = excluded.normalized_name,
  code = excluded.code,
  sort_order = excluded.sort_order,
  is_active = true;

with locality_matches as (
  select
    oe.id as extraction_id,
    gl.id as geo_locality_id
  from public.opportunity_extractions oe
  join public.geo_localities gl
    on gl.region_id = oe.geo_region_id
   and gl.normalized_name = public.rp_normalize_geo_text(oe.locality)
)
update public.opportunity_extractions oe
set
  geo_locality_id = locality_matches.geo_locality_id,
  geo_resolution_confidence = 'locality_text_match'
from locality_matches
where oe.id = locality_matches.extraction_id
  and oe.geo_locality_id is null;
