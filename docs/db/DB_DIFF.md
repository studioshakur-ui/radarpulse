# DB diff summary

- Generated (UTC): `2026-03-15 13:16:22Z`
- Schemas: `public`

This file summarizes changes detected between the previous and current `schema_snapshot.sql`.

## Added

- (none)

## Removed

- (none)

## Modified

- FUNCTION public.set_updated_at_opportunity_briefs
- FUNCTION public.set_updated_at_opportunity_decisions
- INDEX opportunity_briefs_opportunity_id_idx
- INDEX opportunity_decisions_opportunity_id_idx
- INDEX opportunity_decisions_user_id_idx
- POLICY "Authenticated
- POLICY "Service
- POLICY "Users
- TABLE public.opportunity_briefs
- TABLE public.opportunity_decisions
- TRIGGER trg_opportunity_briefs_updated_at
- TRIGGER trg_opportunity_decisions_updated_at

## Notes

- This is a heuristic summary derived from `diff -u` of pg_dump schema output.
- For exact details, inspect `docs/db/schema_snapshot.sql` changes in Git history.

