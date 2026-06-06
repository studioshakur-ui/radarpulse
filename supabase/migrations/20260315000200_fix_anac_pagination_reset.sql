-- Fix: reset ANAC source pagination after the parseNextPointer bug.
--
-- The bug in it_anac_ocds.ts caused parseNextPointer() to always return
-- { page: fallbackPage + 1 } even when the API had no 'next' link, making
-- meta.page drift to very high numbers (e.g. 500, 1000+) over time.
-- As a result, every ingestion run was fetching non-existent pages and
-- producing zero opportunities despite a 'success' status.
--
-- This migration resets the source to page 1 so that ingestion resumes
-- from the beginning of the ANAC catalogue on the next scheduled run.
-- The code fix (returning null instead of advancing) prevents re-drift.

update public.sources
set
  meta = jsonb_build_object(
    'provider', 'it_anac_ocds',
    'base_url', 'https://dati.anticorruzione.it/opendata/ocds/api',
    'page', 1,
    'limit', 50,
    'cursor', null
  ),
  updated_at = now()
where key = 'it_anac_ocds';
