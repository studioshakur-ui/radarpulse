create or replace view public.opportunities_inbox_it_v1 as
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
  'IT' as country_code
from public.opportunities o
join public.sources s on s.id = o.source_id
left join public.buyers b on b.id = o.buyer_id
left join public.opportunity_ai ai on ai.fingerprint = o.fingerprint
where
  coalesce((to_jsonb(o)->>'is_deleted')::boolean, false) = false
  and o.is_public = true
  and (
    s.key = 'rss_ted_comp_it'
    or s.country_code = 'IT'
    or s.key like 'it_%'
  );

grant select on public.opportunities_inbox_it_v1 to anon;
grant select on public.opportunities_inbox_it_v1 to authenticated;
