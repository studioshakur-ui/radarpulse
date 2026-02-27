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
  s.origin_type,
  ai.quality_score,
  ai.completeness_score
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
where coalesce((to_jsonb(o)->>'is_deleted')::boolean, false) = false;

grant select on public.opportunities_search_v1 to anon;
grant select on public.opportunities_search_v1 to authenticated;

-- Validation:
-- select
--   count(*) as opps,
--   count(*) filter (where region is not null) as with_region,
--   count(*) filter (where completeness_score is not null) as with_scores
-- from public.opportunities_search_v1;
--
-- explain (analyze, costs off)
-- select * from public.opportunities_search_v1 limit 10;
