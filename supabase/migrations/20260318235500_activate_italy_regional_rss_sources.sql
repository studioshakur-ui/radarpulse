update public.sources
set
  is_active = true,
  last_error = null,
  updated_at = now()
where key in (
  'it_milano_bandi_rss',
  'it_roma_bandi_rss',
  'it_aria_lombardia_rss'
);
