update public.sources
set
  is_active = false,
  updated_at = now()
where key = 'us_sam_gov_contract_opportunities';
