create index if not exists idx_opportunities_country_deadline
  on public.opportunities (country_code, deadline_at);

create index if not exists idx_opportunities_country_updated_desc
  on public.opportunities (country_code, updated_at desc);
