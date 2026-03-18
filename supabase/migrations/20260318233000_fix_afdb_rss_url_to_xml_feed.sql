update public.sources
set
  url = 'https://www.afdb.org/en/corporate-procurement/projects-and-operations/projects-and-operations/projects-and-operations/about-us/corporate-procurement/procurement-notices/current-solicitations.xml',
  updated_at = now()
where key = 'afdb_corporate_procurement_rss';
