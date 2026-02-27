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
  coalesce(to_jsonb(o)->>'source_key', o.raw->>'source_key', o.source_id::text) as source_key,
  o.status,
  o.is_public,
  o.country_code
from public.opportunities o
left join public.buyers b on b.id = o.buyer_id
left join public.opportunity_ai ai on ai.fingerprint = o.fingerprint
where coalesce((to_jsonb(o)->>'is_deleted')::boolean, false) = false;

grant select on public.opportunities_search_v1 to anon;
grant select on public.opportunities_search_v1 to authenticated;
