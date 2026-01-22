--
-- PostgreSQL database dump
--

\restrict MXPM0tbnCatYaYFEnhHYp74CvkUvKSViUy27mGRp6Bmeh7rbDIRsRSAfgDCEQx9

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.event_type AS ENUM (
    'NEW',
    'UPDATED',
    'DEADLINE_CHANGED',
    'NEW_DOC',
    'AWARDED',
    'EXPIRED'
);


--
-- Name: job_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.job_status AS ENUM (
    'queued',
    'running',
    'success',
    'error'
);


--
-- Name: notify_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notify_channel AS ENUM (
    'email',
    'telegram',
    'whatsapp'
);


--
-- Name: notify_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notify_status AS ENUM (
    'queued',
    'sending',
    'sent',
    'error'
);


--
-- Name: opportunity_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.opportunity_status AS ENUM (
    'active',
    'expired',
    'archived'
);


--
-- Name: opportunity_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.opportunity_type AS ENUM (
    'tender',
    'grant'
);


--
-- Name: rp_ai_run_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rp_ai_run_status AS ENUM (
    'success',
    'error',
    'skipped'
);


--
-- Name: rp_buyer_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rp_buyer_type AS ENUM (
    'un',
    'ifi',
    'gov',
    'private',
    'foundation',
    'ngo',
    'unknown'
);


--
-- Name: rp_content_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rp_content_type AS ENUM (
    'tender',
    'grant',
    'news',
    'other'
);


--
-- Name: rp_deadline_confidence; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rp_deadline_confidence AS ENUM (
    'exact',
    'approx',
    'unknown'
);


--
-- Name: rp_evidence_confidence; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rp_evidence_confidence AS ENUM (
    'high',
    'med',
    'low'
);


--
-- Name: rp_extraction_quality; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rp_extraction_quality AS ENUM (
    'high',
    'med',
    'low'
);


