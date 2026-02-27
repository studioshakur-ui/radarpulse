-- RadarPulse: Sources italiennes reelles
-- Idempotent: INSERT ... ON CONFLICT DO NOTHING / DO UPDATE
-- Migrations existantes a ne pas modifier:
--   20260227085910, 20260227090236, 20260227134000

-- 1. ANAC OCDS API (public, sans auth, CC-BY 4.0)
-- API documentee: https://dati.anticorruzione.it/opendata/ocds/api/ui
INSERT INTO public.sources (key, name, kind, url, country_code, is_active, schedule_minutes, meta)
VALUES (
  'it_anac_ocds',
  'ANAC - Open Data OCDS (Bandi attivi)',
  'api',
  'https://dati.anticorruzione.it/opendata/ocds/api',
  'IT',
  true,
  60,
  '{"provider":"it_anac_ocds","page":1,"limit":25}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET
  is_active  = true,
  url        = EXCLUDED.url,
  meta       = EXCLUDED.meta,
  updated_at = now();

-- 2. ANAC OCDS - page 2 (volume plus grand)
INSERT INTO public.sources (key, name, kind, url, country_code, is_active, schedule_minutes, meta)
VALUES (
  'it_anac_ocds_p2',
  'ANAC - Open Data OCDS (page 2)',
  'api',
  'https://dati.anticorruzione.it/opendata/ocds/api',
  'IT',
  true,
  90,
  '{"provider":"it_anac_ocds","page":2,"limit":25}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 3. Comune di Milano - bandi di gara
INSERT INTO public.sources (key, name, kind, url, country_code, is_active, schedule_minutes, meta)
VALUES (
  'it_milano_bandi_rss',
  'Comune di Milano - Bandi di gara',
  'rss',
  'https://www.comune.milano.it/aree-tematiche/appalti-e-forniture/bandi-di-gara/rss',
  'IT',
  false,
  120,
  '{"default_lang":"it","default_type":"tender","default_buyer":"Comune di Milano"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 4. Comune di Roma - bandi di gara
INSERT INTO public.sources (key, name, kind, url, country_code, is_active, schedule_minutes, meta)
VALUES (
  'it_roma_bandi_rss',
  'Comune di Roma - Bandi di gara',
  'rss',
  'https://www.comune.roma.it/servizi/bandi-di-gara/rss',
  'IT',
  false,
  120,
  '{"default_lang":"it","default_type":"tender","default_buyer":"Comune di Roma"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 5. INPS - bandi di gara
INSERT INTO public.sources (key, name, kind, url, country_code, is_active, schedule_minutes, meta)
VALUES (
  'it_inps_bandi_rss',
  'INPS - Bandi di gara',
  'rss',
  'https://www.inps.it/it/it/dati-bilanci-e-rendiconti/appalti-e-contratti/bandi-di-gara.rss.html',
  'IT',
  false,
  180,
  '{"default_lang":"it","default_type":"tender","default_buyer":"INPS"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 6. ARIA Lombardia - centrale acquisti
INSERT INTO public.sources (key, name, kind, url, country_code, is_active, schedule_minutes, meta)
VALUES (
  'it_aria_lombardia_rss',
  'ARIA Lombardia - Bandi di gara',
  'rss',
  'https://www.ariaspa.it/wps/portal/site/aria/bandi-di-gara/rss',
  'IT',
  false,
  120,
  '{"default_lang":"it","default_type":"tender","default_buyer":"ARIA SpA - Regione Lombardia"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 7. Ministero Infrastrutture e Trasporti (MIT)
INSERT INTO public.sources (key, name, kind, url, country_code, is_active, schedule_minutes, meta)
VALUES (
  'it_mit_bandi_rss',
  'MIT - Ministero Infrastrutture e Trasporti',
  'rss',
  'https://www.mit.gov.it/comunicazione/news/rss.xml',
  'IT',
  false,
  240,
  '{"default_lang":"it","default_type":"tender","default_buyer":"Ministero delle Infrastrutture e dei Trasporti"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 8. Consip - centrale acquisti nazionale
INSERT INTO public.sources (key, name, kind, url, country_code, is_active, schedule_minutes, meta)
VALUES (
  'it_consip_bandi_rss',
  'Consip - Bandi di gara',
  'rss',
  'https://www.consip.it/bandi-di-gara/rss',
  'IT',
  false,
  120,
  '{"default_lang":"it","default_type":"tender","default_buyer":"Consip SpA"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- NOTE
-- Sources avec is_active=false: URLs RSS a valider manuellement avant activation.
-- Les portails PA italiens changent leurs URLs RSS sans preavis.
