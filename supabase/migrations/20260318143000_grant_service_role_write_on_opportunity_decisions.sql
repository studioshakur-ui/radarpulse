-- opportunity-decision Edge Function uses the service-role client to manage
-- current-state decision rows before writing audit history.
-- decision_history already grants service_role insert; opportunity_decisions
-- needs matching DML grants for insert/update/delete paths.

grant select, insert, update, delete on table public.opportunity_decisions to service_role;
