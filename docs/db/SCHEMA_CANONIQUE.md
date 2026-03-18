                                                                                                             line                                                                                                              
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 # RadarPulse — Vue canonique de la base
 
 Générée automatiquement via `scripts/db/update-db-docs.sh` (Docker + psql/pg_dump).
 
 ## Sommaire
 - Schemas
 - Enums
 - Tables
 - Views
 - Functions
 
 ## Schemas
 - `public`
 
 ## Enums
 - `public.agent_run_status` = 'queued', 'running', 'success', 'error', 'skipped'
 - `public.agent_run_type` = 'source', 'extract', 'score', 'brief', 'prep', 'deadline'
 - `public.event_type` = 'NEW', 'UPDATED', 'DEADLINE_CHANGED', 'NEW_DOC', 'AWARDED', 'EXPIRED'
 - `public.job_status` = 'queued', 'running', 'success', 'error'
 - `public.notify_channel` = 'email', 'telegram', 'whatsapp'
 - `public.notify_status` = 'queued', 'sending', 'sent', 'error'
 - `public.opportunity_status` = 'active', 'expired', 'archived'
 - `public.opportunity_type` = 'tender', 'grant'
 - `public.rp_ai_run_status` = 'success', 'error', 'skipped'
 - `public.rp_buyer_type` = 'un', 'ifi', 'gov', 'private', 'foundation', 'ngo', 'unknown'
 - `public.rp_content_type` = 'tender', 'grant', 'news', 'other'
 - `public.rp_deadline_confidence` = 'exact', 'approx', 'unknown'
 - `public.rp_evidence_confidence` = 'high', 'med', 'low'
 - `public.rp_extraction_quality` = 'high', 'med', 'low'
 - `public.source_kind` = 'rss', 'api', 'html', 'pdf'
 
 ## Tables
 
 ### Résumé
 - `public.access_requests` — size: 32 kB — RLS: on — cols: 6
 - `public.agent_runs` — size: 1440 kB — RLS: on — cols: 21
 - `public.brief_versions` — size: 160 kB — RLS: on — cols: 19
 - `public.buyers` — size: 24 kB — RLS: on — cols: 5
 - `public.decision_history` — size: 64 kB — RLS: on — cols: 12
 - `public.geo_countries` — size: 80 kB — RLS: on — cols: 10
 - `public.geo_localities` — size: 80 kB — RLS: on — cols: 9
 - `public.geo_regions` — size: 80 kB — RLS: on — cols: 9
 - `public.geo_zones` — size: 64 kB — RLS: on — cols: 9
 - `public.ingestion_jobs` — size: 192 kB — RLS: on — cols: 11
 - `public.ingestion_runs` — size: 112 kB — RLS: off — cols: 12
 - `public.magic_link_tokens` — size: 80 kB — RLS: on — cols: 7
 - `public.notification_logs` — size: 16 kB — RLS: on — cols: 8
 - `public.notification_preferences` — size: 32 kB — RLS: on — cols: 6
 - `public.notification_queue` — size: 24 kB — RLS: on — cols: 11
 - `public.opportunities` — size: 2128 kB — RLS: on — cols: 21
 - `public.opportunities_raw` — size: 2144 kB — RLS: off — cols: 19
 - `public.opportunity_ai` — size: 624 kB — RLS: off — cols: 34
 - `public.opportunity_ai_evidence` — size: 200 kB — RLS: off — cols: 8
 - `public.opportunity_briefs` — size: 64 kB — RLS: on — cols: 13
 - `public.opportunity_decisions` — size: 80 kB — RLS: on — cols: 8
 - `public.opportunity_documents` — size: 24 kB — RLS: on — cols: 8
 - `public.opportunity_events` — size: 80 kB — RLS: on — cols: 5
 - `public.opportunity_extractions` — size: 2832 kB — RLS: on — cols: 41
 - `public.opportunity_preps` — size: 144 kB — RLS: on — cols: 17
 - `public.opportunity_scores` — size: 896 kB — RLS: on — cols: 18
 - `public.opportunity_workflows` — size: 40 kB — RLS: on — cols: 6
 - `public.rp_ai_runs` — size: 632 kB — RLS: off — cols: 11
 - `public.sources` — size: 96 kB — RLS: on — cols: 15
 - `public.subscriptions` — size: 104 kB — RLS: on — cols: 14
 - `public.telegram_profiles` — size: 16 kB — RLS: on — cols: 4
 - `public.user_profiles` — size: 32 kB — RLS: on — cols: 7
 - `public.whatsapp_optins` — size: 16 kB — RLS: on — cols: 5
 
 ### Détails par table
 
 #### Table: `public.access_requests`
 #### Table: `public.agent_runs`
 #### Table: `public.brief_versions`
 #### Table: `public.buyers`
 #### Table: `public.decision_history`
 #### Table: `public.geo_countries`
 #### Table: `public.geo_localities`
 #### Table: `public.geo_regions`
 #### Table: `public.geo_zones`
 #### Table: `public.ingestion_jobs`
 #### Table: `public.ingestion_runs`
 #### Table: `public.magic_link_tokens`
 #### Table: `public.notification_logs`
 #### Table: `public.notification_preferences`
 #### Table: `public.notification_queue`
 #### Table: `public.opportunities`
 #### Table: `public.opportunities_raw`
 #### Table: `public.opportunity_ai`
 #### Table: `public.opportunity_ai_evidence`
 #### Table: `public.opportunity_briefs`
 #### Table: `public.opportunity_decisions`
 #### Table: `public.opportunity_documents`
 #### Table: `public.opportunity_events`
 #### Table: `public.opportunity_extractions`
 #### Table: `public.opportunity_preps`
 #### Table: `public.opportunity_scores`
 #### Table: `public.opportunity_workflows`
 #### Table: `public.rp_ai_runs`
 #### Table: `public.sources`
 #### Table: `public.subscriptions`
 #### Table: `public.telegram_profiles`
 #### Table: `public.user_profiles`
 #### Table: `public.whatsapp_optins`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `off`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `off`
 - **RLS**: `off`
 - **RLS**: `off`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `off`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **RLS**: `on`
 - **Size**: `32 kB`
 - **Size**: `1440 kB`
 - **Size**: `160 kB`
 - **Size**: `24 kB`
 - **Size**: `64 kB`
 - **Size**: `80 kB`
 - **Size**: `80 kB`
 - **Size**: `80 kB`
 - **Size**: `64 kB`
 - **Size**: `192 kB`
 - **Size**: `112 kB`
 - **Size**: `80 kB`
 - **Size**: `16 kB`
 - **Size**: `32 kB`
 - **Size**: `24 kB`
 - **Size**: `2128 kB`
 - **Size**: `2144 kB`
 - **Size**: `624 kB`
 - **Size**: `200 kB`
 - **Size**: `64 kB`
 - **Size**: `80 kB`
 - **Size**: `24 kB`
 - **Size**: `80 kB`
 - **Size**: `2832 kB`
 - **Size**: `144 kB`
 - **Size**: `896 kB`
 - **Size**: `40 kB`
 - **Size**: `632 kB`
 - **Size**: `96 kB`
 - **Size**: `104 kB`
 - **Size**: `16 kB`
 - **Size**: `32 kB`
 - **Size**: `16 kB`
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 | Column | Type | Nullable | Default |
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 |---|---|---|---|
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `name` | `text` | `no` | — |
 | `email` | `text` | `no` | — |
 | `organization` | `text` | `yes` | — |
 | `use_case` | `text` | `yes` | — |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `agent_type` | `agent_run_type` | `no` | — |
 | `status` | `agent_run_status` | `no` | — |
 | `trigger_type` | `text` | `no` | — |
 | `source_id` | `uuid` | `yes` | — |
 | `ingestion_run_id` | `uuid` | `yes` | — |
 | `raw_id` | `uuid` | `yes` | — |
 | `opportunity_id` | `uuid` | `yes` | — |
 | `user_id` | `uuid` | `yes` | — |
 | `subject_key` | `text` | `yes` | — |
 | `model` | `text` | `yes` | — |
 | `prompt_version` | `text` | `yes` | — |
 | `agent_version` | `text` | `no` | — |
 | `started_at` | `timestamp with time zone` | `no` | — |
 | `finished_at` | `timestamp with time zone` | `yes` | — |
 | `duration_ms` | `integer` | `yes` | — |
 | `error_message` | `text` | `yes` | — |
 | `input_ref` | `jsonb` | `yes` | — |
 | `output_ref` | `jsonb` | `yes` | — |
 | `meta` | `jsonb` | `no` | '{}'::jsonb |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `opportunity_id` | `uuid` | `no` | — |
 | `agent_run_id` | `uuid` | `no` | — |
 | `source_extraction_id` | `uuid` | `yes` | — |
 | `source_score_id` | `uuid` | `yes` | — |
 | `is_backfilled` | `boolean` | `no` | false |
 | `is_current` | `boolean` | `no` | false |
 | `model` | `text` | `no` | — |
 | `prompt_version` | `text` | `no` | — |
 | `brief_version` | `text` | `no` | — |
 | `executive_summary` | `text` | `no` | — |
 | `fit_assessment` | `text` | `no` | — |
 | `risk_flags` | `text[]` | `no` | '{}'::text[] |
 | `required_documents` | `text[]` | `no` | '{}'::text[] |
 | `next_action` | `text` | `no` | — |
 | `input_snapshot` | `jsonb` | `yes` | — |
 | `generation_ms` | `integer` | `yes` | — |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `output_locale` | `text` | `yes` | 'en'::text |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `country_code` | `text` | `yes` | — |
 | `name` | `text` | `no` | — |
 | `normalized_name` | `text` | `no` | — |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `opportunity_id` | `uuid` | `no` | — |
 | `user_id` | `uuid` | `no` | — |
 | `opportunity_decision_id` | `uuid` | `yes` | — |
 | `agent_run_id` | `uuid` | `yes` | — |
 | `event_type` | `text` | `no` | — |
 | `decision_value` | `text` | `yes` | — |
 | `previous_decision_value` | `text` | `yes` | — |
 | `note` | `text` | `yes` | — |
 | `source` | `text` | `no` | — |
 | `is_backfilled` | `boolean` | `no` | false |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `zone_id` | `uuid` | `no` | — |
 | `country_code` | `text` | `no` | — |
 | `slug` | `text` | `no` | — |
 | `name` | `text` | `no` | — |
 | `territory_kind` | `text` | `no` | 'country'::text |
 | `flag_emoji` | `text` | `yes` | — |
 | `sort_order` | `integer` | `no` | 0 |
 | `is_active` | `boolean` | `no` | true |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `region_id` | `uuid` | `no` | — |
 | `slug` | `text` | `no` | — |
 | `name` | `text` | `no` | — |
 | `normalized_name` | `text` | `no` | — |
 | `code` | `text` | `yes` | — |
 | `sort_order` | `integer` | `no` | 0 |
 | `is_active` | `boolean` | `no` | true |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `country_id` | `uuid` | `no` | — |
 | `slug` | `text` | `no` | — |
 | `name` | `text` | `no` | — |
 | `normalized_name` | `text` | `no` | — |
 | `code` | `text` | `yes` | — |
 | `sort_order` | `integer` | `no` | 0 |
 | `is_active` | `boolean` | `no` | true |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `parent_zone_id` | `uuid` | `yes` | — |
 | `slug` | `text` | `no` | — |
 | `name` | `text` | `no` | — |
 | `kind` | `text` | `no` | — |
 | `description` | `text` | `yes` | — |
 | `sort_order` | `integer` | `no` | 0 |
 | `is_active` | `boolean` | `no` | true |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `id` | `bigint` | `no` | nextval('ingestion_jobs_id_seq'::regclass) |
 | `source_id` | `uuid` | `no` | — |
 | `status` | `job_status` | `no` | 'queued'::job_status |
 | `attempts` | `integer` | `no` | 0 |
 | `run_at` | `timestamp with time zone` | `no` | now() |
 | `started_at` | `timestamp with time zone` | `yes` | — |
 | `finished_at` | `timestamp with time zone` | `yes` | — |
 | `payload` | `jsonb` | `no` | '{}'::jsonb |
 | `error` | `text` | `yes` | — |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `updated_at` | `timestamp with time zone` | `no` | now() |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `source_id` | `uuid` | `no` | — |
 | `source_key` | `text` | `no` | — |
 | `started_at` | `timestamp with time zone` | `no` | now() |
 | `finished_at` | `timestamp with time zone` | `yes` | — |
 | `status` | `text` | `no` | 'RUNNING'::text |
 | `fetched_count` | `integer` | `no` | 0 |
 | `raw_upserted_count` | `integer` | `no` | 0 |
 | `opp_upserted_count` | `integer` | `no` | 0 |
 | `error` | `text` | `yes` | — |
 | `cursor` | `text` | `yes` | — |
 | `meta` | `jsonb` | `no` | '{}'::jsonb |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `email` | `text` | `no` | — |
 | `token` | `text` | `no` | — |
 | `used` | `boolean` | `yes` | false |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `expires_at` | `timestamp with time zone` | `no` | — |
 | `used_at` | `timestamp with time zone` | `yes` | — |
 | `id` | `bigint` | `no` | nextval('notification_logs_id_seq'::regclass) |
 | `queue_id` | `bigint` | `yes` | — |
 | `user_id` | `uuid` | `yes` | — |
 | `channel` | `notify_channel` | `yes` | — |
 | `status` | `text` | `no` | — |
 | `provider_id` | `text` | `yes` | — |
 | `detail` | `jsonb` | `no` | '{}'::jsonb |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `user_id` | `uuid` | `no` | — |
 | `email_digest_enabled` | `boolean` | `no` | true |
 | `email_digest_frequency` | `text` | `no` | 'daily'::text |
 | `last_digest_at` | `timestamp with time zone` | `yes` | — |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `updated_at` | `timestamp with time zone` | `no` | now() |
 | `id` | `bigint` | `no` | nextval('notification_queue_id_seq'::regclass) |
 | `user_id` | `uuid` | `no` | — |
 | `channel` | `notify_channel` | `no` | — |
 | `status` | `notify_status` | `no` | 'queued'::notify_status |
 | `template` | `text` | `yes` | — |
 | `payload` | `jsonb` | `no` | '{}'::jsonb |
 | `scheduled_at` | `timestamp with time zone` | `no` | now() |
 | `started_at` | `timestamp with time zone` | `yes` | — |
 | `finished_at` | `timestamp with time zone` | `yes` | — |
 | `error` | `text` | `yes` | — |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `source_id` | `uuid` | `no` | — |
 | `external_id` | `text` | `yes` | — |
 | `fingerprint` | `text` | `no` | — |
 | `type` | `opportunity_type` | `no` | — |
 | `status` | `opportunity_status` | `no` | 'active'::opportunity_status |
 | `is_public` | `boolean` | `no` | true |
 | `country_code` | `text` | `yes` | — |
 | `buyer_id` | `uuid` | `yes` | — |
 | `buyer_name` | `text` | `yes` | — |
 | `title` | `text` | `no` | — |
 | `summary` | `text` | `yes` | — |
 | `published_at` | `timestamp with time zone` | `yes` | — |
 | `deadline_at` | `timestamp with time zone` | `yes` | — |
 | `deadline_tz` | `text` | `yes` | — |
 | `source_url` | `text` | `no` | — |
 | `language` | `text` | `yes` | — |
 | `raw` | `jsonb` | `no` | '{}'::jsonb |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `updated_at` | `timestamp with time zone` | `no` | now() |
 | `is_deleted` | `boolean` | `no` | false |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `source_id` | `uuid` | `yes` | — |
 | `source_key` | `text` | `no` | — |
 | `external_id` | `text` | `yes` | — |
 | `url` | `text` | `no` | — |
 | `url_canonical` | `text` | `no` | — |
 | `title_raw` | `text` | `no` | — |
 | `snippet_raw` | `text` | `yes` | — |
 | `content_raw` | `text` | `yes` | — |
 | `content_hash` | `text` | `no` | — |
 | `published_at` | `timestamp with time zone` | `yes` | — |
 | `fetched_at` | `timestamp with time zone` | `no` | now() |
 | `language_hint` | `text` | `yes` | — |
 | `raw_kind_hint` | `text` | `yes` | — |
 | `attachments` | `jsonb` | `yes` | '[]'::jsonb |
 | `ingest_run_id` | `uuid` | `yes` | — |
 | `ingest_errors` | `jsonb` | `yes` | — |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `updated_at` | `timestamp with time zone` | `no` | now() |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `raw_id` | `uuid` | `no` | — |
 | `model` | `text` | `no` | — |
 | `extract_version` | `text` | `no` | — |
 | `extracted_at` | `timestamp with time zone` | `no` | now() |
 | `content_type` | `rp_content_type` | `no` | — |
 | `buyer_type` | `rp_buyer_type` | `no` | — |
 | `buyer_name` | `text` | `yes` | — |
 | `sector` | `text` | `yes` | — |
 | `country_code` | `text` | `yes` | — |
 | `region` | `text` | `yes` | — |
 | `language` | `text` | `yes` | — |
 | `deadline_at` | `timestamp with time zone` | `yes` | — |
 | `deadline_tz` | `text` | `yes` | — |
 | `deadline_confidence` | `rp_deadline_confidence` | `no` | 'unknown'::rp_deadline_confidence |
 | `eligibility` | `jsonb` | `yes` | — |
 | `required_docs` | `jsonb` | `yes` | — |
 | `submission` | `jsonb` | `yes` | — |
 | `budget_value` | `numeric` | `yes` | — |
 | `budget_currency` | `text` | `yes` | — |
 | `budget_confidence` | `rp_evidence_confidence` | `yes` | — |
 | `risks` | `jsonb` | `yes` | — |
 | `summary_10s` | `text` | `no` | — |
 | `fingerprint` | `text` | `no` | — |
 | `extraction_quality` | `rp_extraction_quality` | `no` | — |
 | `needs_review` | `boolean` | `no` | true |
 | `missing_fields` | `jsonb` | `no` | '[]'::jsonb |
 | `signals` | `jsonb` | `no` | '{}'::jsonb |
 | `raw_snapshot` | `jsonb` | `yes` | — |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `updated_at` | `timestamp with time zone` | `no` | now() |
 | `quality_score` | `numeric` | `yes` | 0 |
 | `completeness_score` | `numeric` | `yes` | 0 |
 | `locality` | `text` | `yes` | — |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `ai_id` | `uuid` | `no` | — |
 | `field` | `text` | `no` | — |
 | `evidence_text` | `text` | `no` | — |
 | `source` | `text` | `no` | 'content_raw'::text |
 | `locator` | `jsonb` | `yes` | — |
 | `confidence` | `rp_evidence_confidence` | `no` | 'med'::rp_evidence_confidence |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `opportunity_id` | `uuid` | `no` | — |
 | `executive_summary` | `text` | `no` | ''::text |
 | `fit_assessment` | `text` | `no` | ''::text |
 | `risk_flags` | `text[]` | `no` | '{}'::text[] |
 | `required_documents` | `text[]` | `no` | '{}'::text[] |
 | `next_action` | `text` | `no` | ''::text |
 | `model` | `text` | `no` | ''::text |
 | `prompt_version` | `text` | `no` | 'v1'::text |
 | `generation_ms` | `integer` | `yes` | — |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `updated_at` | `timestamp with time zone` | `no` | now() |
 | `output_locale` | `text` | `yes` | 'en'::text |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `opportunity_id` | `uuid` | `no` | — |
 | `user_id` | `uuid` | `no` | — |
 | `decision` | `text` | `no` | — |
 | `note` | `text` | `yes` | — |
 | `decided_at` | `timestamp with time zone` | `no` | now() |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `updated_at` | `timestamp with time zone` | `no` | now() |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `opportunity_id` | `uuid` | `no` | — |
 | `doc_title` | `text` | `yes` | — |
 | `doc_url` | `text` | `no` | — |
 | `doc_hash` | `text` | `yes` | — |
 | `doc_type` | `text` | `yes` | — |
 | `storage_path` | `text` | `yes` | — |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `opportunity_id` | `uuid` | `no` | — |
 | `type` | `event_type` | `no` | — |
 | `occurred_at` | `timestamp with time zone` | `no` | now() |
 | `data` | `jsonb` | `no` | '{}'::jsonb |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `opportunity_id` | `uuid` | `no` | — |
 | `raw_id` | `uuid` | `no` | — |
 | `agent_run_id` | `uuid` | `no` | — |
 | `source_id` | `uuid` | `no` | — |
 | `fingerprint` | `text` | `no` | — |
 | `is_backfilled` | `boolean` | `no` | false |
 | `is_current` | `boolean` | `no` | false |
 | `extract_version` | `text` | `no` | — |
 | `model` | `text` | `no` | — |
 | `content_type` | `rp_content_type` | `no` | — |
 | `buyer_type` | `rp_buyer_type` | `no` | — |
 | `buyer_name` | `text` | `yes` | — |
 | `sector` | `text` | `yes` | — |
 | `country_code` | `text` | `yes` | — |
 | `region` | `text` | `yes` | — |
 | `language` | `text` | `yes` | — |
 | `deadline_at` | `timestamp with time zone` | `yes` | — |
 | `deadline_tz` | `text` | `yes` | — |
 | `deadline_confidence` | `rp_deadline_confidence` | `no` | — |
 | `eligibility` | `jsonb` | `yes` | — |
 | `required_docs` | `jsonb` | `yes` | — |
 | `submission` | `jsonb` | `yes` | — |
 | `budget_value` | `numeric` | `yes` | — |
 | `budget_currency` | `text` | `yes` | — |
 | `budget_confidence` | `rp_evidence_confidence` | `yes` | — |
 | `risks` | `jsonb` | `yes` | — |
 | `summary_10s` | `text` | `no` | — |
 | `extraction_quality` | `rp_extraction_quality` | `no` | — |
 | `needs_review` | `boolean` | `no` | — |
 | `missing_fields` | `jsonb` | `no` | — |
 | `signals` | `jsonb` | `no` | — |
 | `raw_snapshot` | `jsonb` | `yes` | — |
 | `quality_score` | `numeric` | `yes` | — |
 | `completeness_score` | `numeric` | `yes` | — |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `geo_country_id` | `uuid` | `yes` | — |
 | `geo_region_id` | `uuid` | `yes` | — |
 | `geo_locality_id` | `uuid` | `yes` | — |
 | `geo_resolution_confidence` | `text` | `yes` | — |
 | `locality` | `text` | `yes` | — |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `opportunity_id` | `uuid` | `no` | — |
 | `agent_run_id` | `uuid` | `no` | — |
 | `user_id` | `uuid` | `no` | — |
 | `is_backfilled` | `boolean` | `no` | false |
 | `is_current` | `boolean` | `no` | false |
 | `prep_version` | `text` | `no` | — |
 | `model` | `text` | `yes` | — |
 | `generation_ms` | `integer` | `yes` | — |
 | `checklist` | `jsonb` | `no` | '[]'::jsonb |
 | `missing_docs` | `text[]` | `no` | '{}'::text[] |
 | `effort_days` | `numeric` | `yes` | — |
 | `blockers` | `text[]` | `no` | '{}'::text[] |
 | `response_plan` | `text` | `no` | — |
 | `input_snapshot` | `jsonb` | `yes` | — |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `output_locale` | `text` | `yes` | 'en'::text |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `opportunity_id` | `uuid` | `no` | — |
 | `agent_run_id` | `uuid` | `no` | — |
 | `user_id` | `uuid` | `no` | — |
 | `subject_type` | `text` | `no` | 'user'::text |
 | `is_backfilled` | `boolean` | `no` | false |
 | `is_current` | `boolean` | `no` | false |
 | `score_version` | `text` | `no` | — |
 | `model` | `text` | `yes` | — |
 | `score_value` | `numeric` | `no` | — |
 | `score_band` | `text` | `yes` | — |
 | `rationale_summary` | `text` | `no` | — |
 | `rationale_json` | `jsonb` | `no` | — |
 | `input_profile_snapshot` | `jsonb` | `yes` | — |
 | `input_extraction_id` | `uuid` | `yes` | — |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `recommendation` | `text` | `yes` | — |
 | `output_locale` | `text` | `yes` | 'en'::text |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `opportunity_id` | `uuid` | `no` | — |
 | `user_id` | `uuid` | `no` | — |
 | `workflow_status` | `text` | `no` | — |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `updated_at` | `timestamp with time zone` | `no` | now() |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `raw_id` | `uuid` | `no` | — |
 | `ai_id` | `uuid` | `yes` | — |
 | `extract_version` | `text` | `no` | — |
 | `model` | `text` | `no` | — |
 | `started_at` | `timestamp with time zone` | `no` | now() |
 | `finished_at` | `timestamp with time zone` | `yes` | — |
 | `duration_ms` | `integer` | `yes` | — |
 | `status` | `rp_ai_run_status` | `no` | 'success'::rp_ai_run_status |
 | `error_message` | `text` | `yes` | — |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `key` | `text` | `no` | — |
 | `name` | `text` | `no` | — |
 | `kind` | `source_kind` | `no` | 'rss'::source_kind |
 | `url` | `text` | `no` | — |
 | `country_code` | `text` | `yes` | — |
 | `is_active` | `boolean` | `no` | true |
 | `schedule_minutes` | `integer` | `no` | 60 |
 | `last_run_at` | `timestamp with time zone` | `yes` | — |
 | `last_success_at` | `timestamp with time zone` | `yes` | — |
 | `last_error` | `text` | `yes` | — |
 | `meta` | `jsonb` | `no` | '{}'::jsonb |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `updated_at` | `timestamp with time zone` | `no` | now() |
 | `origin_type` | `text` | `yes` | 'EU'::text |
 | `id` | `uuid` | `no` | gen_random_uuid() |
 | `user_id` | `uuid` | `no` | — |
 | `is_active` | `boolean` | `no` | true |
 | `channels` | `jsonb` | `no` | '{}'::jsonb |
 | `filters` | `jsonb` | `no` | '{}'::jsonb |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `updated_at` | `timestamp with time zone` | `no` | now() |
 | `stripe_customer_id` | `text` | `yes` | — |
 | `stripe_subscription_id` | `text` | `yes` | — |
 | `stripe_price_id` | `text` | `yes` | — |
 | `status` | `text` | `yes` | 'inactive'::text |
 | `current_period_start` | `timestamp with time zone` | `yes` | — |
 | `current_period_end` | `timestamp with time zone` | `yes` | — |
 | `cancel_at_period_end` | `boolean` | `yes` | false |
 | `user_id` | `uuid` | `no` | — |
 | `chat_id` | `text` | `no` | — |
 | `is_verified` | `boolean` | `no` | false |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `user_id` | `uuid` | `no` | — |
 | `full_name` | `text` | `yes` | — |
 | `organization` | `text` | `yes` | — |
 | `country_focus` | `text` | `yes` | — |
 | `onboarding_complete_at` | `timestamp with time zone` | `yes` | — |
 | `created_at` | `timestamp with time zone` | `no` | now() |
 | `updated_at` | `timestamp with time zone` | `no` | now() |
 | `user_id` | `uuid` | `no` | — |
 | `phone_e164` | `text` | `no` | — |
 | `language` | `text` | `yes` | — |
 | `consent_at` | `timestamp with time zone` | `no` | now() |
 | `consent_source` | `text` | `yes` | — |
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 ##### Indexes
 - `CREATE UNIQUE INDEX access_requests_pkey ON public.access_requests USING btree (id)`
 - `CREATE INDEX agent_runs_agent_type_started_at_idx ON public.agent_runs USING btree (agent_type, started_at DESC)`
 - `CREATE INDEX agent_runs_opportunity_agent_started_at_idx ON public.agent_runs USING btree (opportunity_id, agent_type, started_at DESC) WHERE (opportunity_id IS NOT NULL)`
 - `CREATE UNIQUE INDEX agent_runs_pkey ON public.agent_runs USING btree (id)`
 - `CREATE INDEX agent_runs_raw_agent_started_at_idx ON public.agent_runs USING btree (raw_id, agent_type, started_at DESC) WHERE (raw_id IS NOT NULL)`
 - `CREATE INDEX agent_runs_source_agent_started_at_idx ON public.agent_runs USING btree (source_id, agent_type, started_at DESC) WHERE (source_id IS NOT NULL)`
 - `CREATE INDEX agent_runs_status_started_at_idx ON public.agent_runs USING btree (status, started_at DESC)`
 - `CREATE UNIQUE INDEX brief_versions_agent_run_id_key ON public.brief_versions USING btree (agent_run_id)`
 - `CREATE UNIQUE INDEX brief_versions_one_current_per_opportunity_idx ON public.brief_versions USING btree (opportunity_id) WHERE (is_current = true)`
 - `CREATE INDEX brief_versions_opportunity_created_at_idx ON public.brief_versions USING btree (opportunity_id, created_at DESC)`
 - `CREATE UNIQUE INDEX brief_versions_pkey ON public.brief_versions USING btree (id)`
 - `CREATE UNIQUE INDEX buyers_pkey ON public.buyers USING btree (id)`
 - `CREATE UNIQUE INDEX buyers_unique_country_name_idx ON public.buyers USING btree (COALESCE(country_code, ''::text), normalized_name)`
 - `CREATE INDEX decision_history_opportunity_user_created_at_idx ON public.decision_history USING btree (opportunity_id, user_id, created_at DESC)`
 - `CREATE UNIQUE INDEX decision_history_pkey ON public.decision_history USING btree (id)`
 - `CREATE INDEX decision_history_user_created_at_idx ON public.decision_history USING btree (user_id, created_at DESC)`
 - `CREATE UNIQUE INDEX geo_countries_country_code_key ON public.geo_countries USING btree (country_code)`
 - `CREATE UNIQUE INDEX geo_countries_pkey ON public.geo_countries USING btree (id)`
 - `CREATE UNIQUE INDEX geo_countries_slug_key ON public.geo_countries USING btree (slug)`
 - `CREATE INDEX geo_countries_zone_sort_idx ON public.geo_countries USING btree (zone_id, sort_order, name)`
 - `CREATE UNIQUE INDEX geo_localities_pkey ON public.geo_localities USING btree (id)`
 - `CREATE UNIQUE INDEX geo_localities_region_normalized_name_unique ON public.geo_localities USING btree (region_id, normalized_name)`
 - `CREATE UNIQUE INDEX geo_localities_region_slug_unique ON public.geo_localities USING btree (region_id, slug)`
 - `CREATE INDEX geo_localities_region_sort_idx ON public.geo_localities USING btree (region_id, sort_order, name)`
 - `CREATE UNIQUE INDEX geo_regions_country_normalized_name_unique ON public.geo_regions USING btree (country_id, normalized_name)`
 - `CREATE UNIQUE INDEX geo_regions_country_slug_unique ON public.geo_regions USING btree (country_id, slug)`
 - `CREATE INDEX geo_regions_country_sort_idx ON public.geo_regions USING btree (country_id, sort_order, name)`
 - `CREATE UNIQUE INDEX geo_regions_pkey ON public.geo_regions USING btree (id)`
 - `CREATE INDEX geo_zones_parent_sort_idx ON public.geo_zones USING btree (parent_zone_id, sort_order, name)`
 - `CREATE UNIQUE INDEX geo_zones_pkey ON public.geo_zones USING btree (id)`
 - `CREATE UNIQUE INDEX geo_zones_slug_key ON public.geo_zones USING btree (slug)`
 - `CREATE INDEX ingestion_jobs_claim_idx ON public.ingestion_jobs USING btree (run_at, id) WHERE (status = 'queued'::job_status)`
 - `CREATE UNIQUE INDEX ingestion_jobs_one_open_per_source ON public.ingestion_jobs USING btree (source_id) WHERE (status = ANY (ARRAY['queued'::job_status, 'running'::job_status]))`
 - `CREATE UNIQUE INDEX ingestion_jobs_pkey ON public.ingestion_jobs USING btree (id)`
 - `CREATE INDEX ingestion_jobs_queue_idx ON public.ingestion_jobs USING btree (status, run_at, id)`
 - `CREATE INDEX ingestion_jobs_source_idx ON public.ingestion_jobs USING btree (source_id)`
 - `CREATE UNIQUE INDEX ingestion_runs_pkey ON public.ingestion_runs USING btree (id)`
 - `CREATE INDEX ingestion_runs_source_key_started_idx ON public.ingestion_runs USING btree (source_key, started_at DESC)`
 - `CREATE INDEX idx_magic_link_tokens_email ON public.magic_link_tokens USING btree (email)`
 - `CREATE INDEX idx_magic_link_tokens_token ON public.magic_link_tokens USING btree (token)`
 - `CREATE UNIQUE INDEX magic_link_tokens_pkey ON public.magic_link_tokens USING btree (id)`
 - `CREATE UNIQUE INDEX magic_link_tokens_token_key ON public.magic_link_tokens USING btree (token)`
 - `CREATE UNIQUE INDEX notification_logs_pkey ON public.notification_logs USING btree (id)`
 - `CREATE UNIQUE INDEX notification_preferences_pkey ON public.notification_preferences USING btree (user_id)`
 - `CREATE INDEX notification_queue_idx ON public.notification_queue USING btree (channel, status, scheduled_at, id)`
 - `CREATE UNIQUE INDEX notification_queue_pkey ON public.notification_queue USING btree (id)`
 - `CREATE INDEX idx_opportunities_country_deadline ON public.opportunities USING btree (country_code, deadline_at)`
 - `CREATE INDEX idx_opportunities_country_updated_desc ON public.opportunities USING btree (country_code, updated_at DESC)`
 - `CREATE INDEX opportunities_country_idx ON public.opportunities USING btree (country_code)`
 - `CREATE UNIQUE INDEX opportunities_fingerprint_key ON public.opportunities USING btree (fingerprint)`
 - `CREATE INDEX opportunities_live_country_published_desc_idx ON public.opportunities USING btree (country_code, published_at DESC) WHERE (is_deleted = false)`
 - `CREATE INDEX opportunities_live_published_at_desc_idx ON public.opportunities USING btree (published_at DESC) WHERE (is_deleted = false)`
 - `CREATE UNIQUE INDEX opportunities_pkey ON public.opportunities USING btree (id)`
 - `CREATE INDEX opportunities_source_url_idx ON public.opportunities USING btree (source_url)`
 - `CREATE INDEX opportunities_status_deadline_idx ON public.opportunities USING btree (status, deadline_at)`
 - `CREATE INDEX opportunities_type_idx ON public.opportunities USING btree (type)`
 - `CREATE INDEX opportunities_raw_content_hash_idx ON public.opportunities_raw USING btree (content_hash)`
 - `CREATE INDEX opportunities_raw_fetched_at_idx ON public.opportunities_raw USING btree (fetched_at DESC)`
 - `CREATE UNIQUE INDEX opportunities_raw_pkey ON public.opportunities_raw USING btree (id)`
 - `CREATE INDEX opportunities_raw_published_at_idx ON public.opportunities_raw USING btree (published_at DESC)`
 - `CREATE UNIQUE INDEX opportunities_raw_source_external_unique ON public.opportunities_raw USING btree (source_key, external_id)`
 - `CREATE INDEX opportunities_raw_url_canonical_idx ON public.opportunities_raw USING btree (url_canonical)`
 - `CREATE INDEX opportunity_ai_content_type_idx ON public.opportunity_ai USING btree (content_type)`
 - `CREATE INDEX opportunity_ai_deadline_at_idx ON public.opportunity_ai USING btree (deadline_at)`
 - `CREATE INDEX opportunity_ai_fingerprint_idx ON public.opportunity_ai USING btree (fingerprint)`
 - `CREATE UNIQUE INDEX opportunity_ai_fingerprint_unique ON public.opportunity_ai USING btree (fingerprint)`
 - `CREATE INDEX opportunity_ai_needs_review_idx ON public.opportunity_ai USING btree (needs_review)`
 - `CREATE UNIQUE INDEX opportunity_ai_pkey ON public.opportunity_ai USING btree (id)`
 - `CREATE INDEX opportunity_ai_raw_id_extracted_updated_idx ON public.opportunity_ai USING btree (raw_id, extracted_at DESC, updated_at DESC)`
 - `CREATE INDEX opportunity_ai_evidence_ai_id_idx ON public.opportunity_ai_evidence USING btree (ai_id)`
 - `CREATE INDEX opportunity_ai_evidence_field_idx ON public.opportunity_ai_evidence USING btree (field)`
 - `CREATE UNIQUE INDEX opportunity_ai_evidence_pkey ON public.opportunity_ai_evidence USING btree (id)`
 - `CREATE INDEX opportunity_briefs_opportunity_id_idx ON public.opportunity_briefs USING btree (opportunity_id)`
 - `CREATE UNIQUE INDEX opportunity_briefs_opportunity_id_key ON public.opportunity_briefs USING btree (opportunity_id)`
 - `CREATE UNIQUE INDEX opportunity_briefs_pkey ON public.opportunity_briefs USING btree (id)`
 - `CREATE INDEX opportunity_decisions_opportunity_id_idx ON public.opportunity_decisions USING btree (opportunity_id)`
 - `CREATE UNIQUE INDEX opportunity_decisions_opportunity_id_user_id_key ON public.opportunity_decisions USING btree (opportunity_id, user_id)`
 - `CREATE UNIQUE INDEX opportunity_decisions_pkey ON public.opportunity_decisions USING btree (id)`
 - `CREATE INDEX opportunity_decisions_user_id_idx ON public.opportunity_decisions USING btree (user_id)`
 - `CREATE INDEX opportunity_documents_opp_idx ON public.opportunity_documents USING btree (opportunity_id)`
 - `CREATE UNIQUE INDEX opportunity_documents_pkey ON public.opportunity_documents USING btree (id)`
 - `CREATE INDEX opportunity_events_opp_idx ON public.opportunity_events USING btree (opportunity_id, occurred_at DESC)`
 - `CREATE UNIQUE INDEX opportunity_events_pkey ON public.opportunity_events USING btree (id)`
 - `CREATE UNIQUE INDEX opportunity_extractions_agent_run_id_key ON public.opportunity_extractions USING btree (agent_run_id)`
 - `CREATE INDEX opportunity_extractions_fingerprint_idx ON public.opportunity_extractions USING btree (fingerprint)`
 - `CREATE INDEX opportunity_extractions_geo_country_current_idx ON public.opportunity_extractions USING btree (geo_country_id) WHERE (is_current = true)`
 - `CREATE INDEX opportunity_extractions_geo_locality_current_idx ON public.opportunity_extractions USING btree (geo_locality_id) WHERE (is_current = true)`
 - `CREATE INDEX opportunity_extractions_geo_region_current_idx ON public.opportunity_extractions USING btree (geo_region_id) WHERE (is_current = true)`
 - `CREATE UNIQUE INDEX opportunity_extractions_one_current_per_opportunity_idx ON public.opportunity_extractions USING btree (opportunity_id) WHERE (is_current = true)`
 - `CREATE INDEX opportunity_extractions_opportunity_created_at_idx ON public.opportunity_extractions USING btree (opportunity_id, created_at DESC)`
 - `CREATE UNIQUE INDEX opportunity_extractions_pkey ON public.opportunity_extractions USING btree (id)`
 - `CREATE INDEX opportunity_extractions_raw_created_at_idx ON public.opportunity_extractions USING btree (raw_id, created_at DESC)`
 - `CREATE UNIQUE INDEX opportunity_preps_agent_run_id_key ON public.opportunity_preps USING btree (agent_run_id)`
 - `CREATE UNIQUE INDEX opportunity_preps_one_current_per_user_opportunity_idx ON public.opportunity_preps USING btree (opportunity_id, user_id) WHERE (is_current = true)`
 - `CREATE INDEX opportunity_preps_opportunity_user_created_at_idx ON public.opportunity_preps USING btree (opportunity_id, user_id, created_at DESC)`
 - `CREATE UNIQUE INDEX opportunity_preps_pkey ON public.opportunity_preps USING btree (id)`
 - `CREATE INDEX opportunity_preps_user_current_created_at_idx ON public.opportunity_preps USING btree (user_id, is_current, created_at DESC)`
 - `CREATE UNIQUE INDEX opportunity_scores_agent_run_id_key ON public.opportunity_scores USING btree (agent_run_id)`
 - `CREATE UNIQUE INDEX opportunity_scores_one_current_per_user_opportunity_idx ON public.opportunity_scores USING btree (opportunity_id, user_id) WHERE (is_current = true)`
 - `CREATE INDEX opportunity_scores_opportunity_user_created_at_idx ON public.opportunity_scores USING btree (opportunity_id, user_id, created_at DESC)`
 - `CREATE UNIQUE INDEX opportunity_scores_pkey ON public.opportunity_scores USING btree (id)`
 - `CREATE INDEX opportunity_scores_user_current_created_at_idx ON public.opportunity_scores USING btree (user_id, is_current, created_at DESC)`
 - `CREATE INDEX opportunity_workflows_opportunity_id_idx ON public.opportunity_workflows USING btree (opportunity_id)`
 - `CREATE UNIQUE INDEX opportunity_workflows_opportunity_id_user_id_key ON public.opportunity_workflows USING btree (opportunity_id, user_id)`
 - `CREATE UNIQUE INDEX opportunity_workflows_pkey ON public.opportunity_workflows USING btree (id)`
 - `CREATE INDEX opportunity_workflows_user_id_idx ON public.opportunity_workflows USING btree (user_id)`
 - `CREATE UNIQUE INDEX rp_ai_runs_pkey ON public.rp_ai_runs USING btree (id)`
 - `CREATE INDEX rp_ai_runs_raw_id_idx ON public.rp_ai_runs USING btree (raw_id)`
 - `CREATE INDEX rp_ai_runs_started_at_idx ON public.rp_ai_runs USING btree (started_at DESC)`
 - `CREATE INDEX sources_active_idx ON public.sources USING btree (is_active, schedule_minutes)`
 - `CREATE UNIQUE INDEX sources_key_key ON public.sources USING btree (key)`
 - `CREATE UNIQUE INDEX sources_pkey ON public.sources USING btree (id)`
 - `CREATE INDEX subscriptions_current_period_end_idx ON public.subscriptions USING btree (current_period_end DESC)`
 - `CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id)`
 - `CREATE INDEX subscriptions_status_idx ON public.subscriptions USING btree (status)`
 - `CREATE UNIQUE INDEX subscriptions_stripe_subscription_id_unique_idx ON public.subscriptions USING btree (stripe_subscription_id) WHERE (stripe_subscription_id IS NOT NULL)`
 - `CREATE UNIQUE INDEX subscriptions_user_id_unique_idx ON public.subscriptions USING btree (user_id)`
 - `CREATE INDEX subscriptions_user_idx ON public.subscriptions USING btree (user_id, is_active)`
 - `CREATE UNIQUE INDEX telegram_profiles_pkey ON public.telegram_profiles USING btree (user_id)`
 - `CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (user_id)`
 - `CREATE UNIQUE INDEX whatsapp_optins_pkey ON public.whatsapp_optins USING btree (user_id)`
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 ##### RLS Policies
 - `anon can insert access_requests` (cmd: INSERT, roles: {anon,authenticated})
 - `service_role can read access_requests` (cmd: SELECT, roles: {service_role})
 - `Authenticated read workspace timeline agent runs` (cmd: SELECT, roles: {authenticated})
 - `Authenticated can read brief versions` (cmd: SELECT, roles: {authenticated})
 - `buyers_public_read` (cmd: SELECT, roles: {anon})
 - `Service role manages decision history` (cmd: ALL, roles: {service_role})
 - `Users read own decision history` (cmd: SELECT, roles: {authenticated})
 - `geo_countries_public_read` (cmd: SELECT, roles: {public})
 - `geo_localities_public_read` (cmd: SELECT, roles: {public})
 - `geo_regions_public_read` (cmd: SELECT, roles: {public})
 - `geo_zones_public_read` (cmd: SELECT, roles: {public})
 - `service_role can manage tokens` (cmd: ALL, roles: {service_role})
 - `owner_rw` (cmd: ALL, roles: {authenticated})
 - `service_role_all` (cmd: ALL, roles: {service_role})
 - `opportunities_public_read` (cmd: SELECT, roles: {anon})
 - `public_read_opportunities` (cmd: SELECT, roles: {public})
 - `Authenticated can read opportunity briefs` (cmd: SELECT, roles: {authenticated})
 - `Service role manages opportunity briefs` (cmd: ALL, roles: {service_role})
 - `Service role reads all decisions` (cmd: SELECT, roles: {service_role})
 - `Users manage own decisions` (cmd: ALL, roles: {authenticated})
 - `opportunity_documents_public_read` (cmd: SELECT, roles: {anon})
 - `public_read_opportunity_documents` (cmd: SELECT, roles: {public})
 - `opportunity_events_public_read` (cmd: SELECT, roles: {anon})
 - `public_read_opportunity_events` (cmd: SELECT, roles: {public})
 - `Authenticated can read opportunity extractions` (cmd: SELECT, roles: {authenticated})
 - `Service role manages preps` (cmd: ALL, roles: {service_role})
 - `Users read own preps` (cmd: SELECT, roles: {authenticated})
 - `Users read own opportunity scores` (cmd: SELECT, roles: {authenticated})
 - `Service role reads all workflows` (cmd: SELECT, roles: {service_role})
 - `Users manage own workflows` (cmd: ALL, roles: {authenticated})
 - `sources_public_read` (cmd: SELECT, roles: {anon})
 - `subscriptions_owner_read` (cmd: SELECT, roles: {public})
 - `subscriptions_owner_update` (cmd: UPDATE, roles: {public})
 - `subscriptions_owner_write` (cmd: INSERT, roles: {public})
 - `telegram_profiles_owner_rw` (cmd: ALL, roles: {public})
 - `owner_rw` (cmd: ALL, roles: {authenticated})
 - `whatsapp_optins_owner_rw` (cmd: ALL, roles: {public})
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 ##### Triggers
 - `trg_jobs_updated_at`: CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON ingestion_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at()
 - `trg_rp_set_updated_at_opportunities_raw`: CREATE TRIGGER trg_rp_set_updated_at_opportunities_raw BEFORE UPDATE ON opportunities_raw FOR EACH ROW EXECUTE FUNCTION rp_set_updated_at()
 - `trg_compute_opportunity_quality`: CREATE TRIGGER trg_compute_opportunity_quality BEFORE INSERT OR UPDATE ON opportunity_ai FOR EACH ROW EXECUTE FUNCTION compute_opportunity_quality()
 - `trg_rp_set_updated_at_opportunity_ai`: CREATE TRIGGER trg_rp_set_updated_at_opportunity_ai BEFORE UPDATE ON opportunity_ai FOR EACH ROW EXECUTE FUNCTION rp_set_updated_at()
 - `trg_set_opportunity_ai_fingerprint_from_raw`: CREATE TRIGGER trg_set_opportunity_ai_fingerprint_from_raw BEFORE INSERT OR UPDATE ON opportunity_ai FOR EACH ROW EXECUTE FUNCTION set_opportunity_ai_fingerprint_from_raw()
 - `trg_opportunity_briefs_updated_at`: CREATE TRIGGER trg_opportunity_briefs_updated_at BEFORE UPDATE ON opportunity_briefs FOR EACH ROW EXECUTE FUNCTION set_updated_at_opportunity_briefs()
 - `trg_opportunity_decisions_updated_at`: CREATE TRIGGER trg_opportunity_decisions_updated_at BEFORE UPDATE ON opportunity_decisions FOR EACH ROW EXECUTE FUNCTION set_updated_at_opportunity_decisions()
 - `trg_opportunity_workflows_updated_at`: CREATE TRIGGER trg_opportunity_workflows_updated_at BEFORE UPDATE ON opportunity_workflows FOR EACH ROW EXECUTE FUNCTION set_updated_at_opportunity_workflows()
 - `trg_sources_updated_at`: CREATE TRIGGER trg_sources_updated_at BEFORE UPDATE ON sources FOR EACH ROW EXECUTE FUNCTION set_updated_at()
 - `trg_subscriptions_updated_at`: CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at()
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 - (none)
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 ## Views
 - `public.opportunities_geo_scope_v1` (view)
 - `public.opportunities_inbox_it_v1` (view)
 - `public.opportunities_search_it_v1` (view)
 - `public.opportunities_search_v1` (view)
 
 ## Functions
 - `public.claim_next_ingestion_job(max_attempts integer)` → `ingestion_jobs` (lang: plpgsql)
 - `public.claim_next_notification(p_channel notify_channel)` → `notification_queue` (lang: plpgsql)
 - `public.compute_opportunity_quality()` → `trigger` (lang: plpgsql)
 - `public.rp_normalize_geo_text(input text)` → `text` (lang: sql)
 - `public.rp_set_updated_at()` → `trigger` (lang: plpgsql)
 - `public.set_opportunity_ai_fingerprint_from_raw()` → `trigger` (lang: plpgsql)
 - `public.set_updated_at()` → `trigger` (lang: plpgsql)
 - `public.set_updated_at_opportunity_briefs()` → `trigger` (lang: plpgsql)
 - `public.set_updated_at_opportunity_decisions()` → `trigger` (lang: plpgsql)
 - `public.set_updated_at_opportunity_workflows()` → `trigger` (lang: plpgsql)
(1061 rows)