--
-- Name: source_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.source_kind AS ENUM (
    'rss',
    'api',
    'html',
    'pdf'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ingestion_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingestion_jobs (
    id bigint NOT NULL,
    source_id uuid NOT NULL,
    status public.job_status DEFAULT 'queued'::public.job_status NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    run_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: claim_next_ingestion_job(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_next_ingestion_job(max_attempts integer DEFAULT 5) RETURNS public.ingestion_jobs
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
end $$;


--
-- Name: notification_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_queue (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    channel public.notify_channel NOT NULL,
    status public.notify_status DEFAULT 'queued'::public.notify_status NOT NULL,
    template text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    scheduled_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: claim_next_notification(public.notify_channel); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_next_notification(p_channel public.notify_channel) RETURNS public.notification_queue
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
end $$;


--
-- Name: rp_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rp_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end $$;


--
-- Name: buyers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buyers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_code text,
    name text NOT NULL,
    normalized_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ingestion_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ingestion_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ingestion_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ingestion_jobs_id_seq OWNED BY public.ingestion_jobs.id;


--
-- Name: notification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_logs (
    id bigint NOT NULL,
    queue_id bigint,
    user_id uuid,
    channel public.notify_channel,
    status text NOT NULL,
    provider_id text,
    detail jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_logs_id_seq OWNED BY public.notification_logs.id;


--
-- Name: notification_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_queue_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_queue_id_seq OWNED BY public.notification_queue.id;


--
-- Name: opportunities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid NOT NULL,
    external_id text,
    fingerprint text NOT NULL,
    type public.opportunity_type NOT NULL,
    status public.opportunity_status DEFAULT 'active'::public.opportunity_status NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    country_code text,
    buyer_id uuid,
    buyer_name text,
    title text NOT NULL,
    summary text,
    published_at timestamp with time zone,
    deadline_at timestamp with time zone,
    deadline_tz text,
    source_url text NOT NULL,
    language text,
    raw jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: opportunities_raw; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunities_raw (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid,
    source_key text NOT NULL,
    external_id text,
    url text NOT NULL,
    url_canonical text NOT NULL,
    title_raw text NOT NULL,
    snippet_raw text,
    content_raw text,
    content_hash text NOT NULL,
    published_at timestamp with time zone,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    language_hint text,
    raw_kind_hint text,
    attachments jsonb DEFAULT '[]'::jsonb,
    ingest_run_id uuid,
    ingest_errors jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: opportunity_ai; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunity_ai (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    raw_id uuid NOT NULL,
    model text NOT NULL,
    extract_version text NOT NULL,
    extracted_at timestamp with time zone DEFAULT now() NOT NULL,
    content_type public.rp_content_type NOT NULL,
    buyer_type public.rp_buyer_type NOT NULL,
    buyer_name text,
    sector text,
    country_code text,
    region text,
    language text,
    deadline_at timestamp with time zone,
    deadline_tz text,
    deadline_confidence public.rp_deadline_confidence DEFAULT 'unknown'::public.rp_deadline_confidence NOT NULL,
    eligibility jsonb,
    required_docs jsonb,
    submission jsonb,
    budget_value numeric,
    budget_currency text,
    budget_confidence public.rp_evidence_confidence,
    risks jsonb,
    summary_10s text NOT NULL,
    fingerprint text NOT NULL,
    extraction_quality public.rp_extraction_quality NOT NULL,
    needs_review boolean DEFAULT true NOT NULL,
    missing_fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    signals jsonb DEFAULT '{}'::jsonb NOT NULL,
    raw_snapshot jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: opportunity_ai_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunity_ai_evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ai_id uuid NOT NULL,
    field text NOT NULL,
    evidence_text text NOT NULL,
    source text DEFAULT 'content_raw'::text NOT NULL,
    locator jsonb,
    confidence public.rp_evidence_confidence DEFAULT 'med'::public.rp_evidence_confidence NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: opportunity_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunity_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    opportunity_id uuid NOT NULL,
    doc_title text,
    doc_url text NOT NULL,
    doc_hash text,
    doc_type text,
    storage_path text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: opportunity_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunity_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    opportunity_id uuid NOT NULL,
    type public.event_type NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: rp_ai_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rp_ai_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    raw_id uuid NOT NULL,
    ai_id uuid,
    extract_version text NOT NULL,
    model text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    duration_ms integer,
    status public.rp_ai_run_status DEFAULT 'success'::public.rp_ai_run_status NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    kind public.source_kind DEFAULT 'rss'::public.source_kind NOT NULL,
    url text NOT NULL,
    country_code text,
    is_active boolean DEFAULT true NOT NULL,
    schedule_minutes integer DEFAULT 60 NOT NULL,
    last_run_at timestamp with time zone,
    last_success_at timestamp with time zone,
    last_error text,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    channels jsonb DEFAULT '{}'::jsonb NOT NULL,
    filters jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: telegram_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_profiles (
    user_id uuid NOT NULL,
    chat_id text NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: whatsapp_optins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_optins (
    user_id uuid NOT NULL,
    phone_e164 text NOT NULL,
    language text,
    consent_at timestamp with time zone DEFAULT now() NOT NULL,
    consent_source text
);


--
-- Name: ingestion_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingestion_jobs ALTER COLUMN id SET DEFAULT nextval('public.ingestion_jobs_id_seq'::regclass);


--
-- Name: notification_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs ALTER COLUMN id SET DEFAULT nextval('public.notification_logs_id_seq'::regclass);


--
-- Name: notification_queue id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_queue ALTER COLUMN id SET DEFAULT nextval('public.notification_queue_id_seq'::regclass);


--
-- Name: buyers buyers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyers
    ADD CONSTRAINT buyers_pkey PRIMARY KEY (id);


--
-- Name: ingestion_jobs ingestion_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingestion_jobs
    ADD CONSTRAINT ingestion_jobs_pkey PRIMARY KEY (id);


--
-- Name: notification_logs notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);


--
-- Name: notification_queue notification_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_queue
    ADD CONSTRAINT notification_queue_pkey PRIMARY KEY (id);


--
-- Name: opportunities opportunities_fingerprint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_fingerprint_key UNIQUE (fingerprint);


--
-- Name: opportunities opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_pkey PRIMARY KEY (id);


--
-- Name: opportunities_raw opportunities_raw_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities_raw
    ADD CONSTRAINT opportunities_raw_pkey PRIMARY KEY (id);


--
-- Name: opportunity_ai_evidence opportunity_ai_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_ai_evidence
    ADD CONSTRAINT opportunity_ai_evidence_pkey PRIMARY KEY (id);


--
-- Name: opportunity_ai opportunity_ai_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_ai
    ADD CONSTRAINT opportunity_ai_pkey PRIMARY KEY (id);


--
-- Name: opportunity_documents opportunity_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_documents
    ADD CONSTRAINT opportunity_documents_pkey PRIMARY KEY (id);


--
-- Name: opportunity_events opportunity_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_events
    ADD CONSTRAINT opportunity_events_pkey PRIMARY KEY (id);


--
-- Name: rp_ai_runs rp_ai_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rp_ai_runs
    ADD CONSTRAINT rp_ai_runs_pkey PRIMARY KEY (id);


--
-- Name: sources sources_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_key_key UNIQUE (key);


--
-- Name: sources sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: telegram_profiles telegram_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_profiles
    ADD CONSTRAINT telegram_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: whatsapp_optins whatsapp_optins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_optins
    ADD CONSTRAINT whatsapp_optins_pkey PRIMARY KEY (user_id);


--
-- Name: buyers_unique_country_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX buyers_unique_country_name_idx ON public.buyers USING btree (COALESCE(country_code, ''::text), normalized_name);


--
-- Name: ingestion_jobs_claim_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ingestion_jobs_claim_idx ON public.ingestion_jobs USING btree (run_at, id) WHERE (status = 'queued'::public.job_status);


--
-- Name: ingestion_jobs_one_open_per_source; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ingestion_jobs_one_open_per_source ON public.ingestion_jobs USING btree (source_id) WHERE (status = ANY (ARRAY['queued'::public.job_status, 'running'::public.job_status]));


--
-- Name: ingestion_jobs_queue_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ingestion_jobs_queue_idx ON public.ingestion_jobs USING btree (status, run_at, id);


--
-- Name: ingestion_jobs_source_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ingestion_jobs_source_idx ON public.ingestion_jobs USING btree (source_id);


--
-- Name: notification_queue_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_queue_idx ON public.notification_queue USING btree (channel, status, scheduled_at, id);


--
-- Name: opportunities_country_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_country_idx ON public.opportunities USING btree (country_code);


--
-- Name: opportunities_raw_content_hash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_raw_content_hash_idx ON public.opportunities_raw USING btree (content_hash);


--
-- Name: opportunities_raw_fetched_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_raw_fetched_at_idx ON public.opportunities_raw USING btree (fetched_at DESC);


--
-- Name: opportunities_raw_published_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_raw_published_at_idx ON public.opportunities_raw USING btree (published_at DESC);


--
-- Name: opportunities_raw_source_external_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX opportunities_raw_source_external_unique ON public.opportunities_raw USING btree (source_key, external_id) WHERE (external_id IS NOT NULL);


--
-- Name: opportunities_raw_url_canonical_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_raw_url_canonical_idx ON public.opportunities_raw USING btree (url_canonical);


--
-- Name: opportunities_status_deadline_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_status_deadline_idx ON public.opportunities USING btree (status, deadline_at);


--
-- Name: opportunities_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_type_idx ON public.opportunities USING btree (type);


--
-- Name: opportunity_ai_content_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_ai_content_type_idx ON public.opportunity_ai USING btree (content_type);


--
-- Name: opportunity_ai_deadline_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_ai_deadline_at_idx ON public.opportunity_ai USING btree (deadline_at);


--
-- Name: opportunity_ai_evidence_ai_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_ai_evidence_ai_id_idx ON public.opportunity_ai_evidence USING btree (ai_id);


--
-- Name: opportunity_ai_evidence_field_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_ai_evidence_field_idx ON public.opportunity_ai_evidence USING btree (field);


--
-- Name: opportunity_ai_fingerprint_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX opportunity_ai_fingerprint_unique ON public.opportunity_ai USING btree (fingerprint);


--
-- Name: opportunity_ai_needs_review_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_ai_needs_review_idx ON public.opportunity_ai USING btree (needs_review);


--
-- Name: opportunity_documents_opp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_documents_opp_idx ON public.opportunity_documents USING btree (opportunity_id);


--
-- Name: opportunity_events_opp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_events_opp_idx ON public.opportunity_events USING btree (opportunity_id, occurred_at DESC);


--
-- Name: rp_ai_runs_raw_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rp_ai_runs_raw_id_idx ON public.rp_ai_runs USING btree (raw_id);


--
-- Name: rp_ai_runs_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rp_ai_runs_started_at_idx ON public.rp_ai_runs USING btree (started_at DESC);


--
-- Name: sources_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sources_active_idx ON public.sources USING btree (is_active, schedule_minutes);


--
-- Name: subscriptions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_user_idx ON public.subscriptions USING btree (user_id, is_active);


--
-- Name: ingestion_jobs trg_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON public.ingestion_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: opportunities_raw trg_rp_set_updated_at_opportunities_raw; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_rp_set_updated_at_opportunities_raw BEFORE UPDATE ON public.opportunities_raw FOR EACH ROW EXECUTE FUNCTION public.rp_set_updated_at();


--
-- Name: opportunity_ai trg_rp_set_updated_at_opportunity_ai; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_rp_set_updated_at_opportunity_ai BEFORE UPDATE ON public.opportunity_ai FOR EACH ROW EXECUTE FUNCTION public.rp_set_updated_at();


--
-- Name: sources trg_sources_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sources_updated_at BEFORE UPDATE ON public.sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: subscriptions trg_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ingestion_jobs ingestion_jobs_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingestion_jobs
    ADD CONSTRAINT ingestion_jobs_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE CASCADE;


--
-- Name: notification_logs notification_logs_queue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES public.notification_queue(id) ON DELETE SET NULL;


--
-- Name: opportunities opportunities_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.buyers(id) ON DELETE SET NULL;


--
-- Name: opportunities opportunities_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE RESTRICT;


--
-- Name: opportunity_ai_evidence opportunity_ai_evidence_ai_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_ai_evidence
    ADD CONSTRAINT opportunity_ai_evidence_ai_id_fkey FOREIGN KEY (ai_id) REFERENCES public.opportunity_ai(id) ON DELETE CASCADE;


--
-- Name: opportunity_ai opportunity_ai_raw_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_ai
    ADD CONSTRAINT opportunity_ai_raw_id_fkey FOREIGN KEY (raw_id) REFERENCES public.opportunities_raw(id) ON DELETE CASCADE;


--
-- Name: opportunity_documents opportunity_documents_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_documents
    ADD CONSTRAINT opportunity_documents_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE;


--
-- Name: opportunity_events opportunity_events_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_events
    ADD CONSTRAINT opportunity_events_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE;


--
-- Name: rp_ai_runs rp_ai_runs_ai_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rp_ai_runs
    ADD CONSTRAINT rp_ai_runs_ai_id_fkey FOREIGN KEY (ai_id) REFERENCES public.opportunity_ai(id) ON DELETE SET NULL;


--
-- Name: rp_ai_runs rp_ai_runs_raw_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rp_ai_runs
    ADD CONSTRAINT rp_ai_runs_raw_id_fkey FOREIGN KEY (raw_id) REFERENCES public.opportunities_raw(id) ON DELETE CASCADE;


--
-- Name: buyers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

--
-- Name: buyers buyers_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY buyers_public_read ON public.buyers FOR SELECT TO anon USING (true);


--
-- Name: ingestion_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: opportunities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

--
-- Name: opportunities opportunities_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY opportunities_public_read ON public.opportunities FOR SELECT TO anon USING ((is_public = true));


--
-- Name: opportunity_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.opportunity_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: opportunity_documents opportunity_documents_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY opportunity_documents_public_read ON public.opportunity_documents FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM public.opportunities o
  WHERE ((o.id = opportunity_documents.opportunity_id) AND (o.is_public = true)))));


--
-- Name: opportunity_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.opportunity_events ENABLE ROW LEVEL SECURITY;

--
-- Name: opportunity_events opportunity_events_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY opportunity_events_public_read ON public.opportunity_events FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM public.opportunities o
  WHERE ((o.id = opportunity_events.opportunity_id) AND (o.is_public = true)))));


--
-- Name: opportunities public_read_opportunities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_opportunities ON public.opportunities FOR SELECT USING ((is_public = true));


--
-- Name: opportunity_documents public_read_opportunity_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_opportunity_documents ON public.opportunity_documents FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.opportunities o
  WHERE ((o.id = opportunity_documents.opportunity_id) AND (o.is_public = true)))));


--
-- Name: opportunity_events public_read_opportunity_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_opportunity_events ON public.opportunity_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.opportunities o
  WHERE ((o.id = opportunity_events.opportunity_id) AND (o.is_public = true)))));


--
-- Name: sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

--
-- Name: sources sources_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sources_public_read ON public.sources FOR SELECT TO anon USING (true);


--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions subscriptions_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subscriptions_owner_read ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: subscriptions subscriptions_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subscriptions_owner_update ON public.subscriptions FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: subscriptions subscriptions_owner_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subscriptions_owner_write ON public.subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: telegram_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_profiles telegram_profiles_owner_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY telegram_profiles_owner_rw ON public.telegram_profiles USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: whatsapp_optins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_optins ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_optins whatsapp_optins_owner_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY whatsapp_optins_owner_rw ON public.whatsapp_optins USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- PostgreSQL database dump complete
--

\unrestrict MXPM0tbnCatYaYFEnhHYp74CvkUvKSViUy27mGRp6Bmeh7rbDIRsRSAfgDCEQx9

