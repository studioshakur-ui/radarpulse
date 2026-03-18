alter table public.opportunity_ai
  add column if not exists locality text null;

alter table public.opportunity_extractions
  add column if not exists locality text null;

comment on column public.opportunity_ai.locality is 'Extracted locality/comune label when available.';
comment on column public.opportunity_extractions.locality is 'Extracted locality/comune label when available.';

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
select
  o.id,
  o.title,
  coalesce(b.name, nullif(o.buyer_name, '')) as buyer_name,
  coalesce(gr_linked.name, oe.region) as region,
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
  s.origin_type,
  gz.slug as geo_zone_slug,
  gz.name as geo_zone_name,
  coalesce(gc_linked.slug, gc_fallback.slug) as geo_country_slug,
  coalesce(gc_linked.country_code, gc_fallback.country_code) as geo_country_code,
  coalesce(gc_linked.name, gc_fallback.name) as geo_country_name,
  gr_linked.slug as geo_region_slug,
  gr_linked.name as geo_region_name,
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
where coalesce((to_jsonb(o)->>'is_deleted')::boolean, false) = false;

grant select on public.opportunities_geo_scope_v1 to anon;
grant select on public.opportunities_geo_scope_v1 to authenticated;
