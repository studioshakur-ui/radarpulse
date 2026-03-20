# DB diff summary

- Generated (UTC): `2026-03-20 09:27:29Z`
- Schemas: `public`

This file summarizes changes detected between the previous and current `schema_snapshot.sql`.

## Added

- (none)

## Removed

- (none)

## Modified

- FUNCTION public.set_updated_at_dossiers
- INDEX dossier_tasks_dossier_id_idx
- INDEX dossiers_opportunity_id_idx
- INDEX dossiers_status_idx
- INDEX dossiers_user_id_idx
- POLICY "Service
- POLICY "Users
- TABLE public.dossier_tasks
- TABLE public.dossiers
- TRIGGER trg_dossiers_updated_at

## Notes

- This is a heuristic summary derived from `diff -u` of pg_dump schema output.
- For exact details, inspect `docs/db/schema_snapshot.sql` changes in Git history.

