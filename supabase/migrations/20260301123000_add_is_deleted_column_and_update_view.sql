-- Why this migration:
-- 1) Replace JSON-derived soft-delete filter with a real boolean column for stable plans.
-- 2) Keep public.opportunities_search_v1 output shape exactly unchanged.
-- 3) Enable partial indexes on live rows (is_deleted=false) in follow-up migration.

alter table public.opportunities
add column if not exists is_deleted boolean not null default false;

update public.opportunities o
set is_deleted = coalesce((to_jsonb(o)->>'is_deleted')::boolean, false);

create or replace view public.opportunities_search_v1 as
select
  o.id,
  o.title,
  coalesce(b.name, nullif(o.buyer_name, '')) as buyer_name,
  ai.region,
  ai.budget_value as budget_amount,
  ai.budget_currency,
  o.deadline_at,
  o.published_at,
  coalesce(s.key, o.raw->>'source_key', o.source_id::text) as source_key,
  o.status,
  o.is_public,
  o.country_code,
  ai.quality_score,
  ai.completeness_score,
  s.origin_type
from public.opportunities o
left join public.buyers b on b.id = o.buyer_id
left join public.sources s on s.id = o.source_id
left join public.opportunities_raw r on r.url_canonical = o.source_url
left join lateral (
  select
    a.region,
    a.budget_value,
    a.budget_currency,
    a.quality_score,
    a.completeness_score
  from public.opportunity_ai a
  where a.raw_id = r.id
  order by a.extracted_at desc nulls last, a.updated_at desc
  limit 1
) ai on true
where o.is_deleted = false;

grant select on public.opportunities_search_v1 to anon;
grant select on public.opportunities_search_v1 to authenticated;
