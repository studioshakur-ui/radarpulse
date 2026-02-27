drop extension if exists "pg_net";

create type "public"."event_type" as enum ('NEW', 'UPDATED', 'DEADLINE_CHANGED', 'NEW_DOC', 'AWARDED', 'EXPIRED');

create type "public"."job_status" as enum ('queued', 'running', 'success', 'error');

create type "public"."notify_channel" as enum ('email', 'telegram', 'whatsapp');

create type "public"."notify_status" as enum ('queued', 'sending', 'sent', 'error');

create type "public"."opportunity_status" as enum ('active', 'expired', 'archived');

create type "public"."opportunity_type" as enum ('tender', 'grant');

create type "public"."rp_ai_run_status" as enum ('success', 'error', 'skipped');

create type "public"."rp_buyer_type" as enum ('un', 'ifi', 'gov', 'private', 'foundation', 'ngo', 'unknown');

create type "public"."rp_content_type" as enum ('tender', 'grant', 'news', 'other');

create type "public"."rp_deadline_confidence" as enum ('exact', 'approx', 'unknown');

create type "public"."rp_evidence_confidence" as enum ('high', 'med', 'low');

create type "public"."rp_extraction_quality" as enum ('high', 'med', 'low');

create type "public"."source_kind" as enum ('rss', 'api', 'html', 'pdf');

create sequence "public"."ingestion_jobs_id_seq";

create sequence "public"."notification_logs_id_seq";

