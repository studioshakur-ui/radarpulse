-- opportunity-workflow Edge Function uses the service-role client to manage
-- current workflow rows for a user/opportunity pair. The table already has
-- RLS policies, but service_role still needs explicit DML grants.

grant select, insert, update, delete on table public.opportunity_workflows to service_role;
