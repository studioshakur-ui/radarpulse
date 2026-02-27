-- RadarPulse post-deploy checks (IT-only mode)

-- Active sources (must be IT only)
select key, name, country_code, is_active, coalesce(meta->>'provider','') as provider
from public.sources
where is_active = true
order by key;

-- Guard: should be zero
select count(*) as non_it_active_sources
from public.sources
where is_active = true
  and coalesce(country_code, '') <> 'IT';

-- Opportunities available for Inbox
select
  count(*) as total,
  count(*) filter (where country_code='IT') as it_total,
  count(*) filter (where country_code='IT' and is_public=true) as it_public_total
from public.opportunities;

-- Ingestion job health in last 24h
select status, count(*) as total
from public.ingestion_jobs
where created_at >= now() - interval '24 hours'
group by status
order by status;

-- Latest job errors
select id, source_id, status, error, created_at
from public.ingestion_jobs
where status='error'
order by created_at desc
limit 20;
