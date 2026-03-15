-- PostgREST's ON CONFLICT clause requires a full UNIQUE constraint, not a partial index.
-- The existing partial index (WHERE external_id IS NOT NULL) is invisible to ON CONFLICT,
-- causing "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- whenever a connector tries to upsert with a non-null external_id.
--
-- PostgreSQL allows multiple NULLs in a full UNIQUE constraint (NULL != NULL),
-- so replacing the partial index with a full constraint is behaviorally equivalent.

drop index if exists public.opportunities_raw_source_external_unique;

alter table public.opportunities_raw
  add constraint opportunities_raw_source_external_unique
  unique (source_key, external_id);
