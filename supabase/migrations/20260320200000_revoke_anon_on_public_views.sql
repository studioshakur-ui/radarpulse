-- S3-09 / Audit-2026-03-07 item 2:
-- The views opportunities_search_v1 and opportunities_inbox_it_v1 were originally
-- granted SELECT to anon, making all opportunity data readable by anyone without
-- authentication via the PostgREST REST API.
--
-- All data access now goes through Edge Functions that use service_role clients
-- and enforce auth + subscription checks before querying these views.
-- Revoking anon access closes the bypass path.

revoke select on public.opportunities_search_v1 from anon;
revoke select on public.opportunities_inbox_it_v1 from anon;

-- Keep authenticated so RLS-scoped direct queries (if any) still work for signed-in users.
-- service_role is not affected by REVOKE — it bypasses grants entirely.
