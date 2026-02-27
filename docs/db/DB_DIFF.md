# DB diff summary

- Generated (UTC): `2026-02-27 21:19:57Z`
- Schemas: `public`

This file summarizes changes detected between the previous and current `schema_snapshot.sql`.

## Added

- (none)

## Removed

- (none)

## Modified

- FUNCTION public.compute_opportunity_quality
- FUNCTION public.set_opportunity_ai_fingerprint_from_raw
- INDEX idx_opportunities_country_deadline
- INDEX idx_opportunities_country_updated_desc
- INDEX ingestion_runs_source_key_started_idx
- INDEX opportunity_ai_fingerprint_idx
- TABLE public.ingestion_runs
- TABLE public.opportunities_raw
- TABLE public.sources
- TRIGGER trg_compute_opportunity_quality
- TRIGGER trg_set_opportunity_ai_fingerprint_from_raw
- VIEW public.opportunities_inbox_it_v1
- VIEW public.opportunities_search_it_v1
- VIEW public.opportunities_search_v1

## Notes

- This is a heuristic summary derived from `diff -u` of pg_dump schema output.
- For exact details, inspect `docs/db/schema_snapshot.sql` changes in Git history.

