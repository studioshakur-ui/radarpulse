alter table public.sources
add column if not exists origin_type text default 'EU';

update public.sources
set origin_type = 'EU'
where key = 'rss_ted_comp_it';
