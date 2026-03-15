-- eu_ted_active has country_code = 'IT', so the connector filters notices by Italy.
-- But the meta.query "publication-date>=20251228" fetches EU-wide notices (25/page),
-- and page 1 may contain 0 Italian notices, causing every run to return 0 results.
--
-- Fix: tell the TED API to pre-filter to Italian buyers directly.
-- This makes page 1 always return the 25 most recent Italian TED notices.

update public.sources
set meta = jsonb_set(
  meta,
  '{query}',
  '"publication-date>=20251228 AND buyer-country IN (ITA)"'
)
where key = 'eu_ted_active';
