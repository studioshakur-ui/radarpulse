-- ─────────────────────────────────────────────────────────────────────────────
-- Activate dormant IT sources + tune TED / BOAMP page counts
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Re-activate Italian RSS sources that were previously disabled
update public.sources
set is_active = true
where key in (
  'it_consip_bandi_rss',
  'it_milano_bandi_rss',
  'it_inps_bandi_rss',
  'it_mit_bandi_rss'
);

-- 2. Increase TED page count via meta: 1 → 5 pages per run (25 → 125 items/run per country)
update public.sources
set meta = jsonb_set(
  coalesce(meta, '{}'::jsonb),
  '{max_pages}',
  '5'::jsonb
)
where key like 'eu_ted_%'
  and is_active = true;

-- 3. Increase BOAMP page count via meta: 10 → 20 pages per run (500 → 1 000 items/run)
update public.sources
set meta = jsonb_set(
  coalesce(meta, '{}'::jsonb),
  '{max_pages}',
  '20'::jsonb
)
where key like 'fr_boamp%'
  and is_active = true;

-- 4. Document recommended env vars for operators
comment on table public.sources is
  'Live data sources ingested by the worker. '
  'DISPATCHER_MAX_QUEUED env var should be set to 40 to match increased source count. '
  'WORKER_MAX_AI_PER_JOB env var can be raised to 20 once AI budget allows.';
