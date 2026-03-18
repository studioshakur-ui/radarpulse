--
-- PostgreSQL database dump
--

\restrict aQD3yU7Zc0btDywTxmLlQ50Pw0ekUbeihu3db7WJvPhHmHbdT1xr6ZyHCIZm4WV

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

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
-- Name: agent_run_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.agent_run_status AS ENUM (
    'queued',
    'running',
    'success',
    'error',
    'skipped'
);


--
-- Name: agent_run_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.agent_run_type AS ENUM (
    'source',
    'extract',
    'score',
    'brief',
    'prep',
    'deadline'
);


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
-- Name: compute_opportunity_quality(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compute_opportunity_quality() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.completeness_score :=
    (
      (new.region is not null)::int +
      (new.budget_value is not null)::int +
      (new.deadline_at is not null)::int +
      (new.buyer_name is not null)::int
    ) / 4.0;

  new.quality_score :=
    new.completeness_score *
    case
      when new.extraction_quality = 'high' then 1.0
      when new.extraction_quality = 'med' then 0.7
      else 0.4
    end;

  return new;
end;
$$;


--
-- Name: rp_normalize_geo_text(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rp_normalize_geo_text(input text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  select nullif(
    trim(
      regexp_replace(
        replace(
          replace(
            replace(
              replace(lower(coalesce(input, '')), '’', ' '),
              '''',
              ' '
            ),
            '-',
            ' '
          ),
          '_',
          ' '
        ),
        '\s+',
        ' ',
        'g'
      )
    ),
    ''
  );
$$;


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
-- Name: set_opportunity_ai_fingerprint_from_raw(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_opportunity_ai_fingerprint_from_raw() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  v_source_id uuid;
  v_external_id text;
  v_url_canonical text;
  v_url text;
  v_fp text;
begin
  if new.fingerprint is not null and new.fingerprint <> '' then
    return new;
  end if;

  if new.raw_id is null then
    return new;
  end if;

  select r.source_id, r.external_id, r.url_canonical, r.url
    into v_source_id, v_external_id, v_url_canonical, v_url
  from public.opportunities_raw r
  where r.id = new.raw_id;

  if v_source_id is null then
    return new;
  end if;

  if v_external_id is not null and v_external_id <> '' then
    select o.fingerprint
      into v_fp
    from public.opportunities o
    where o.source_id = v_source_id
      and o.external_id = v_external_id
    limit 1;
  else
    select o.fingerprint
      into v_fp
    from public.opportunities o
    where o.source_id = v_source_id
      and (o.source_url = v_url_canonical or o.source_url = v_url)
    limit 1;
  end if;

  if v_fp is not null and v_fp <> '' then
    new.fingerprint := v_fp;
  end if;

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
-- Name: set_updated_at_opportunity_briefs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at_opportunity_briefs() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: set_updated_at_opportunity_decisions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at_opportunity_decisions() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: set_updated_at_opportunity_workflows(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at_opportunity_workflows() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: access_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    organization text,
    use_case text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_type public.agent_run_type NOT NULL,
    status public.agent_run_status NOT NULL,
    trigger_type text NOT NULL,
    source_id uuid,
    ingestion_run_id uuid,
    raw_id uuid,
    opportunity_id uuid,
    user_id uuid,
    subject_key text,
    model text,
    prompt_version text,
    agent_version text NOT NULL,
    started_at timestamp with time zone NOT NULL,
    finished_at timestamp with time zone,
    duration_ms integer,
    error_message text,
    input_ref jsonb,
    output_ref jsonb,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: brief_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brief_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    opportunity_id uuid NOT NULL,
    agent_run_id uuid NOT NULL,
    source_extraction_id uuid,
    source_score_id uuid,
    is_backfilled boolean DEFAULT false NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    model text NOT NULL,
    prompt_version text NOT NULL,
    brief_version text NOT NULL,
    executive_summary text NOT NULL,
    fit_assessment text NOT NULL,
    risk_flags text[] DEFAULT '{}'::text[] NOT NULL,
    required_documents text[] DEFAULT '{}'::text[] NOT NULL,
    next_action text NOT NULL,
    input_snapshot jsonb,
    generation_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    output_locale text DEFAULT 'en'::text,
    CONSTRAINT brief_versions_output_locale_check CHECK ((output_locale = ANY (ARRAY['en'::text, 'fr'::text, 'it'::text])))
);


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
-- Name: decision_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.decision_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    opportunity_id uuid NOT NULL,
    user_id uuid NOT NULL,
    opportunity_decision_id uuid,
    agent_run_id uuid,
    event_type text NOT NULL,
    decision_value text,
    previous_decision_value text,
    note text,
    source text NOT NULL,
    is_backfilled boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT decision_history_decision_value_check CHECK (((decision_value IS NULL) OR (decision_value = ANY (ARRAY['GO'::text, 'HOLD'::text, 'NO_GO'::text])))),
    CONSTRAINT decision_history_event_type_check CHECK ((event_type = ANY (ARRAY['set'::text, 'change'::text, 'clear'::text, 'backfill'::text]))),
    CONSTRAINT decision_history_previous_decision_value_check CHECK (((previous_decision_value IS NULL) OR (previous_decision_value = ANY (ARRAY['GO'::text, 'HOLD'::text, 'NO_GO'::text])))),
    CONSTRAINT decision_history_source_check CHECK ((source = ANY (ARRAY['web'::text, 'backfill'::text, 'system'::text])))
);


--
-- Name: geo_countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_countries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zone_id uuid NOT NULL,
    country_code text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    territory_kind text DEFAULT 'country'::text NOT NULL,
    flag_emoji text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT geo_countries_country_code_upper CHECK ((country_code = upper(country_code))),
    CONSTRAINT geo_countries_territory_kind_check CHECK ((territory_kind = ANY (ARRAY['country'::text, 'territory'::text, 'union'::text])))
);


--
-- Name: geo_localities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_localities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    region_id uuid NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    normalized_name text NOT NULL,
    code text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: geo_regions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_regions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_id uuid NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    normalized_name text NOT NULL,
    code text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: geo_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_zone_id uuid,
    slug text NOT NULL,
    name text NOT NULL,
    kind text NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT geo_zones_kind_check CHECK ((kind = ANY (ARRAY['continent'::text, 'subcontinent'::text, 'market_zone'::text])))
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
-- Name: ingestion_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingestion_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid NOT NULL,
    source_key text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    status text DEFAULT 'RUNNING'::text NOT NULL,
    fetched_count integer DEFAULT 0 NOT NULL,
    raw_upserted_count integer DEFAULT 0 NOT NULL,
    opp_upserted_count integer DEFAULT 0 NOT NULL,
    error text,
    cursor text,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: magic_link_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.magic_link_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    token text NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone
);


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
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    user_id uuid NOT NULL,
    email_digest_enabled boolean DEFAULT true NOT NULL,
    email_digest_frequency text DEFAULT 'daily'::text NOT NULL,
    last_digest_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


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
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
);


--
-- Name: opportunity_extractions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunity_extractions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    opportunity_id uuid NOT NULL,
    raw_id uuid NOT NULL,
    agent_run_id uuid NOT NULL,
    source_id uuid NOT NULL,
    fingerprint text NOT NULL,
    is_backfilled boolean DEFAULT false NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    extract_version text NOT NULL,
    model text NOT NULL,
    content_type public.rp_content_type NOT NULL,
    buyer_type public.rp_buyer_type NOT NULL,
    buyer_name text,
    sector text,
    country_code text,
    region text,
    language text,
    deadline_at timestamp with time zone,
    deadline_tz text,
    deadline_confidence public.rp_deadline_confidence NOT NULL,
    eligibility jsonb,
    required_docs jsonb,
    submission jsonb,
    budget_value numeric,
    budget_currency text,
    budget_confidence public.rp_evidence_confidence,
    risks jsonb,
    summary_10s text NOT NULL,
    extraction_quality public.rp_extraction_quality NOT NULL,
    needs_review boolean NOT NULL,
    missing_fields jsonb NOT NULL,
    signals jsonb NOT NULL,
    raw_snapshot jsonb,
    quality_score numeric,
    completeness_score numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    geo_country_id uuid,
    geo_region_id uuid,
    geo_locality_id uuid,
    geo_resolution_confidence text,
    locality text,
    CONSTRAINT opportunity_extractions_geo_resolution_confidence_check CHECK (((geo_resolution_confidence IS NULL) OR (geo_resolution_confidence = ANY (ARRAY['exact'::text, 'country_only'::text, 'region_text_match'::text, 'locality_text_match'::text, 'unresolved'::text]))))
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    origin_type text DEFAULT 'EU'::text,
    CONSTRAINT sources_origin_type_check CHECK ((origin_type = ANY (ARRAY['IT_NATIVE'::text, 'EU'::text, 'OTHER'::text])))
);


--
-- Name: opportunities_geo_scope_v1; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.opportunities_geo_scope_v1 AS
 SELECT o.id,
    o.title,
    COALESCE(b.name, NULLIF(o.buyer_name, ''::text)) AS buyer_name,
    COALESCE(gr_linked.name, oe.region) AS region,
    COALESCE(gl_linked.name, oe.locality) AS locality,
    oe.budget_value AS budget_amount,
    oe.budget_currency,
    o.deadline_at,
    o.published_at,
    COALESCE(s.key, (o.raw ->> 'source_key'::text), (o.source_id)::text) AS source_key,
    o.status,
    o.is_public,
    COALESCE(gc_linked.country_code, gc_fallback.country_code, oe.country_code, o.country_code) AS country_code,
    oe.quality_score,
    oe.completeness_score,
    s.origin_type,
    gz.slug AS geo_zone_slug,
    gz.name AS geo_zone_name,
    COALESCE(gc_linked.slug, gc_fallback.slug) AS geo_country_slug,
    COALESCE(gc_linked.country_code, gc_fallback.country_code) AS geo_country_code,
    COALESCE(gc_linked.name, gc_fallback.name) AS geo_country_name,
    gr_linked.slug AS geo_region_slug,
    gr_linked.name AS geo_region_name,
    gl_linked.slug AS geo_locality_slug,
    gl_linked.name AS geo_locality_name,
    oe.geo_resolution_confidence
   FROM ((((((((public.opportunities o
     LEFT JOIN public.buyers b ON ((b.id = o.buyer_id)))
     LEFT JOIN public.sources s ON ((s.id = o.source_id)))
     LEFT JOIN public.opportunity_extractions oe ON (((oe.opportunity_id = o.id) AND (oe.is_current = true))))
     LEFT JOIN public.geo_countries gc_linked ON ((gc_linked.id = oe.geo_country_id)))
     LEFT JOIN public.geo_countries gc_fallback ON ((gc_fallback.country_code = upper(COALESCE(oe.country_code, o.country_code, ''::text)))))
     LEFT JOIN public.geo_regions gr_linked ON ((gr_linked.id = oe.geo_region_id)))
     LEFT JOIN public.geo_localities gl_linked ON ((gl_linked.id = oe.geo_locality_id)))
     LEFT JOIN public.geo_zones gz ON ((gz.id = COALESCE(gc_linked.zone_id, gc_fallback.zone_id))))
  WHERE (COALESCE(((to_jsonb(o.*) ->> 'is_deleted'::text))::boolean, false) = false);


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
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    quality_score numeric DEFAULT 0,
    completeness_score numeric DEFAULT 0,
    locality text
);


--
-- Name: opportunities_inbox_it_v1; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.opportunities_inbox_it_v1 AS
 SELECT o.id,
    o.title,
    COALESCE(b.name, NULLIF(o.buyer_name, ''::text)) AS buyer_name,
    ai.region,
    ai.budget_value AS budget_amount,
    ai.budget_currency,
    o.deadline_at,
    o.published_at,
    COALESCE(s.key, (o.raw ->> 'source_key'::text), (o.source_id)::text) AS source_key,
    o.status,
    o.is_public,
    'IT'::text AS country_code,
    ai.quality_score,
    ai.completeness_score,
    s.origin_type
   FROM (((public.opportunities o
     JOIN public.sources s ON ((s.id = o.source_id)))
     LEFT JOIN public.buyers b ON ((b.id = o.buyer_id)))
     LEFT JOIN public.opportunity_ai ai ON ((ai.fingerprint = o.fingerprint)))
  WHERE ((COALESCE(((to_jsonb(o.*) ->> 'is_deleted'::text))::boolean, false) = false) AND (o.is_public = true) AND ((s.key = 'rss_ted_comp_it'::text) OR (s.country_code = 'IT'::text) OR (s.key ~~ 'it_%'::text)));


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
-- Name: opportunities_search_it_v1; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.opportunities_search_it_v1 AS
 SELECT o.id,
    o.title,
    COALESCE(b.name, NULLIF(o.buyer_name, ''::text)) AS buyer_name,
    ai.region,
    ai.budget_value AS budget_amount,
    ai.budget_currency,
    o.deadline_at,
    o.published_at,
    COALESCE(s.key, (o.raw ->> 'source_key'::text), (o.source_id)::text) AS source_key,
    o.status,
    o.is_public,
    'IT'::text AS country_code
   FROM (((public.opportunities o
     JOIN public.sources s ON ((s.id = o.source_id)))
     LEFT JOIN public.buyers b ON ((b.id = o.buyer_id)))
     LEFT JOIN public.opportunity_ai ai ON ((ai.fingerprint = o.fingerprint)))
  WHERE ((s.country_code = 'IT'::text) AND (COALESCE(s.is_active, true) = true) AND (COALESCE(((to_jsonb(o.*) ->> 'is_deleted'::text))::boolean, false) = false));


--
-- Name: opportunities_search_v1; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.opportunities_search_v1 AS
 SELECT o.id,
    o.title,
    COALESCE(b.name, NULLIF(o.buyer_name, ''::text)) AS buyer_name,
    ai.region,
    ai.budget_value AS budget_amount,
    ai.budget_currency,
    o.deadline_at,
    o.published_at,
    COALESCE(s.key, (o.raw ->> 'source_key'::text), (o.source_id)::text) AS source_key,
    o.status,
    o.is_public,
    o.country_code,
    ai.quality_score,
    ai.completeness_score,
    s.origin_type
   FROM ((((public.opportunities o
     LEFT JOIN public.buyers b ON ((b.id = o.buyer_id)))
     LEFT JOIN public.sources s ON ((s.id = o.source_id)))
     LEFT JOIN public.opportunities_raw r ON ((r.url_canonical = o.source_url)))
     LEFT JOIN LATERAL ( SELECT a.region,
            a.budget_value,
            a.budget_currency,
            a.quality_score,
            a.completeness_score
           FROM public.opportunity_ai a
          WHERE (a.raw_id = r.id)
          ORDER BY a.extracted_at DESC NULLS LAST, a.updated_at DESC
         LIMIT 1) ai ON (true))
  WHERE (o.is_deleted = false);


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
-- Name: opportunity_briefs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunity_briefs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    opportunity_id uuid NOT NULL,
    executive_summary text DEFAULT ''::text NOT NULL,
    fit_assessment text DEFAULT ''::text NOT NULL,
    risk_flags text[] DEFAULT '{}'::text[] NOT NULL,
    required_documents text[] DEFAULT '{}'::text[] NOT NULL,
    next_action text DEFAULT ''::text NOT NULL,
    model text DEFAULT ''::text NOT NULL,
    prompt_version text DEFAULT 'v1'::text NOT NULL,
    generation_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    output_locale text DEFAULT 'en'::text,
    CONSTRAINT opportunity_briefs_output_locale_check CHECK ((output_locale = ANY (ARRAY['en'::text, 'fr'::text, 'it'::text])))
);


--
-- Name: opportunity_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunity_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    opportunity_id uuid NOT NULL,
    user_id uuid NOT NULL,
    decision text NOT NULL,
    note text,
    decided_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT opportunity_decisions_decision_check CHECK ((decision = ANY (ARRAY['GO'::text, 'HOLD'::text, 'NO_GO'::text])))
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
-- Name: opportunity_preps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunity_preps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    opportunity_id uuid NOT NULL,
    agent_run_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_backfilled boolean DEFAULT false NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    prep_version text NOT NULL,
    model text,
    generation_ms integer,
    checklist jsonb DEFAULT '[]'::jsonb NOT NULL,
    missing_docs text[] DEFAULT '{}'::text[] NOT NULL,
    effort_days numeric,
    blockers text[] DEFAULT '{}'::text[] NOT NULL,
    response_plan text NOT NULL,
    input_snapshot jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    output_locale text DEFAULT 'en'::text,
    CONSTRAINT opportunity_preps_output_locale_check CHECK ((output_locale = ANY (ARRAY['en'::text, 'fr'::text, 'it'::text])))
);


--
-- Name: opportunity_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunity_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    opportunity_id uuid NOT NULL,
    agent_run_id uuid NOT NULL,
    user_id uuid NOT NULL,
    subject_type text DEFAULT 'user'::text NOT NULL,
    is_backfilled boolean DEFAULT false NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    score_version text NOT NULL,
    model text,
    score_value numeric NOT NULL,
    score_band text,
    rationale_summary text NOT NULL,
    rationale_json jsonb NOT NULL,
    input_profile_snapshot jsonb,
    input_extraction_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    recommendation text,
    output_locale text DEFAULT 'en'::text,
    CONSTRAINT opportunity_scores_output_locale_check CHECK ((output_locale = ANY (ARRAY['en'::text, 'fr'::text, 'it'::text]))),
    CONSTRAINT opportunity_scores_recommendation_check CHECK (((recommendation IS NULL) OR (recommendation = ANY (ARRAY['GO'::text, 'HOLD'::text, 'NO_GO'::text])))),
    CONSTRAINT opportunity_scores_subject_type_check CHECK ((subject_type = 'user'::text))
);


--
-- Name: opportunity_workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunity_workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    opportunity_id uuid NOT NULL,
    user_id uuid NOT NULL,
    workflow_status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT opportunity_workflows_workflow_status_check CHECK ((workflow_status = ANY (ARRAY['NEW'::text, 'REVIEWED'::text, 'GO'::text, 'PREPARATION'::text, 'READY'::text, 'SUBMITTED'::text, 'EXPIRED'::text])))
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
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    channels jsonb DEFAULT '{}'::jsonb NOT NULL,
    filters jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    stripe_price_id text,
    status text DEFAULT 'inactive'::text,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false
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
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    user_id uuid NOT NULL,
    full_name text,
    organization text,
    country_focus text,
    onboarding_complete_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
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
-- Name: access_requests access_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_requests
    ADD CONSTRAINT access_requests_pkey PRIMARY KEY (id);


--
-- Name: agent_runs agent_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runs
    ADD CONSTRAINT agent_runs_pkey PRIMARY KEY (id);


--
-- Name: brief_versions brief_versions_agent_run_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brief_versions
    ADD CONSTRAINT brief_versions_agent_run_id_key UNIQUE (agent_run_id);


--
-- Name: brief_versions brief_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brief_versions
    ADD CONSTRAINT brief_versions_pkey PRIMARY KEY (id);


--
-- Name: buyers buyers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyers
    ADD CONSTRAINT buyers_pkey PRIMARY KEY (id);


--
-- Name: decision_history decision_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_history
    ADD CONSTRAINT decision_history_pkey PRIMARY KEY (id);


--
-- Name: geo_countries geo_countries_country_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_countries
    ADD CONSTRAINT geo_countries_country_code_key UNIQUE (country_code);


--
-- Name: geo_countries geo_countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_countries
    ADD CONSTRAINT geo_countries_pkey PRIMARY KEY (id);


--
-- Name: geo_countries geo_countries_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_countries
    ADD CONSTRAINT geo_countries_slug_key UNIQUE (slug);


--
-- Name: geo_localities geo_localities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_localities
    ADD CONSTRAINT geo_localities_pkey PRIMARY KEY (id);


--
-- Name: geo_localities geo_localities_region_normalized_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_localities
    ADD CONSTRAINT geo_localities_region_normalized_name_unique UNIQUE (region_id, normalized_name);


--
-- Name: geo_localities geo_localities_region_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_localities
    ADD CONSTRAINT geo_localities_region_slug_unique UNIQUE (region_id, slug);


--
-- Name: geo_regions geo_regions_country_normalized_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_regions
    ADD CONSTRAINT geo_regions_country_normalized_name_unique UNIQUE (country_id, normalized_name);


--
-- Name: geo_regions geo_regions_country_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_regions
    ADD CONSTRAINT geo_regions_country_slug_unique UNIQUE (country_id, slug);


--
-- Name: geo_regions geo_regions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_regions
    ADD CONSTRAINT geo_regions_pkey PRIMARY KEY (id);


--
-- Name: geo_zones geo_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_zones
    ADD CONSTRAINT geo_zones_pkey PRIMARY KEY (id);


--
-- Name: geo_zones geo_zones_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_zones
    ADD CONSTRAINT geo_zones_slug_key UNIQUE (slug);


--
-- Name: ingestion_jobs ingestion_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingestion_jobs
    ADD CONSTRAINT ingestion_jobs_pkey PRIMARY KEY (id);


--
-- Name: ingestion_runs ingestion_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingestion_runs
    ADD CONSTRAINT ingestion_runs_pkey PRIMARY KEY (id);


--
-- Name: magic_link_tokens magic_link_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_link_tokens
    ADD CONSTRAINT magic_link_tokens_pkey PRIMARY KEY (id);


--
-- Name: magic_link_tokens magic_link_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_link_tokens
    ADD CONSTRAINT magic_link_tokens_token_key UNIQUE (token);


--
-- Name: notification_logs notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id);


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
-- Name: opportunities_raw opportunities_raw_source_external_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities_raw
    ADD CONSTRAINT opportunities_raw_source_external_unique UNIQUE (source_key, external_id);


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
-- Name: opportunity_briefs opportunity_briefs_opportunity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_briefs
    ADD CONSTRAINT opportunity_briefs_opportunity_id_key UNIQUE (opportunity_id);


--
-- Name: opportunity_briefs opportunity_briefs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_briefs
    ADD CONSTRAINT opportunity_briefs_pkey PRIMARY KEY (id);


--
-- Name: opportunity_decisions opportunity_decisions_opportunity_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_decisions
    ADD CONSTRAINT opportunity_decisions_opportunity_id_user_id_key UNIQUE (opportunity_id, user_id);


--
-- Name: opportunity_decisions opportunity_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_decisions
    ADD CONSTRAINT opportunity_decisions_pkey PRIMARY KEY (id);


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
-- Name: opportunity_extractions opportunity_extractions_agent_run_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_extractions
    ADD CONSTRAINT opportunity_extractions_agent_run_id_key UNIQUE (agent_run_id);


--
-- Name: opportunity_extractions opportunity_extractions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_extractions
    ADD CONSTRAINT opportunity_extractions_pkey PRIMARY KEY (id);


--
-- Name: opportunity_preps opportunity_preps_agent_run_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_preps
    ADD CONSTRAINT opportunity_preps_agent_run_id_key UNIQUE (agent_run_id);


--
-- Name: opportunity_preps opportunity_preps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_preps
    ADD CONSTRAINT opportunity_preps_pkey PRIMARY KEY (id);


--
-- Name: opportunity_scores opportunity_scores_agent_run_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_scores
    ADD CONSTRAINT opportunity_scores_agent_run_id_key UNIQUE (agent_run_id);


--
-- Name: opportunity_scores opportunity_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_scores
    ADD CONSTRAINT opportunity_scores_pkey PRIMARY KEY (id);


--
-- Name: opportunity_workflows opportunity_workflows_opportunity_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_workflows
    ADD CONSTRAINT opportunity_workflows_opportunity_id_user_id_key UNIQUE (opportunity_id, user_id);


--
-- Name: opportunity_workflows opportunity_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_workflows
    ADD CONSTRAINT opportunity_workflows_pkey PRIMARY KEY (id);


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
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: whatsapp_optins whatsapp_optins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_optins
    ADD CONSTRAINT whatsapp_optins_pkey PRIMARY KEY (user_id);


--
-- Name: agent_runs_agent_type_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agent_runs_agent_type_started_at_idx ON public.agent_runs USING btree (agent_type, started_at DESC);


--
-- Name: agent_runs_opportunity_agent_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agent_runs_opportunity_agent_started_at_idx ON public.agent_runs USING btree (opportunity_id, agent_type, started_at DESC) WHERE (opportunity_id IS NOT NULL);


--
-- Name: agent_runs_raw_agent_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agent_runs_raw_agent_started_at_idx ON public.agent_runs USING btree (raw_id, agent_type, started_at DESC) WHERE (raw_id IS NOT NULL);


--
-- Name: agent_runs_source_agent_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agent_runs_source_agent_started_at_idx ON public.agent_runs USING btree (source_id, agent_type, started_at DESC) WHERE (source_id IS NOT NULL);


--
-- Name: agent_runs_status_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agent_runs_status_started_at_idx ON public.agent_runs USING btree (status, started_at DESC);


--
-- Name: brief_versions_one_current_per_opportunity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX brief_versions_one_current_per_opportunity_idx ON public.brief_versions USING btree (opportunity_id) WHERE (is_current = true);


--
-- Name: brief_versions_opportunity_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX brief_versions_opportunity_created_at_idx ON public.brief_versions USING btree (opportunity_id, created_at DESC);


--
-- Name: buyers_unique_country_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX buyers_unique_country_name_idx ON public.buyers USING btree (COALESCE(country_code, ''::text), normalized_name);


--
-- Name: decision_history_opportunity_user_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX decision_history_opportunity_user_created_at_idx ON public.decision_history USING btree (opportunity_id, user_id, created_at DESC);


--
-- Name: decision_history_user_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX decision_history_user_created_at_idx ON public.decision_history USING btree (user_id, created_at DESC);


--
-- Name: geo_countries_zone_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX geo_countries_zone_sort_idx ON public.geo_countries USING btree (zone_id, sort_order, name);


--
-- Name: geo_localities_region_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX geo_localities_region_sort_idx ON public.geo_localities USING btree (region_id, sort_order, name);


--
-- Name: geo_regions_country_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX geo_regions_country_sort_idx ON public.geo_regions USING btree (country_id, sort_order, name);


--
-- Name: geo_zones_parent_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX geo_zones_parent_sort_idx ON public.geo_zones USING btree (parent_zone_id, sort_order, name);


--
-- Name: idx_magic_link_tokens_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_magic_link_tokens_email ON public.magic_link_tokens USING btree (email);


--
-- Name: idx_magic_link_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_magic_link_tokens_token ON public.magic_link_tokens USING btree (token);


--
-- Name: idx_opportunities_country_deadline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_country_deadline ON public.opportunities USING btree (country_code, deadline_at);


--
-- Name: idx_opportunities_country_updated_desc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunities_country_updated_desc ON public.opportunities USING btree (country_code, updated_at DESC);


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
-- Name: ingestion_runs_source_key_started_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ingestion_runs_source_key_started_idx ON public.ingestion_runs USING btree (source_key, started_at DESC);


--
-- Name: notification_queue_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_queue_idx ON public.notification_queue USING btree (channel, status, scheduled_at, id);


--
-- Name: opportunities_country_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_country_idx ON public.opportunities USING btree (country_code);


--
-- Name: opportunities_live_country_published_desc_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_live_country_published_desc_idx ON public.opportunities USING btree (country_code, published_at DESC) WHERE (is_deleted = false);


--
-- Name: opportunities_live_published_at_desc_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_live_published_at_desc_idx ON public.opportunities USING btree (published_at DESC) WHERE (is_deleted = false);


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
-- Name: opportunities_raw_url_canonical_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_raw_url_canonical_idx ON public.opportunities_raw USING btree (url_canonical);


--
-- Name: opportunities_source_url_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunities_source_url_idx ON public.opportunities USING btree (source_url);


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
-- Name: opportunity_ai_fingerprint_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_ai_fingerprint_idx ON public.opportunity_ai USING btree (fingerprint);


--
-- Name: opportunity_ai_fingerprint_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX opportunity_ai_fingerprint_unique ON public.opportunity_ai USING btree (fingerprint);


--
-- Name: opportunity_ai_needs_review_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_ai_needs_review_idx ON public.opportunity_ai USING btree (needs_review);


--
-- Name: opportunity_ai_raw_id_extracted_updated_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_ai_raw_id_extracted_updated_idx ON public.opportunity_ai USING btree (raw_id, extracted_at DESC, updated_at DESC);


--
-- Name: opportunity_briefs_opportunity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_briefs_opportunity_id_idx ON public.opportunity_briefs USING btree (opportunity_id);


--
-- Name: opportunity_decisions_opportunity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_decisions_opportunity_id_idx ON public.opportunity_decisions USING btree (opportunity_id);


--
-- Name: opportunity_decisions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_decisions_user_id_idx ON public.opportunity_decisions USING btree (user_id);


--
-- Name: opportunity_documents_opp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_documents_opp_idx ON public.opportunity_documents USING btree (opportunity_id);


--
-- Name: opportunity_events_opp_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_events_opp_idx ON public.opportunity_events USING btree (opportunity_id, occurred_at DESC);


--
-- Name: opportunity_extractions_fingerprint_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_extractions_fingerprint_idx ON public.opportunity_extractions USING btree (fingerprint);


--
-- Name: opportunity_extractions_geo_country_current_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_extractions_geo_country_current_idx ON public.opportunity_extractions USING btree (geo_country_id) WHERE (is_current = true);


--
-- Name: opportunity_extractions_geo_locality_current_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_extractions_geo_locality_current_idx ON public.opportunity_extractions USING btree (geo_locality_id) WHERE (is_current = true);


--
-- Name: opportunity_extractions_geo_region_current_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_extractions_geo_region_current_idx ON public.opportunity_extractions USING btree (geo_region_id) WHERE (is_current = true);


--
-- Name: opportunity_extractions_one_current_per_opportunity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX opportunity_extractions_one_current_per_opportunity_idx ON public.opportunity_extractions USING btree (opportunity_id) WHERE (is_current = true);


--
-- Name: opportunity_extractions_opportunity_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_extractions_opportunity_created_at_idx ON public.opportunity_extractions USING btree (opportunity_id, created_at DESC);


--
-- Name: opportunity_extractions_raw_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_extractions_raw_created_at_idx ON public.opportunity_extractions USING btree (raw_id, created_at DESC);


--
-- Name: opportunity_preps_one_current_per_user_opportunity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX opportunity_preps_one_current_per_user_opportunity_idx ON public.opportunity_preps USING btree (opportunity_id, user_id) WHERE (is_current = true);


--
-- Name: opportunity_preps_opportunity_user_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_preps_opportunity_user_created_at_idx ON public.opportunity_preps USING btree (opportunity_id, user_id, created_at DESC);


--
-- Name: opportunity_preps_user_current_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_preps_user_current_created_at_idx ON public.opportunity_preps USING btree (user_id, is_current, created_at DESC);


--
-- Name: opportunity_scores_one_current_per_user_opportunity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX opportunity_scores_one_current_per_user_opportunity_idx ON public.opportunity_scores USING btree (opportunity_id, user_id) WHERE (is_current = true);


--
-- Name: opportunity_scores_opportunity_user_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_scores_opportunity_user_created_at_idx ON public.opportunity_scores USING btree (opportunity_id, user_id, created_at DESC);


--
-- Name: opportunity_scores_user_current_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_scores_user_current_created_at_idx ON public.opportunity_scores USING btree (user_id, is_current, created_at DESC);


--
-- Name: opportunity_workflows_opportunity_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_workflows_opportunity_id_idx ON public.opportunity_workflows USING btree (opportunity_id);


--
-- Name: opportunity_workflows_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opportunity_workflows_user_id_idx ON public.opportunity_workflows USING btree (user_id);


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
-- Name: subscriptions_current_period_end_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_current_period_end_idx ON public.subscriptions USING btree (current_period_end DESC);


--
-- Name: subscriptions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_status_idx ON public.subscriptions USING btree (status);


--
-- Name: subscriptions_stripe_subscription_id_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subscriptions_stripe_subscription_id_unique_idx ON public.subscriptions USING btree (stripe_subscription_id) WHERE (stripe_subscription_id IS NOT NULL);


--
-- Name: subscriptions_user_id_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX subscriptions_user_id_unique_idx ON public.subscriptions USING btree (user_id);


--
-- Name: subscriptions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_user_idx ON public.subscriptions USING btree (user_id, is_active);


--
-- Name: opportunity_ai trg_compute_opportunity_quality; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_compute_opportunity_quality BEFORE INSERT OR UPDATE ON public.opportunity_ai FOR EACH ROW EXECUTE FUNCTION public.compute_opportunity_quality();


--
-- Name: ingestion_jobs trg_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON public.ingestion_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: opportunity_briefs trg_opportunity_briefs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_opportunity_briefs_updated_at BEFORE UPDATE ON public.opportunity_briefs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_opportunity_briefs();


--
-- Name: opportunity_decisions trg_opportunity_decisions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_opportunity_decisions_updated_at BEFORE UPDATE ON public.opportunity_decisions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_opportunity_decisions();


--
-- Name: opportunity_workflows trg_opportunity_workflows_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_opportunity_workflows_updated_at BEFORE UPDATE ON public.opportunity_workflows FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_opportunity_workflows();


--
-- Name: opportunities_raw trg_rp_set_updated_at_opportunities_raw; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_rp_set_updated_at_opportunities_raw BEFORE UPDATE ON public.opportunities_raw FOR EACH ROW EXECUTE FUNCTION public.rp_set_updated_at();


--
-- Name: opportunity_ai trg_rp_set_updated_at_opportunity_ai; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_rp_set_updated_at_opportunity_ai BEFORE UPDATE ON public.opportunity_ai FOR EACH ROW EXECUTE FUNCTION public.rp_set_updated_at();


--
-- Name: opportunity_ai trg_set_opportunity_ai_fingerprint_from_raw; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_opportunity_ai_fingerprint_from_raw BEFORE INSERT OR UPDATE ON public.opportunity_ai FOR EACH ROW EXECUTE FUNCTION public.set_opportunity_ai_fingerprint_from_raw();


--
-- Name: sources trg_sources_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sources_updated_at BEFORE UPDATE ON public.sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: subscriptions trg_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: agent_runs agent_runs_ingestion_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runs
    ADD CONSTRAINT agent_runs_ingestion_run_id_fkey FOREIGN KEY (ingestion_run_id) REFERENCES public.ingestion_runs(id);


--
-- Name: agent_runs agent_runs_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runs
    ADD CONSTRAINT agent_runs_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id);


--
-- Name: agent_runs agent_runs_raw_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runs
    ADD CONSTRAINT agent_runs_raw_id_fkey FOREIGN KEY (raw_id) REFERENCES public.opportunities_raw(id);


--
-- Name: agent_runs agent_runs_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runs
    ADD CONSTRAINT agent_runs_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id);


--
-- Name: agent_runs agent_runs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runs
    ADD CONSTRAINT agent_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: brief_versions brief_versions_agent_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brief_versions
    ADD CONSTRAINT brief_versions_agent_run_id_fkey FOREIGN KEY (agent_run_id) REFERENCES public.agent_runs(id);


--
-- Name: brief_versions brief_versions_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brief_versions
    ADD CONSTRAINT brief_versions_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id);


--
-- Name: brief_versions brief_versions_source_extraction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brief_versions
    ADD CONSTRAINT brief_versions_source_extraction_id_fkey FOREIGN KEY (source_extraction_id) REFERENCES public.opportunity_extractions(id);


--
-- Name: brief_versions brief_versions_source_score_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brief_versions
    ADD CONSTRAINT brief_versions_source_score_id_fkey FOREIGN KEY (source_score_id) REFERENCES public.opportunity_scores(id);


--
-- Name: decision_history decision_history_agent_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_history
    ADD CONSTRAINT decision_history_agent_run_id_fkey FOREIGN KEY (agent_run_id) REFERENCES public.agent_runs(id);


--
-- Name: decision_history decision_history_opportunity_decision_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_history
    ADD CONSTRAINT decision_history_opportunity_decision_id_fkey FOREIGN KEY (opportunity_decision_id) REFERENCES public.opportunity_decisions(id);


--
-- Name: decision_history decision_history_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_history
    ADD CONSTRAINT decision_history_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id);


--
-- Name: decision_history decision_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.decision_history
    ADD CONSTRAINT decision_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: geo_countries geo_countries_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_countries
    ADD CONSTRAINT geo_countries_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.geo_zones(id) ON DELETE RESTRICT;


--
-- Name: geo_localities geo_localities_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_localities
    ADD CONSTRAINT geo_localities_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.geo_regions(id) ON DELETE CASCADE;


--
-- Name: geo_regions geo_regions_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_regions
    ADD CONSTRAINT geo_regions_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.geo_countries(id) ON DELETE CASCADE;


--
-- Name: geo_zones geo_zones_parent_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_zones
    ADD CONSTRAINT geo_zones_parent_zone_id_fkey FOREIGN KEY (parent_zone_id) REFERENCES public.geo_zones(id) ON DELETE SET NULL;


--
-- Name: ingestion_jobs ingestion_jobs_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingestion_jobs
    ADD CONSTRAINT ingestion_jobs_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE CASCADE;


--
-- Name: ingestion_runs ingestion_runs_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingestion_runs
    ADD CONSTRAINT ingestion_runs_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id);


--
-- Name: notification_logs notification_logs_queue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_logs
    ADD CONSTRAINT notification_logs_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES public.notification_queue(id) ON DELETE SET NULL;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


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
-- Name: opportunity_briefs opportunity_briefs_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_briefs
    ADD CONSTRAINT opportunity_briefs_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE;


--
-- Name: opportunity_decisions opportunity_decisions_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_decisions
    ADD CONSTRAINT opportunity_decisions_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE;


--
-- Name: opportunity_decisions opportunity_decisions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_decisions
    ADD CONSTRAINT opportunity_decisions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


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
-- Name: opportunity_extractions opportunity_extractions_agent_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_extractions
    ADD CONSTRAINT opportunity_extractions_agent_run_id_fkey FOREIGN KEY (agent_run_id) REFERENCES public.agent_runs(id);


--
-- Name: opportunity_extractions opportunity_extractions_geo_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_extractions
    ADD CONSTRAINT opportunity_extractions_geo_country_id_fkey FOREIGN KEY (geo_country_id) REFERENCES public.geo_countries(id) ON DELETE SET NULL;


--
-- Name: opportunity_extractions opportunity_extractions_geo_locality_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_extractions
    ADD CONSTRAINT opportunity_extractions_geo_locality_id_fkey FOREIGN KEY (geo_locality_id) REFERENCES public.geo_localities(id) ON DELETE SET NULL;


--
-- Name: opportunity_extractions opportunity_extractions_geo_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_extractions
    ADD CONSTRAINT opportunity_extractions_geo_region_id_fkey FOREIGN KEY (geo_region_id) REFERENCES public.geo_regions(id) ON DELETE SET NULL;


--
-- Name: opportunity_extractions opportunity_extractions_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_extractions
    ADD CONSTRAINT opportunity_extractions_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id);


--
-- Name: opportunity_extractions opportunity_extractions_raw_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_extractions
    ADD CONSTRAINT opportunity_extractions_raw_id_fkey FOREIGN KEY (raw_id) REFERENCES public.opportunities_raw(id);


--
-- Name: opportunity_extractions opportunity_extractions_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_extractions
    ADD CONSTRAINT opportunity_extractions_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.sources(id);


--
-- Name: opportunity_preps opportunity_preps_agent_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_preps
    ADD CONSTRAINT opportunity_preps_agent_run_id_fkey FOREIGN KEY (agent_run_id) REFERENCES public.agent_runs(id);


--
-- Name: opportunity_preps opportunity_preps_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_preps
    ADD CONSTRAINT opportunity_preps_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id);


--
-- Name: opportunity_preps opportunity_preps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_preps
    ADD CONSTRAINT opportunity_preps_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: opportunity_scores opportunity_scores_agent_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_scores
    ADD CONSTRAINT opportunity_scores_agent_run_id_fkey FOREIGN KEY (agent_run_id) REFERENCES public.agent_runs(id);


--
-- Name: opportunity_scores opportunity_scores_input_extraction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_scores
    ADD CONSTRAINT opportunity_scores_input_extraction_id_fkey FOREIGN KEY (input_extraction_id) REFERENCES public.opportunity_extractions(id);


--
-- Name: opportunity_scores opportunity_scores_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_scores
    ADD CONSTRAINT opportunity_scores_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id);


--
-- Name: opportunity_scores opportunity_scores_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_scores
    ADD CONSTRAINT opportunity_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: opportunity_workflows opportunity_workflows_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_workflows
    ADD CONSTRAINT opportunity_workflows_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE;


--
-- Name: opportunity_workflows opportunity_workflows_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity_workflows
    ADD CONSTRAINT opportunity_workflows_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


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
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: brief_versions Authenticated can read brief versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can read brief versions" ON public.brief_versions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.opportunities o
  WHERE ((o.id = brief_versions.opportunity_id) AND (o.is_public = true) AND (COALESCE(o.is_deleted, false) = false)))));


--
-- Name: opportunity_briefs Authenticated can read opportunity briefs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can read opportunity briefs" ON public.opportunity_briefs FOR SELECT TO authenticated USING (true);


--
-- Name: opportunity_extractions Authenticated can read opportunity extractions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can read opportunity extractions" ON public.opportunity_extractions FOR SELECT TO authenticated USING (((is_current = true) AND (EXISTS ( SELECT 1
   FROM public.opportunities o
  WHERE ((o.id = opportunity_extractions.opportunity_id) AND (o.is_public = true) AND (COALESCE(o.is_deleted, false) = false))))));


--
-- Name: agent_runs Authenticated read workspace timeline agent runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read workspace timeline agent runs" ON public.agent_runs FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR ((user_id IS NULL) AND (agent_type = 'extract'::public.agent_run_type) AND (opportunity_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.opportunities o
  WHERE ((o.id = agent_runs.opportunity_id) AND (o.is_public = true) AND (COALESCE(o.is_deleted, false) = false)))))));


--
-- Name: decision_history Service role manages decision history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages decision history" ON public.decision_history TO service_role USING (true) WITH CHECK (true);


--
-- Name: opportunity_briefs Service role manages opportunity briefs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages opportunity briefs" ON public.opportunity_briefs TO service_role USING (true) WITH CHECK (true);


--
-- Name: opportunity_preps Service role manages preps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages preps" ON public.opportunity_preps TO service_role USING (true) WITH CHECK (true);


--
-- Name: opportunity_decisions Service role reads all decisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role reads all decisions" ON public.opportunity_decisions FOR SELECT TO service_role USING (true);


--
-- Name: opportunity_workflows Service role reads all workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role reads all workflows" ON public.opportunity_workflows FOR SELECT TO service_role USING (true);


--
-- Name: opportunity_decisions Users manage own decisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own decisions" ON public.opportunity_decisions TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: opportunity_workflows Users manage own workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own workflows" ON public.opportunity_workflows TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: decision_history Users read own decision history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own decision history" ON public.decision_history FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: opportunity_scores Users read own opportunity scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own opportunity scores" ON public.opportunity_scores FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: opportunity_preps Users read own preps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own preps" ON public.opportunity_preps FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: access_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: access_requests anon can insert access_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "anon can insert access_requests" ON public.access_requests FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: brief_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brief_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: buyers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

--
-- Name: buyers buyers_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY buyers_public_read ON public.buyers FOR SELECT TO anon USING (true);


--
-- Name: decision_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.decision_history ENABLE ROW LEVEL SECURITY;

--
-- Name: geo_countries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.geo_countries ENABLE ROW LEVEL SECURITY;

--
-- Name: geo_countries geo_countries_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY geo_countries_public_read ON public.geo_countries FOR SELECT USING ((is_active = true));


--
-- Name: geo_localities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.geo_localities ENABLE ROW LEVEL SECURITY;

--
-- Name: geo_localities geo_localities_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY geo_localities_public_read ON public.geo_localities FOR SELECT USING ((is_active = true));


--
-- Name: geo_regions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.geo_regions ENABLE ROW LEVEL SECURITY;

--
-- Name: geo_regions geo_regions_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY geo_regions_public_read ON public.geo_regions FOR SELECT USING ((is_active = true));


--
-- Name: geo_zones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.geo_zones ENABLE ROW LEVEL SECURITY;

--
-- Name: geo_zones geo_zones_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY geo_zones_public_read ON public.geo_zones FOR SELECT USING ((is_active = true));


--
-- Name: ingestion_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: magic_link_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.magic_link_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

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
-- Name: opportunity_briefs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.opportunity_briefs ENABLE ROW LEVEL SECURITY;

--
-- Name: opportunity_decisions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.opportunity_decisions ENABLE ROW LEVEL SECURITY;

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
-- Name: opportunity_extractions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.opportunity_extractions ENABLE ROW LEVEL SECURITY;

--
-- Name: opportunity_preps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.opportunity_preps ENABLE ROW LEVEL SECURITY;

--
-- Name: opportunity_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.opportunity_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: opportunity_workflows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.opportunity_workflows ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences owner_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_rw ON public.notification_preferences TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_profiles owner_rw; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_rw ON public.user_profiles TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


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
-- Name: magic_link_tokens service_role can manage tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role can manage tokens" ON public.magic_link_tokens TO service_role USING (true) WITH CHECK (true);


--
-- Name: access_requests service_role can read access_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service_role can read access_requests" ON public.access_requests FOR SELECT TO service_role USING (true);


--
-- Name: notification_preferences service_role_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_all ON public.notification_preferences TO service_role USING (true) WITH CHECK (true);


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
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

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

\unrestrict aQD3yU7Zc0btDywTxmLlQ50Pw0ekUbeihu3db7WJvPhHmHbdT1xr6ZyHCIZm4WV

