update public.sources
set
  is_active = false,
  last_error = 'Disabled: AfDB RSS endpoints return 403 Forbidden with current generic RSS connector',
  updated_at = now()
where key = 'afdb_corporate_procurement_rss';
