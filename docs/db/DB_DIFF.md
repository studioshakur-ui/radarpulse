# DB diff summary

- Generated (UTC): `2026-03-16 03:33:16Z`
- Schemas: `public`

This file summarizes changes detected between the previous and current `schema_snapshot.sql`.

## Added

- (none)

## Removed

- (none)

## Modified

- INDEX agent_runs_agent_type_started_at_idx
- INDEX agent_runs_opportunity_agent_started_at_idx
- INDEX agent_runs_raw_agent_started_at_idx
- INDEX agent_runs_source_agent_started_at_idx
- INDEX agent_runs_status_started_at_idx
- INDEX brief_versions_opportunity_created_at_idx
- INDEX decision_history_opportunity_user_created_at_idx
- INDEX decision_history_user_created_at_idx
- INDEX opportunity_extractions_fingerprint_idx
- INDEX opportunity_extractions_opportunity_created_at_idx
- INDEX opportunity_extractions_raw_created_at_idx
- INDEX opportunity_scores_opportunity_user_created_at_idx
- INDEX opportunity_scores_user_current_created_at_idx
- POLICY "Service
- POLICY "Users
- TABLE public.agent_runs
- TABLE public.brief_versions
- TABLE public.decision_history
- TABLE public.opportunity_extractions
- TABLE public.opportunity_scores
- TYPE public.agent_run_status
- TYPE public.agent_run_type

## Notes

- This is a heuristic summary derived from `diff -u` of pg_dump schema output.
- For exact details, inspect `docs/db/schema_snapshot.sql` changes in Git history.

