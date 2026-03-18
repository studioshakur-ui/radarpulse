update public.opportunity_extractions oe
set locality = 'Milano'
from public.sources s
where oe.source_id = s.id
  and oe.locality is null
  and (
    s.key = 'it_milano_bandi_rss'
    or lower(coalesce(oe.buyer_name, '')) like '%comune di milano%'
  );

update public.opportunity_extractions oe
set locality = 'Roma'
from public.sources s
where oe.source_id = s.id
  and oe.locality is null
  and (
    s.key = 'it_roma_bandi_rss'
    or lower(coalesce(oe.buyer_name, '')) like '%comune di roma%'
  );

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