create sequence "public"."notification_queue_id_seq";


  create table "public"."buyers" (
    "id" uuid not null default gen_random_uuid(),
    "country_code" text,
    "name" text not null,
    "normalized_name" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."buyers" enable row level security;


  create table "public"."ingestion_jobs" (
    "id" bigint not null default nextval('public.ingestion_jobs_id_seq'::regclass),
    "source_id" uuid not null,
    "status" public.job_status not null default 'queued'::public.job_status,
    "attempts" integer not null default 0,
    "run_at" timestamp with time zone not null default now(),
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "payload" jsonb not null default '{}'::jsonb,
    "error" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."ingestion_jobs" enable row level security;


  create table "public"."notification_logs" (
    "id" bigint not null default nextval('public.notification_logs_id_seq'::regclass),
    "queue_id" bigint,
    "user_id" uuid,
    "channel" public.notify_channel,
    "status" text not null,
    "provider_id" text,
    "detail" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."notification_logs" enable row level security;


  create table "public"."notification_queue" (
    "id" bigint not null default nextval('public.notification_queue_id_seq'::regclass),
    "user_id" uuid not null,
    "channel" public.notify_channel not null,
    "status" public.notify_status not null default 'queued'::public.notify_status,
    "template" text,
    "payload" jsonb not null default '{}'::jsonb,
    "scheduled_at" timestamp with time zone not null default now(),
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "error" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."notification_queue" enable row level security;


  create table "public"."opportunities" (
    "id" uuid not null default gen_random_uuid(),
    "source_id" uuid not null,
    "external_id" text,
    "fingerprint" text not null,
    "type" public.opportunity_type not null,
    "status" public.opportunity_status not null default 'active'::public.opportunity_status,
    "is_public" boolean not null default true,
    "country_code" text,
    "buyer_id" uuid,
    "buyer_name" text,
    "title" text not null,
    "summary" text,
    "published_at" timestamp with time zone,
    "deadline_at" timestamp with time zone,
    "deadline_tz" text,
    "source_url" text not null,
    "language" text,
    "raw" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."opportunities" enable row level security;


  create table "public"."opportunities_raw" (
    "id" uuid not null default gen_random_uuid(),
    "source_id" uuid,
    "source_key" text not null,
    "external_id" text,
    "url" text not null,
    "url_canonical" text not null,
    "title_raw" text not null,
    "snippet_raw" text,
    "content_raw" text,
    "content_hash" text not null,
    "published_at" timestamp with time zone,
    "fetched_at" timestamp with time zone not null default now(),
    "language_hint" text,
    "raw_kind_hint" text,
    "attachments" jsonb default '[]'::jsonb,
    "ingest_run_id" uuid,
    "ingest_errors" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."opportunity_ai" (
    "id" uuid not null default gen_random_uuid(),
    "raw_id" uuid not null,
    "model" text not null,
    "extract_version" text not null,
    "extracted_at" timestamp with time zone not null default now(),
    "content_type" public.rp_content_type not null,
    "buyer_type" public.rp_buyer_type not null,
    "buyer_name" text,
    "sector" text,
    "country_code" text,
    "region" text,
    "language" text,
    "deadline_at" timestamp with time zone,
    "deadline_tz" text,
    "deadline_confidence" public.rp_deadline_confidence not null default 'unknown'::public.rp_deadline_confidence,
    "eligibility" jsonb,
    "required_docs" jsonb,
    "submission" jsonb,
    "budget_value" numeric,
    "budget_currency" text,
    "budget_confidence" public.rp_evidence_confidence,
    "risks" jsonb,
    "summary_10s" text not null,
    "fingerprint" text not null,
    "extraction_quality" public.rp_extraction_quality not null,
    "needs_review" boolean not null default true,
    "missing_fields" jsonb not null default '[]'::jsonb,
    "signals" jsonb not null default '{}'::jsonb,
    "raw_snapshot" jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."opportunity_ai_evidence" (
    "id" uuid not null default gen_random_uuid(),
    "ai_id" uuid not null,
    "field" text not null,
    "evidence_text" text not null,
    "source" text not null default 'content_raw'::text,
    "locator" jsonb,
    "confidence" public.rp_evidence_confidence not null default 'med'::public.rp_evidence_confidence,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."opportunity_documents" (
    "id" uuid not null default gen_random_uuid(),
    "opportunity_id" uuid not null,
    "doc_title" text,
    "doc_url" text not null,
    "doc_hash" text,
    "doc_type" text,
    "storage_path" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."opportunity_documents" enable row level security;


  create table "public"."opportunity_events" (
    "id" uuid not null default gen_random_uuid(),
    "opportunity_id" uuid not null,
    "type" public.event_type not null,
    "occurred_at" timestamp with time zone not null default now(),
    "data" jsonb not null default '{}'::jsonb
      );


alter table "public"."opportunity_events" enable row level security;


  create table "public"."rp_ai_runs" (
    "id" uuid not null default gen_random_uuid(),
    "raw_id" uuid not null,
    "ai_id" uuid,
    "extract_version" text not null,
    "model" text not null,
    "started_at" timestamp with time zone not null default now(),
    "finished_at" timestamp with time zone,
    "duration_ms" integer,
    "status" public.rp_ai_run_status not null default 'success'::public.rp_ai_run_status,
    "error_message" text,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."sources" (
    "id" uuid not null default gen_random_uuid(),
    "key" text not null,
    "name" text not null,
    "kind" public.source_kind not null default 'rss'::public.source_kind,
    "url" text not null,
    "country_code" text,
    "is_active" boolean not null default true,
    "schedule_minutes" integer not null default 60,
    "last_run_at" timestamp with time zone,
    "last_success_at" timestamp with time zone,
    "last_error" text,
    "meta" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."sources" enable row level security;


  create table "public"."subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "is_active" boolean not null default true,
    "channels" jsonb not null default '{}'::jsonb,
    "filters" jsonb not null default '{}'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."subscriptions" enable row level security;


  create table "public"."telegram_profiles" (
    "user_id" uuid not null,
    "chat_id" text not null,
    "is_verified" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."telegram_profiles" enable row level security;


  create table "public"."whatsapp_optins" (
    "user_id" uuid not null,
    "phone_e164" text not null,
    "language" text,
    "consent_at" timestamp with time zone not null default now(),
    "consent_source" text
      );


alter table "public"."whatsapp_optins" enable row level security;

alter sequence "public"."ingestion_jobs_id_seq" owned by "public"."ingestion_jobs"."id";

alter sequence "public"."notification_logs_id_seq" owned by "public"."notification_logs"."id";

alter sequence "public"."notification_queue_id_seq" owned by "public"."notification_queue"."id";

CREATE UNIQUE INDEX buyers_pkey ON public.buyers USING btree (id);

CREATE UNIQUE INDEX buyers_unique_country_name_idx ON public.buyers USING btree (COALESCE(country_code, ''::text), normalized_name);

CREATE INDEX ingestion_jobs_claim_idx ON public.ingestion_jobs USING btree (run_at, id) WHERE (status = 'queued'::public.job_status);

CREATE UNIQUE INDEX ingestion_jobs_one_open_per_source ON public.ingestion_jobs USING btree (source_id) WHERE (status = ANY (ARRAY['queued'::public.job_status, 'running'::public.job_status]));

CREATE UNIQUE INDEX ingestion_jobs_pkey ON public.ingestion_jobs USING btree (id);

CREATE INDEX ingestion_jobs_queue_idx ON public.ingestion_jobs USING btree (status, run_at, id);

CREATE INDEX ingestion_jobs_source_idx ON public.ingestion_jobs USING btree (source_id);

CREATE UNIQUE INDEX notification_logs_pkey ON public.notification_logs USING btree (id);

CREATE INDEX notification_queue_idx ON public.notification_queue USING btree (channel, status, scheduled_at, id);

CREATE UNIQUE INDEX notification_queue_pkey ON public.notification_queue USING btree (id);

CREATE INDEX opportunities_country_idx ON public.opportunities USING btree (country_code);

CREATE UNIQUE INDEX opportunities_fingerprint_key ON public.opportunities USING btree (fingerprint);

CREATE UNIQUE INDEX opportunities_pkey ON public.opportunities USING btree (id);

CREATE INDEX opportunities_raw_content_hash_idx ON public.opportunities_raw USING btree (content_hash);

CREATE INDEX opportunities_raw_fetched_at_idx ON public.opportunities_raw USING btree (fetched_at DESC);

CREATE UNIQUE INDEX opportunities_raw_pkey ON public.opportunities_raw USING btree (id);

CREATE INDEX opportunities_raw_published_at_idx ON public.opportunities_raw USING btree (published_at DESC);

CREATE UNIQUE INDEX opportunities_raw_source_external_unique ON public.opportunities_raw USING btree (source_key, external_id) WHERE (external_id IS NOT NULL);

CREATE INDEX opportunities_raw_url_canonical_idx ON public.opportunities_raw USING btree (url_canonical);

CREATE INDEX opportunities_status_deadline_idx ON public.opportunities USING btree (status, deadline_at);

CREATE INDEX opportunities_type_idx ON public.opportunities USING btree (type);

CREATE INDEX opportunity_ai_content_type_idx ON public.opportunity_ai USING btree (content_type);

CREATE INDEX opportunity_ai_deadline_at_idx ON public.opportunity_ai USING btree (deadline_at);

CREATE INDEX opportunity_ai_evidence_ai_id_idx ON public.opportunity_ai_evidence USING btree (ai_id);

CREATE INDEX opportunity_ai_evidence_field_idx ON public.opportunity_ai_evidence USING btree (field);

CREATE UNIQUE INDEX opportunity_ai_evidence_pkey ON public.opportunity_ai_evidence USING btree (id);

CREATE UNIQUE INDEX opportunity_ai_fingerprint_unique ON public.opportunity_ai USING btree (fingerprint);

CREATE INDEX opportunity_ai_needs_review_idx ON public.opportunity_ai USING btree (needs_review);

CREATE UNIQUE INDEX opportunity_ai_pkey ON public.opportunity_ai USING btree (id);

CREATE INDEX opportunity_documents_opp_idx ON public.opportunity_documents USING btree (opportunity_id);

CREATE UNIQUE INDEX opportunity_documents_pkey ON public.opportunity_documents USING btree (id);

CREATE INDEX opportunity_events_opp_idx ON public.opportunity_events USING btree (opportunity_id, occurred_at DESC);

CREATE UNIQUE INDEX opportunity_events_pkey ON public.opportunity_events USING btree (id);

CREATE UNIQUE INDEX rp_ai_runs_pkey ON public.rp_ai_runs USING btree (id);

CREATE INDEX rp_ai_runs_raw_id_idx ON public.rp_ai_runs USING btree (raw_id);

CREATE INDEX rp_ai_runs_started_at_idx ON public.rp_ai_runs USING btree (started_at DESC);

CREATE INDEX sources_active_idx ON public.sources USING btree (is_active, schedule_minutes);

CREATE UNIQUE INDEX sources_key_key ON public.sources USING btree (key);

CREATE UNIQUE INDEX sources_pkey ON public.sources USING btree (id);

CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id);

CREATE INDEX subscriptions_user_idx ON public.subscriptions USING btree (user_id, is_active);

CREATE UNIQUE INDEX telegram_profiles_pkey ON public.telegram_profiles USING btree (user_id);

CREATE UNIQUE INDEX whatsapp_optins_pkey ON public.whatsapp_optins USING btree (user_id);

alter table "public"."buyers" add constraint "buyers_pkey" PRIMARY KEY using index "buyers_pkey";

alter table "public"."ingestion_jobs" add constraint "ingestion_jobs_pkey" PRIMARY KEY using index "ingestion_jobs_pkey";

alter table "public"."notification_logs" add constraint "notification_logs_pkey" PRIMARY KEY using index "notification_logs_pkey";

alter table "public"."notification_queue" add constraint "notification_queue_pkey" PRIMARY KEY using index "notification_queue_pkey";

alter table "public"."opportunities" add constraint "opportunities_pkey" PRIMARY KEY using index "opportunities_pkey";

alter table "public"."opportunities_raw" add constraint "opportunities_raw_pkey" PRIMARY KEY using index "opportunities_raw_pkey";

alter table "public"."opportunity_ai" add constraint "opportunity_ai_pkey" PRIMARY KEY using index "opportunity_ai_pkey";

alter table "public"."opportunity_ai_evidence" add constraint "opportunity_ai_evidence_pkey" PRIMARY KEY using index "opportunity_ai_evidence_pkey";

alter table "public"."opportunity_documents" add constraint "opportunity_documents_pkey" PRIMARY KEY using index "opportunity_documents_pkey";

alter table "public"."opportunity_events" add constraint "opportunity_events_pkey" PRIMARY KEY using index "opportunity_events_pkey";

alter table "public"."rp_ai_runs" add constraint "rp_ai_runs_pkey" PRIMARY KEY using index "rp_ai_runs_pkey";

alter table "public"."sources" add constraint "sources_pkey" PRIMARY KEY using index "sources_pkey";

alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";

alter table "public"."telegram_profiles" add constraint "telegram_profiles_pkey" PRIMARY KEY using index "telegram_profiles_pkey";

alter table "public"."whatsapp_optins" add constraint "whatsapp_optins_pkey" PRIMARY KEY using index "whatsapp_optins_pkey";

alter table "public"."ingestion_jobs" add constraint "ingestion_jobs_source_id_fkey" FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE CASCADE not valid;

alter table "public"."ingestion_jobs" validate constraint "ingestion_jobs_source_id_fkey";

alter table "public"."notification_logs" add constraint "notification_logs_queue_id_fkey" FOREIGN KEY (queue_id) REFERENCES public.notification_queue(id) ON DELETE SET NULL not valid;

alter table "public"."notification_logs" validate constraint "notification_logs_queue_id_fkey";

alter table "public"."opportunities" add constraint "opportunities_buyer_id_fkey" FOREIGN KEY (buyer_id) REFERENCES public.buyers(id) ON DELETE SET NULL not valid;

alter table "public"."opportunities" validate constraint "opportunities_buyer_id_fkey";

alter table "public"."opportunities" add constraint "opportunities_fingerprint_key" UNIQUE using index "opportunities_fingerprint_key";

alter table "public"."opportunities" add constraint "opportunities_source_id_fkey" FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE RESTRICT not valid;

alter table "public"."opportunities" validate constraint "opportunities_source_id_fkey";

alter table "public"."opportunity_ai" add constraint "opportunity_ai_raw_id_fkey" FOREIGN KEY (raw_id) REFERENCES public.opportunities_raw(id) ON DELETE CASCADE not valid;

alter table "public"."opportunity_ai" validate constraint "opportunity_ai_raw_id_fkey";

alter table "public"."opportunity_ai_evidence" add constraint "opportunity_ai_evidence_ai_id_fkey" FOREIGN KEY (ai_id) REFERENCES public.opportunity_ai(id) ON DELETE CASCADE not valid;

alter table "public"."opportunity_ai_evidence" validate constraint "opportunity_ai_evidence_ai_id_fkey";

alter table "public"."opportunity_documents" add constraint "opportunity_documents_opportunity_id_fkey" FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE not valid;

alter table "public"."opportunity_documents" validate constraint "opportunity_documents_opportunity_id_fkey";

alter table "public"."opportunity_events" add constraint "opportunity_events_opportunity_id_fkey" FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE not valid;

alter table "public"."opportunity_events" validate constraint "opportunity_events_opportunity_id_fkey";

alter table "public"."rp_ai_runs" add constraint "rp_ai_runs_ai_id_fkey" FOREIGN KEY (ai_id) REFERENCES public.opportunity_ai(id) ON DELETE SET NULL not valid;

alter table "public"."rp_ai_runs" validate constraint "rp_ai_runs_ai_id_fkey";

alter table "public"."rp_ai_runs" add constraint "rp_ai_runs_raw_id_fkey" FOREIGN KEY (raw_id) REFERENCES public.opportunities_raw(id) ON DELETE CASCADE not valid;

alter table "public"."rp_ai_runs" validate constraint "rp_ai_runs_raw_id_fkey";

alter table "public"."sources" add constraint "sources_key_key" UNIQUE using index "sources_key_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.claim_next_ingestion_job(max_attempts integer DEFAULT 5)
 RETURNS public.ingestion_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare j public.ingestion_jobs;
begin
  select *
    into j
  from public.ingestion_jobs
  where status = 'queued'
    and run_at <= now()
    and attempts < max_attempts
  order by run_at asc, id asc
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.ingestion_jobs
  set status = 'running',
      attempts = attempts + 1,
      started_at = now(),
      updated_at = now()
  where id = j.id
  returning * into j;

  return j;
end $function$
;

CREATE OR REPLACE FUNCTION public.claim_next_notification(p_channel public.notify_channel)
 RETURNS public.notification_queue
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare n public.notification_queue;
begin
  select *
    into n
  from public.notification_queue
  where channel = p_channel
    and status = 'queued'
    and scheduled_at <= now()
  order by scheduled_at asc, id asc
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.notification_queue
  set status = 'sending',
      started_at = now()
  where id = n.id
  returning * into n;

  return n;
end $function$
;

CREATE OR REPLACE FUNCTION public.rp_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$
;

grant delete on table "public"."buyers" to "anon";

grant insert on table "public"."buyers" to "anon";

grant references on table "public"."buyers" to "anon";

grant select on table "public"."buyers" to "anon";

grant trigger on table "public"."buyers" to "anon";

grant truncate on table "public"."buyers" to "anon";

grant update on table "public"."buyers" to "anon";

grant delete on table "public"."buyers" to "authenticated";

grant insert on table "public"."buyers" to "authenticated";

grant references on table "public"."buyers" to "authenticated";

grant select on table "public"."buyers" to "authenticated";

grant trigger on table "public"."buyers" to "authenticated";

grant truncate on table "public"."buyers" to "authenticated";

grant update on table "public"."buyers" to "authenticated";

grant delete on table "public"."buyers" to "service_role";

grant insert on table "public"."buyers" to "service_role";

grant references on table "public"."buyers" to "service_role";

grant select on table "public"."buyers" to "service_role";

grant trigger on table "public"."buyers" to "service_role";

grant truncate on table "public"."buyers" to "service_role";

grant update on table "public"."buyers" to "service_role";

grant delete on table "public"."ingestion_jobs" to "anon";

grant insert on table "public"."ingestion_jobs" to "anon";

grant references on table "public"."ingestion_jobs" to "anon";

grant select on table "public"."ingestion_jobs" to "anon";

grant trigger on table "public"."ingestion_jobs" to "anon";

grant truncate on table "public"."ingestion_jobs" to "anon";

grant update on table "public"."ingestion_jobs" to "anon";

grant delete on table "public"."ingestion_jobs" to "authenticated";

grant insert on table "public"."ingestion_jobs" to "authenticated";

grant references on table "public"."ingestion_jobs" to "authenticated";

grant select on table "public"."ingestion_jobs" to "authenticated";

grant trigger on table "public"."ingestion_jobs" to "authenticated";

grant truncate on table "public"."ingestion_jobs" to "authenticated";

grant update on table "public"."ingestion_jobs" to "authenticated";

grant delete on table "public"."ingestion_jobs" to "service_role";

grant insert on table "public"."ingestion_jobs" to "service_role";

grant references on table "public"."ingestion_jobs" to "service_role";

grant select on table "public"."ingestion_jobs" to "service_role";

grant trigger on table "public"."ingestion_jobs" to "service_role";

grant truncate on table "public"."ingestion_jobs" to "service_role";

grant update on table "public"."ingestion_jobs" to "service_role";

grant delete on table "public"."notification_logs" to "anon";

grant insert on table "public"."notification_logs" to "anon";

grant references on table "public"."notification_logs" to "anon";

grant select on table "public"."notification_logs" to "anon";

grant trigger on table "public"."notification_logs" to "anon";

grant truncate on table "public"."notification_logs" to "anon";

grant update on table "public"."notification_logs" to "anon";

grant delete on table "public"."notification_logs" to "authenticated";

grant insert on table "public"."notification_logs" to "authenticated";

grant references on table "public"."notification_logs" to "authenticated";

grant select on table "public"."notification_logs" to "authenticated";

grant trigger on table "public"."notification_logs" to "authenticated";

grant truncate on table "public"."notification_logs" to "authenticated";

grant update on table "public"."notification_logs" to "authenticated";

grant delete on table "public"."notification_logs" to "service_role";

grant insert on table "public"."notification_logs" to "service_role";

grant references on table "public"."notification_logs" to "service_role";

grant select on table "public"."notification_logs" to "service_role";

grant trigger on table "public"."notification_logs" to "service_role";

grant truncate on table "public"."notification_logs" to "service_role";

grant update on table "public"."notification_logs" to "service_role";

grant delete on table "public"."notification_queue" to "anon";

grant insert on table "public"."notification_queue" to "anon";

grant references on table "public"."notification_queue" to "anon";

grant select on table "public"."notification_queue" to "anon";

grant trigger on table "public"."notification_queue" to "anon";

grant truncate on table "public"."notification_queue" to "anon";

grant update on table "public"."notification_queue" to "anon";

grant delete on table "public"."notification_queue" to "authenticated";

grant insert on table "public"."notification_queue" to "authenticated";

grant references on table "public"."notification_queue" to "authenticated";

grant select on table "public"."notification_queue" to "authenticated";

grant trigger on table "public"."notification_queue" to "authenticated";

grant truncate on table "public"."notification_queue" to "authenticated";

grant update on table "public"."notification_queue" to "authenticated";

grant delete on table "public"."notification_queue" to "service_role";

grant insert on table "public"."notification_queue" to "service_role";

grant references on table "public"."notification_queue" to "service_role";

grant select on table "public"."notification_queue" to "service_role";

grant trigger on table "public"."notification_queue" to "service_role";

grant truncate on table "public"."notification_queue" to "service_role";

grant update on table "public"."notification_queue" to "service_role";

grant delete on table "public"."opportunities" to "anon";

grant insert on table "public"."opportunities" to "anon";

grant references on table "public"."opportunities" to "anon";

grant select on table "public"."opportunities" to "anon";

grant trigger on table "public"."opportunities" to "anon";

grant truncate on table "public"."opportunities" to "anon";

grant update on table "public"."opportunities" to "anon";

grant delete on table "public"."opportunities" to "authenticated";

grant insert on table "public"."opportunities" to "authenticated";

grant references on table "public"."opportunities" to "authenticated";

grant select on table "public"."opportunities" to "authenticated";

grant trigger on table "public"."opportunities" to "authenticated";

grant truncate on table "public"."opportunities" to "authenticated";

grant update on table "public"."opportunities" to "authenticated";

grant delete on table "public"."opportunities" to "service_role";

grant insert on table "public"."opportunities" to "service_role";

grant references on table "public"."opportunities" to "service_role";

grant select on table "public"."opportunities" to "service_role";

grant trigger on table "public"."opportunities" to "service_role";

grant truncate on table "public"."opportunities" to "service_role";

grant update on table "public"."opportunities" to "service_role";

grant delete on table "public"."opportunities_raw" to "anon";

grant insert on table "public"."opportunities_raw" to "anon";

grant references on table "public"."opportunities_raw" to "anon";

grant select on table "public"."opportunities_raw" to "anon";

grant trigger on table "public"."opportunities_raw" to "anon";

grant truncate on table "public"."opportunities_raw" to "anon";

grant update on table "public"."opportunities_raw" to "anon";

grant delete on table "public"."opportunities_raw" to "authenticated";

grant insert on table "public"."opportunities_raw" to "authenticated";

grant references on table "public"."opportunities_raw" to "authenticated";

grant select on table "public"."opportunities_raw" to "authenticated";

grant trigger on table "public"."opportunities_raw" to "authenticated";

grant truncate on table "public"."opportunities_raw" to "authenticated";

grant update on table "public"."opportunities_raw" to "authenticated";

grant delete on table "public"."opportunities_raw" to "service_role";

grant insert on table "public"."opportunities_raw" to "service_role";

grant references on table "public"."opportunities_raw" to "service_role";

grant select on table "public"."opportunities_raw" to "service_role";

grant trigger on table "public"."opportunities_raw" to "service_role";

grant truncate on table "public"."opportunities_raw" to "service_role";

grant update on table "public"."opportunities_raw" to "service_role";

grant delete on table "public"."opportunity_ai" to "anon";

grant insert on table "public"."opportunity_ai" to "anon";

grant references on table "public"."opportunity_ai" to "anon";

grant select on table "public"."opportunity_ai" to "anon";

grant trigger on table "public"."opportunity_ai" to "anon";

grant truncate on table "public"."opportunity_ai" to "anon";

grant update on table "public"."opportunity_ai" to "anon";

grant delete on table "public"."opportunity_ai" to "authenticated";

grant insert on table "public"."opportunity_ai" to "authenticated";

grant references on table "public"."opportunity_ai" to "authenticated";

grant select on table "public"."opportunity_ai" to "authenticated";

grant trigger on table "public"."opportunity_ai" to "authenticated";

grant truncate on table "public"."opportunity_ai" to "authenticated";

grant update on table "public"."opportunity_ai" to "authenticated";

grant delete on table "public"."opportunity_ai" to "service_role";

grant insert on table "public"."opportunity_ai" to "service_role";

grant references on table "public"."opportunity_ai" to "service_role";

grant select on table "public"."opportunity_ai" to "service_role";

grant trigger on table "public"."opportunity_ai" to "service_role";

grant truncate on table "public"."opportunity_ai" to "service_role";

grant update on table "public"."opportunity_ai" to "service_role";

grant delete on table "public"."opportunity_ai_evidence" to "anon";

grant insert on table "public"."opportunity_ai_evidence" to "anon";

grant references on table "public"."opportunity_ai_evidence" to "anon";

grant select on table "public"."opportunity_ai_evidence" to "anon";

grant trigger on table "public"."opportunity_ai_evidence" to "anon";

grant truncate on table "public"."opportunity_ai_evidence" to "anon";

grant update on table "public"."opportunity_ai_evidence" to "anon";

grant delete on table "public"."opportunity_ai_evidence" to "authenticated";

grant insert on table "public"."opportunity_ai_evidence" to "authenticated";

grant references on table "public"."opportunity_ai_evidence" to "authenticated";

grant select on table "public"."opportunity_ai_evidence" to "authenticated";

grant trigger on table "public"."opportunity_ai_evidence" to "authenticated";

grant truncate on table "public"."opportunity_ai_evidence" to "authenticated";

grant update on table "public"."opportunity_ai_evidence" to "authenticated";

grant delete on table "public"."opportunity_ai_evidence" to "service_role";

grant insert on table "public"."opportunity_ai_evidence" to "service_role";

grant references on table "public"."opportunity_ai_evidence" to "service_role";

grant select on table "public"."opportunity_ai_evidence" to "service_role";

grant trigger on table "public"."opportunity_ai_evidence" to "service_role";

grant truncate on table "public"."opportunity_ai_evidence" to "service_role";

grant update on table "public"."opportunity_ai_evidence" to "service_role";

grant delete on table "public"."opportunity_documents" to "anon";

grant insert on table "public"."opportunity_documents" to "anon";

grant references on table "public"."opportunity_documents" to "anon";

grant select on table "public"."opportunity_documents" to "anon";

grant trigger on table "public"."opportunity_documents" to "anon";

grant truncate on table "public"."opportunity_documents" to "anon";

grant update on table "public"."opportunity_documents" to "anon";

grant delete on table "public"."opportunity_documents" to "authenticated";

grant insert on table "public"."opportunity_documents" to "authenticated";

grant references on table "public"."opportunity_documents" to "authenticated";

grant select on table "public"."opportunity_documents" to "authenticated";

grant trigger on table "public"."opportunity_documents" to "authenticated";

grant truncate on table "public"."opportunity_documents" to "authenticated";

grant update on table "public"."opportunity_documents" to "authenticated";

grant delete on table "public"."opportunity_documents" to "service_role";

grant insert on table "public"."opportunity_documents" to "service_role";

grant references on table "public"."opportunity_documents" to "service_role";

grant select on table "public"."opportunity_documents" to "service_role";

grant trigger on table "public"."opportunity_documents" to "service_role";

grant truncate on table "public"."opportunity_documents" to "service_role";

grant update on table "public"."opportunity_documents" to "service_role";

grant delete on table "public"."opportunity_events" to "anon";

grant insert on table "public"."opportunity_events" to "anon";

grant references on table "public"."opportunity_events" to "anon";

grant select on table "public"."opportunity_events" to "anon";

grant trigger on table "public"."opportunity_events" to "anon";

grant truncate on table "public"."opportunity_events" to "anon";

grant update on table "public"."opportunity_events" to "anon";

grant delete on table "public"."opportunity_events" to "authenticated";

grant insert on table "public"."opportunity_events" to "authenticated";

grant references on table "public"."opportunity_events" to "authenticated";

grant select on table "public"."opportunity_events" to "authenticated";

grant trigger on table "public"."opportunity_events" to "authenticated";

grant truncate on table "public"."opportunity_events" to "authenticated";

grant update on table "public"."opportunity_events" to "authenticated";

grant delete on table "public"."opportunity_events" to "service_role";

grant insert on table "public"."opportunity_events" to "service_role";

grant references on table "public"."opportunity_events" to "service_role";

grant select on table "public"."opportunity_events" to "service_role";

grant trigger on table "public"."opportunity_events" to "service_role";

grant truncate on table "public"."opportunity_events" to "service_role";

grant update on table "public"."opportunity_events" to "service_role";

grant delete on table "public"."rp_ai_runs" to "anon";

grant insert on table "public"."rp_ai_runs" to "anon";

grant references on table "public"."rp_ai_runs" to "anon";

grant select on table "public"."rp_ai_runs" to "anon";

grant trigger on table "public"."rp_ai_runs" to "anon";

grant truncate on table "public"."rp_ai_runs" to "anon";

grant update on table "public"."rp_ai_runs" to "anon";

grant delete on table "public"."rp_ai_runs" to "authenticated";

grant insert on table "public"."rp_ai_runs" to "authenticated";

grant references on table "public"."rp_ai_runs" to "authenticated";

grant select on table "public"."rp_ai_runs" to "authenticated";

grant trigger on table "public"."rp_ai_runs" to "authenticated";

grant truncate on table "public"."rp_ai_runs" to "authenticated";

grant update on table "public"."rp_ai_runs" to "authenticated";

grant delete on table "public"."rp_ai_runs" to "service_role";

grant insert on table "public"."rp_ai_runs" to "service_role";

grant references on table "public"."rp_ai_runs" to "service_role";

grant select on table "public"."rp_ai_runs" to "service_role";

grant trigger on table "public"."rp_ai_runs" to "service_role";

grant truncate on table "public"."rp_ai_runs" to "service_role";

grant update on table "public"."rp_ai_runs" to "service_role";

grant delete on table "public"."sources" to "anon";

grant insert on table "public"."sources" to "anon";

grant references on table "public"."sources" to "anon";

grant select on table "public"."sources" to "anon";

grant trigger on table "public"."sources" to "anon";

grant truncate on table "public"."sources" to "anon";

grant update on table "public"."sources" to "anon";

grant delete on table "public"."sources" to "authenticated";

grant insert on table "public"."sources" to "authenticated";

grant references on table "public"."sources" to "authenticated";

grant select on table "public"."sources" to "authenticated";

grant trigger on table "public"."sources" to "authenticated";

grant truncate on table "public"."sources" to "authenticated";

grant update on table "public"."sources" to "authenticated";

grant delete on table "public"."sources" to "service_role";

grant insert on table "public"."sources" to "service_role";

grant references on table "public"."sources" to "service_role";

grant select on table "public"."sources" to "service_role";

grant trigger on table "public"."sources" to "service_role";

grant truncate on table "public"."sources" to "service_role";

grant update on table "public"."sources" to "service_role";

grant delete on table "public"."subscriptions" to "anon";

grant insert on table "public"."subscriptions" to "anon";

grant references on table "public"."subscriptions" to "anon";

grant select on table "public"."subscriptions" to "anon";

grant trigger on table "public"."subscriptions" to "anon";

grant truncate on table "public"."subscriptions" to "anon";

grant update on table "public"."subscriptions" to "anon";

grant delete on table "public"."subscriptions" to "authenticated";

grant insert on table "public"."subscriptions" to "authenticated";

grant references on table "public"."subscriptions" to "authenticated";

grant select on table "public"."subscriptions" to "authenticated";

grant trigger on table "public"."subscriptions" to "authenticated";

grant truncate on table "public"."subscriptions" to "authenticated";

grant update on table "public"."subscriptions" to "authenticated";

grant delete on table "public"."subscriptions" to "service_role";

grant insert on table "public"."subscriptions" to "service_role";

grant references on table "public"."subscriptions" to "service_role";

grant select on table "public"."subscriptions" to "service_role";

grant trigger on table "public"."subscriptions" to "service_role";

grant truncate on table "public"."subscriptions" to "service_role";

grant update on table "public"."subscriptions" to "service_role";

grant delete on table "public"."telegram_profiles" to "anon";

grant insert on table "public"."telegram_profiles" to "anon";

grant references on table "public"."telegram_profiles" to "anon";

grant select on table "public"."telegram_profiles" to "anon";

grant trigger on table "public"."telegram_profiles" to "anon";

grant truncate on table "public"."telegram_profiles" to "anon";

grant update on table "public"."telegram_profiles" to "anon";

grant delete on table "public"."telegram_profiles" to "authenticated";

grant insert on table "public"."telegram_profiles" to "authenticated";

grant references on table "public"."telegram_profiles" to "authenticated";

grant select on table "public"."telegram_profiles" to "authenticated";

grant trigger on table "public"."telegram_profiles" to "authenticated";

grant truncate on table "public"."telegram_profiles" to "authenticated";

grant update on table "public"."telegram_profiles" to "authenticated";

grant delete on table "public"."telegram_profiles" to "service_role";

grant insert on table "public"."telegram_profiles" to "service_role";

grant references on table "public"."telegram_profiles" to "service_role";

grant select on table "public"."telegram_profiles" to "service_role";

grant trigger on table "public"."telegram_profiles" to "service_role";

grant truncate on table "public"."telegram_profiles" to "service_role";

grant update on table "public"."telegram_profiles" to "service_role";

grant delete on table "public"."whatsapp_optins" to "anon";

grant insert on table "public"."whatsapp_optins" to "anon";

grant references on table "public"."whatsapp_optins" to "anon";

grant select on table "public"."whatsapp_optins" to "anon";

grant trigger on table "public"."whatsapp_optins" to "anon";

grant truncate on table "public"."whatsapp_optins" to "anon";

grant update on table "public"."whatsapp_optins" to "anon";

grant delete on table "public"."whatsapp_optins" to "authenticated";

grant insert on table "public"."whatsapp_optins" to "authenticated";

grant references on table "public"."whatsapp_optins" to "authenticated";

grant select on table "public"."whatsapp_optins" to "authenticated";

grant trigger on table "public"."whatsapp_optins" to "authenticated";

grant truncate on table "public"."whatsapp_optins" to "authenticated";

grant update on table "public"."whatsapp_optins" to "authenticated";

grant delete on table "public"."whatsapp_optins" to "service_role";

grant insert on table "public"."whatsapp_optins" to "service_role";

grant references on table "public"."whatsapp_optins" to "service_role";

grant select on table "public"."whatsapp_optins" to "service_role";

grant trigger on table "public"."whatsapp_optins" to "service_role";

grant truncate on table "public"."whatsapp_optins" to "service_role";

grant update on table "public"."whatsapp_optins" to "service_role";


  create policy "buyers_public_read"
  on "public"."buyers"
  as permissive
  for select
  to anon
using (true);



  create policy "opportunities_public_read"
  on "public"."opportunities"
  as permissive
  for select
  to anon
using ((is_public = true));



  create policy "public_read_opportunities"
  on "public"."opportunities"
  as permissive
  for select
  to public
using ((is_public = true));



  create policy "opportunity_documents_public_read"
  on "public"."opportunity_documents"
  as permissive
  for select
  to anon
using ((EXISTS ( SELECT 1
   FROM public.opportunities o
  WHERE ((o.id = opportunity_documents.opportunity_id) AND (o.is_public = true)))));



  create policy "public_read_opportunity_documents"
  on "public"."opportunity_documents"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.opportunities o
  WHERE ((o.id = opportunity_documents.opportunity_id) AND (o.is_public = true)))));



  create policy "opportunity_events_public_read"
  on "public"."opportunity_events"
  as permissive
  for select
  to anon
using ((EXISTS ( SELECT 1
   FROM public.opportunities o
  WHERE ((o.id = opportunity_events.opportunity_id) AND (o.is_public = true)))));



  create policy "public_read_opportunity_events"
  on "public"."opportunity_events"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.opportunities o
  WHERE ((o.id = opportunity_events.opportunity_id) AND (o.is_public = true)))));



  create policy "sources_public_read"
  on "public"."sources"
  as permissive
  for select
  to anon
using (true);



  create policy "subscriptions_owner_read"
  on "public"."subscriptions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "subscriptions_owner_update"
  on "public"."subscriptions"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "subscriptions_owner_write"
  on "public"."subscriptions"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "telegram_profiles_owner_rw"
  on "public"."telegram_profiles"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "whatsapp_optins_owner_rw"
  on "public"."whatsapp_optins"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON public.ingestion_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_rp_set_updated_at_opportunities_raw BEFORE UPDATE ON public.opportunities_raw FOR EACH ROW EXECUTE FUNCTION public.rp_set_updated_at();

CREATE TRIGGER trg_rp_set_updated_at_opportunity_ai BEFORE UPDATE ON public.opportunity_ai FOR EACH ROW EXECUTE FUNCTION public.rp_set_updated_at();

CREATE TRIGGER trg_sources_updated_at BEFORE UPDATE ON public.sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


