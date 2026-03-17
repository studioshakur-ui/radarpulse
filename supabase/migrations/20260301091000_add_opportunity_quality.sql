alter table public.opportunity_ai
add column if not exists quality_score numeric default 0,
add column if not exists completeness_score numeric default 0;

create or replace function public.compute_opportunity_quality()
returns trigger
language plpgsql
as $$
begin
  -- completeness_score: fraction of the 4 key fields that are populated.
  -- Denominator MUST match the number of fields in the sum; update both together
  -- if fields are added or removed, otherwise the score silently mis-normalises.
  new.completeness_score :=
    (
      (new.region is not null)::int +
      (new.budget_value is not null)::int +
      (new.deadline_at is not null)::int +
      (new.buyer_name is not null)::int
    ) / 4.0; -- 4 fields above → denominator 4.0

  new.quality_score :=
    new.completeness_score *
    case
      when new.extraction_quality = 'high' then 1.0
      when new.extraction_quality = 'med' then 0.7
      else 0.4
    end;

  return new;
end;
$$;

drop trigger if exists trg_compute_opportunity_quality on public.opportunity_ai;
create trigger trg_compute_opportunity_quality
before insert or update on public.opportunity_ai
for each row execute function public.compute_opportunity_quality();

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
  coalesce(s.key, to_jsonb(o)->>'source_key', o.raw->>'source_key', o.source_id::text) as source_key,
  o.status,
  o.is_public,
  o.country_code,
  ai.quality_score,
  ai.completeness_score,
  s.origin_type
from public.opportunities o
left join public.sources s on s.id = o.source_id
left join public.buyers b on b.id = o.buyer_id
left join public.opportunity_ai ai on ai.fingerprint = o.fingerprint
where coalesce((to_jsonb(o)->>'is_deleted')::boolean, false) = false;

grant select on public.opportunities_search_v1 to anon;
grant select on public.opportunities_search_v1 to authenticated;

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
  'IT' as country_code,
  ai.quality_score,
  ai.completeness_score,
  s.origin_type
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
