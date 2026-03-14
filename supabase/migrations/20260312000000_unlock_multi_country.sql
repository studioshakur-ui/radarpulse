-- Sprint 2: unlock country_code constraint to allow non-IT/EU opportunities.
-- Italy remains the default in the application layer (not enforced at DB level).
-- The constraint 'opportunities_country_code_it_eu_check' was added in
-- 20260301090000_enforce_true_country_code.sql and blocks inserting FR, DE, etc.

alter table public.opportunities
  drop constraint if exists opportunities_country_code_it_eu_check;
