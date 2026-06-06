create or replace function public.rp_normalize_geo_text(input text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(
      regexp_replace(
        replace(
          replace(
            replace(
              replace(lower(coalesce(input, '')), '’', ' '),
              '''',
              ' '
            ),
            '-',
            ' '
          ),
          '_',
          ' '
        ),
        '\s+',
        ' ',
        'g'
      )
    ),
    ''
  );
$$;

alter table public.opportunity_extractions
  add column if not exists geo_country_id uuid null references public.geo_countries(id) on delete set null,
  add column if not exists geo_region_id uuid null references public.geo_regions(id) on delete set null,
  add column if not exists geo_locality_id uuid null references public.geo_localities(id) on delete set null,
  add column if not exists geo_resolution_confidence text null;

alter table public.opportunity_extractions
  drop constraint if exists opportunity_extractions_geo_resolution_confidence_check;

alter table public.opportunity_extractions
  add constraint opportunity_extractions_geo_resolution_confidence_check
  check (
    geo_resolution_confidence is null
    or geo_resolution_confidence in ('exact', 'country_only', 'region_text_match', 'locality_text_match', 'unresolved')
  );

create index if not exists opportunity_extractions_geo_country_current_idx
  on public.opportunity_extractions (geo_country_id)
  where is_current = true;

create index if not exists opportunity_extractions_geo_region_current_idx
  on public.opportunity_extractions (geo_region_id)
  where is_current = true;

create index if not exists opportunity_extractions_geo_locality_current_idx
  on public.opportunity_extractions (geo_locality_id)
  where is_current = true;

with country_matches as (
  select
    oe.id as extraction_id,
    gc.id as geo_country_id
  from public.opportunity_extractions oe
  join public.geo_countries gc
    on gc.country_code = upper(coalesce(oe.country_code, ''))
)
update public.opportunity_extractions oe
set geo_country_id = country_matches.geo_country_id
from country_matches
where oe.id = country_matches.extraction_id
  and oe.geo_country_id is null;

with region_matches as (
  select
    oe.id as extraction_id,
    gr.id as geo_region_id
  from public.opportunity_extractions oe
  join public.geo_countries gc
    on gc.id = oe.geo_country_id
  join public.geo_regions gr
    on gr.country_id = gc.id
   and gr.normalized_name = public.rp_normalize_geo_text(oe.region)
)
update public.opportunity_extractions oe
set geo_region_id = region_matches.geo_region_id
from region_matches
where oe.id = region_matches.extraction_id
  and oe.geo_region_id is null;

update public.opportunity_extractions
set geo_resolution_confidence = case
  when geo_locality_id is not null then 'locality_text_match'
  when geo_region_id is not null then 'region_text_match'
  when geo_country_id is not null then 'country_only'
  else 'unresolved'
end
where geo_resolution_confidence is null;

comment on column public.opportunity_extractions.geo_country_id is 'Normalized geography country node resolved for this extraction.';
comment on column public.opportunity_extractions.geo_region_id is 'Normalized geography region node resolved for this extraction.';
comment on column public.opportunity_extractions.geo_locality_id is 'Normalized geography locality node resolved for this extraction.';
comment on column public.opportunity_extractions.geo_resolution_confidence is 'Resolution confidence for the normalized geography linkage.';

drop view if exists public.opportunities_geo_scope_v1;

create view public.opportunities_geo_scope_v1 (
  id,
  title,
  buyer_name,
  region,
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

comment on view public.opportunities_geo_scope_v1 is 'Public geography-scoped opportunity feed. Prefers normalized geo links on current opportunity_extractions and falls back to live country_code/region fields when linkage is still incomplete.';
