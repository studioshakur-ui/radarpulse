update public.sources
set
  is_active = false,
  last_error = 'Disabled: Public Contracts Scotland API TLS chain rejected by worker runtime (UnknownIssuer)',
  updated_at = now()
where key = 'uk_public_contracts_scotland_active';
