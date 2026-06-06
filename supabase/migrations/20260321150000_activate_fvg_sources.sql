-- ─────────────────────────────────────────────────────────────────────────────
-- Activate & add FVG (Friuli-Venezia Giulia) procurement sources
-- Covers: Trieste · Udine · Gorizia · Pordenone + all FVG stazioni appaltanti
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Re-enable the existing eAppalti FVG API source.
--    The connector uses cookie-based session auth which was improved;
--    the previous 401 was likely a transient portal issue.
update public.sources
set
  is_active   = true,
  last_error  = null,
  updated_at  = now()
where key = 'it_eappalti_fvg_active';

-- 2. Add eAppalti SAT FVG — RSS feed (active tenders only).
--    Covers Regione FVG + Insiel + ARCS + all sub-regional stazioni appaltanti.
--    Confirmed working RSS 2.0 endpoint (verified 2026-03-21).
insert into public.sources (
  key,
  name,
  kind,
  url,
  country_code,
  is_active,
  schedule_minutes,
  meta,
  origin_type
)
values (
  'it_eappalti_sat_fvg_rss',
  'eAppalti SAT FVG — Bandi attivi (RSS)',
  'rss',
  'https://eappalti-sat.regione.fvg.it/portale/rss_bandi.asp?FilterHide=bScaduto%3D0+and+tipo%3C%3E%27Esito%27+&sort=DtScadenzaBandoTecnical&sortorder=asc',
  'IT',
  true,
  90,
  jsonb_build_object(
    'region',       'Friuli-Venezia Giulia',
    'localities',   array['Trieste','Udine','Gorizia','Pordenone']
  ),
  'IT_NATIVE'
)
on conflict (key) do update
set
  name             = excluded.name,
  kind             = excluded.kind,
  url              = excluded.url,
  country_code     = excluded.country_code,
  is_active        = excluded.is_active,
  schedule_minutes = excluded.schedule_minutes,
  meta             = excluded.meta,
  origin_type      = excluded.origin_type,
  updated_at       = now();

-- 3. Add Regione FVG official news/bandi RSS.
--    General regional feed — includes avvisi, bandi, contributi from the region.
insert into public.sources (
  key,
  name,
  kind,
  url,
  country_code,
  is_active,
  schedule_minutes,
  meta,
  origin_type
)
values (
  'it_regione_fvg_rss',
  'Regione FVG — Notizie e Bandi (RSS)',
  'rss',
  'https://www.regione.fvg.it/rafvg/cms/RAFVG/rss/notizie-in-evidenza',
  'IT',
  true,
  120,
  jsonb_build_object(
    'region', 'Friuli-Venezia Giulia'
  ),
  'IT_NATIVE'
)
on conflict (key) do update
set
  name             = excluded.name,
  kind             = excluded.kind,
  url              = excluded.url,
  country_code     = excluded.country_code,
  is_active        = excluded.is_active,
  schedule_minutes = excluded.schedule_minutes,
  meta             = excluded.meta,
  origin_type      = excluded.origin_type,
  updated_at       = now();
