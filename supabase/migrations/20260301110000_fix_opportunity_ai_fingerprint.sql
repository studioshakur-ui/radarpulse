-- Backfill opportunity_ai.fingerprint from canonical opportunities via opportunities_raw.
with candidate as (
  select
    ai.id as ai_id,
    coalesce(o_ext.fingerprint, o_url.fingerprint) as fingerprint
  from public.opportunity_ai ai
  join public.opportunities_raw r on r.id = ai.raw_id
  left join public.opportunities o_ext
    on o_ext.source_id = r.source_id
   and r.external_id is not null
   and r.external_id <> ''
   and o_ext.external_id = r.external_id
  left join public.opportunities o_url
    on o_url.source_id = r.source_id
   and (r.external_id is null or r.external_id = '')
   and (
     o_url.source_url = r.url_canonical
     or o_url.source_url = r.url
   )
  where (ai.fingerprint is null or ai.fingerprint = '')
)
update public.opportunity_ai ai
set fingerprint = c.fingerprint
from candidate c
where ai.id = c.ai_id
  and c.fingerprint is not null;

create index if not exists opportunity_ai_fingerprint_idx
  on public.opportunity_ai (fingerprint);

create or replace function public.set_opportunity_ai_fingerprint_from_raw()
returns trigger
language plpgsql
as $$
declare
  v_source_id uuid;
  v_external_id text;
  v_url_canonical text;
  v_url text;
  v_fp text;
begin
  if new.fingerprint is not null and new.fingerprint <> '' then
    return new;
  end if;

  if new.raw_id is null then
    return new;
  end if;

  select r.source_id, r.external_id, r.url_canonical, r.url
    into v_source_id, v_external_id, v_url_canonical, v_url
  from public.opportunities_raw r
  where r.id = new.raw_id;

  if v_source_id is null then
    return new;
  end if;

  -- BUG-01 FIX: ORDER BY created_at DESC makes LIMIT 1 deterministic
  if v_external_id is not null and v_external_id <> '' then
    select o.fingerprint
      into v_fp
    from public.opportunities o
    where o.source_id = v_source_id
      and o.external_id = v_external_id
    order by o.created_at desc
    limit 1;
  else
    select o.fingerprint
      into v_fp
    from public.opportunities o
    where o.source_id = v_source_id
      and (o.source_url = v_url_canonical or o.source_url = v_url)
    order by o.created_at desc
    limit 1;
  end if;

  if v_fp is not null and v_fp <> '' then
    new.fingerprint := v_fp;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_opportunity_ai_fingerprint_from_raw on public.opportunity_ai;
create trigger trg_set_opportunity_ai_fingerprint_from_raw
before insert or update on public.opportunity_ai
for each row
execute function public.set_opportunity_ai_fingerprint_from_raw();

-- Validation:
-- select count(*) as matched_ai
-- from public.opportunities o
-- join public.opportunity_ai ai on ai.fingerprint = o.fingerprint;
--
-- select count(*) filter (where ai.completeness_score is not null) as scored_ai
-- from public.opportunities o
-- join public.opportunity_ai ai on ai.fingerprint = o.fingerprint;
