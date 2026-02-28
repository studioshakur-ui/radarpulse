create index if not exists opportunities_live_published_at_desc_idx
  on public.opportunities (published_at desc)
  where is_deleted = false;

create index if not exists opportunities_live_country_published_desc_idx
  on public.opportunities (country_code, published_at desc)
  where is_deleted = false;
