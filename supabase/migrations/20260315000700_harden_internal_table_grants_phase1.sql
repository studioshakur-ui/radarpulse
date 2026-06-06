revoke all on table public.opportunities_raw from public;
revoke all on table public.opportunities_raw from anon;
revoke all on table public.opportunities_raw from authenticated;

revoke all on table public.opportunity_ai from public;
revoke all on table public.opportunity_ai from anon;
revoke all on table public.opportunity_ai from authenticated;

revoke all on table public.opportunity_ai_evidence from public;
revoke all on table public.opportunity_ai_evidence from anon;
revoke all on table public.opportunity_ai_evidence from authenticated;

revoke all on table public.rp_ai_runs from public;
revoke all on table public.rp_ai_runs from anon;
revoke all on table public.rp_ai_runs from authenticated;

revoke all on table public.ingestion_jobs from public;
revoke all on table public.ingestion_jobs from anon;
revoke all on table public.ingestion_jobs from authenticated;

revoke all on table public.ingestion_runs from public;
revoke all on table public.ingestion_runs from anon;
revoke all on table public.ingestion_runs from authenticated;

revoke all on table public.agent_runs from public;
revoke all on table public.agent_runs from anon;
revoke all on table public.agent_runs from authenticated;

revoke all on table public.opportunity_extractions from public;
revoke all on table public.opportunity_extractions from anon;
revoke all on table public.opportunity_extractions from authenticated;

revoke all on table public.opportunity_scores from public;
revoke all on table public.opportunity_scores from anon;
revoke all on table public.opportunity_scores from authenticated;

revoke all on table public.brief_versions from public;
revoke all on table public.brief_versions from anon;
revoke all on table public.brief_versions from authenticated;

grant select, insert, update, delete on table public.opportunities_raw to service_role;
grant select, insert, update, delete on table public.opportunity_ai to service_role;
grant select, insert, update, delete on table public.opportunity_ai_evidence to service_role;
grant select, insert, update, delete on table public.rp_ai_runs to service_role;
grant select, insert, update, delete on table public.ingestion_jobs to service_role;
grant select, insert, update, delete on table public.ingestion_runs to service_role;
grant select, insert, update on table public.agent_runs to service_role;
grant select, insert, update on table public.opportunity_extractions to service_role;
grant select, insert, update on table public.opportunity_scores to service_role;
grant select, insert, update on table public.brief_versions to service_role;
