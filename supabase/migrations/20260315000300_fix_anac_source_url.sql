-- Sprint 2 / bugfix: ANAC connector was hitting the wrong API host.
--
-- OLD (broken): https://dati.anticorruzione.it/opendata/ocds/api
--   → returns HTTP 200 with JSON {"url":"/ui/releases","status":"404","message":"Not Found"}
--   → connector sees empty releases array → 0 opportunities every run
--
-- NEW (correct): https://api.anticorruzione.it/opendata/ocds/api/v1/1.0.0
--   → returns direct JSON array of OCDS release objects
--   → connector can parse and ingest Italian public procurement data

update public.sources
set meta = jsonb_set(
  coalesce(meta, '{}'),
  '{base_url}',
  '"https://api.anticorruzione.it/opendata/ocds/api/v1/1.0.0"'
)
where key = 'it_anac_ocds';
