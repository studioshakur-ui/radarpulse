# DB diff summary

- Generated (UTC): `2026-03-18 03:20:04Z`
- Schemas: `public`

This file summarizes changes detected between the previous and current `schema_snapshot.sql`.

## Added

- (none)

## Removed

- (none)

## Modified

- FUNCTION public.set_updated_at_opportunity_workflows
- INDEX opportunity_preps_opportunity_user_created_at_idx
- INDEX opportunity_preps_user_current_created_at_idx
- INDEX opportunity_workflows_opportunity_id_idx
- INDEX opportunity_workflows_user_id_idx
- POLICY "Service
- POLICY "Users
- TABLE public.opportunity_preps
- TABLE public.opportunity_workflows
- TRIGGER trg_opportunity_workflows_updated_at

## Notes

- This is a heuristic summary derived from `diff -u` of pg_dump schema output.
- For exact details, inspect `docs/db/schema_snapshot.sql` changes in Git history.

