update public.sources
set
  is_active = false,
  last_error = 'Disabled: Comune di Milano RSS endpoint returns 403 Forbidden with current generic RSS connector',
  updated_at = now()
where key = 'it_milano_bandi_rss';
