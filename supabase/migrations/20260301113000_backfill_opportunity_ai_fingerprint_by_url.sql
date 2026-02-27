with matches as (
  select
    ai.id as ai_id,
    min(o.fingerprint) as fingerprint,
    min(o.country_code) as country_code,
    count(*) as c
  from public.opportunity_ai ai
  join public.opportunities_raw r on r.id = ai.raw_id
  join public.opportunities o on o.source_url = r.url_canonical
  where (ai.fingerprint is null or ai.fingerprint = '')
  group by ai.id
),
eligible as (
  select ai_id, fingerprint, country_code
  from matches
  where c = 1
)
update public.opportunity_ai ai
set
  fingerprint = e.fingerprint,
  country_code = coalesce(ai.country_code, e.country_code),
  updated_at = now()
from eligible e
where ai.id = e.ai_id;

create index if not exists opportunity_ai_fingerprint_idx
  on public.opportunity_ai (fingerprint);

-- Validation:
-- select count(*) as matched_ai
-- from public.opportunities o
-- join public.opportunity_ai ai on ai.fingerprint = o.fingerprint;
--
-- select
--   count(*) filter (where ai.fingerprint is not null) as ai_fp_filled,
--   count(*) as ai_rows
-- from public.opportunity_ai ai;
