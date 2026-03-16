do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'agent_run_type'
  ) then
    create type public.agent_run_type as enum ('source', 'extract', 'score', 'brief');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'agent_run_status'
  ) then
    create type public.agent_run_status as enum ('queued', 'running', 'success', 'error', 'skipped');
  end if;
end
$$;

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_type public.agent_run_type not null,
  status public.agent_run_status not null,
  trigger_type text not null,
  source_id uuid null references public.sources(id),
  ingestion_run_id uuid null references public.ingestion_runs(id),
  raw_id uuid null references public.opportunities_raw(id),
  opportunity_id uuid null references public.opportunities(id),
  user_id uuid null references auth.users(id),
  subject_key text null,
  model text null,
  prompt_version text null,
  agent_version text not null,
  started_at timestamptz not null,
  finished_at timestamptz null,
  duration_ms integer null,
  error_message text null,
  input_ref jsonb null,
  output_ref jsonb null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_runs_agent_type_started_at_idx
  on public.agent_runs (agent_type, started_at desc);

create index if not exists agent_runs_opportunity_agent_started_at_idx
  on public.agent_runs (opportunity_id, agent_type, started_at desc)
  where opportunity_id is not null;

create index if not exists agent_runs_raw_agent_started_at_idx
  on public.agent_runs (raw_id, agent_type, started_at desc)
  where raw_id is not null;

create index if not exists agent_runs_source_agent_started_at_idx
  on public.agent_runs (source_id, agent_type, started_at desc)
  where source_id is not null;

create index if not exists agent_runs_status_started_at_idx
  on public.agent_runs (status, started_at desc);

comment on table public.agent_runs is 'Unified append-oriented run ledger for source, extract, score, and brief agents.';
comment on column public.agent_runs.id is 'Primary key for the agent run.';
comment on column public.agent_runs.agent_type is 'Agent category that produced this run.';
comment on column public.agent_runs.status is 'Lifecycle status for the run.';
comment on column public.agent_runs.trigger_type is 'Execution trigger origin such as worker, http, backfill, or system.';
comment on column public.agent_runs.source_id is 'Optional source registry row associated with the run.';
comment on column public.agent_runs.ingestion_run_id is 'Optional link to legacy ingestion_runs for source compatibility.';
comment on column public.agent_runs.raw_id is 'Optional raw source item processed by the run.';
comment on column public.agent_runs.opportunity_id is 'Optional canonical opportunity processed by the run.';
comment on column public.agent_runs.user_id is 'Optional user subject for per-user runs.';
comment on column public.agent_runs.subject_key is 'Fallback subject identifier when no foreign-key subject is available.';
comment on column public.agent_runs.model is 'Optional model identifier used by the run.';
comment on column public.agent_runs.prompt_version is 'Optional prompt version used by the run.';
comment on column public.agent_runs.agent_version is 'Internal agent implementation/version identifier.';
comment on column public.agent_runs.started_at is 'Timestamp when execution started.';
comment on column public.agent_runs.finished_at is 'Timestamp when execution finished.';
comment on column public.agent_runs.duration_ms is 'Execution duration in milliseconds.';
comment on column public.agent_runs.error_message is 'Terminal error message when the run fails.';
comment on column public.agent_runs.input_ref is 'Structured reference to persisted inputs, not a full payload dump.';
comment on column public.agent_runs.output_ref is 'Structured reference to persisted outputs, not a full payload dump.';
comment on column public.agent_runs.meta is 'Additional run metadata for diagnostics and lineage.';
comment on column public.agent_runs.created_at is 'Row creation timestamp.';

create table if not exists public.opportunity_extractions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id),
  raw_id uuid not null references public.opportunities_raw(id),
  agent_run_id uuid not null unique references public.agent_runs(id),
  source_id uuid not null references public.sources(id),
  fingerprint text not null,
  is_backfilled boolean not null default false,
  is_current boolean not null default false,
  extract_version text not null,
  model text not null,
  content_type public.rp_content_type not null,
  buyer_type public.rp_buyer_type not null,
  buyer_name text null,
  sector text null,
  country_code text null,
  region text null,
  language text null,
  deadline_at timestamptz null,
  deadline_tz text null,
  deadline_confidence public.rp_deadline_confidence not null,
  eligibility jsonb null,
  required_docs jsonb null,
  submission jsonb null,
  budget_value numeric null,
  budget_currency text null,
  budget_confidence public.rp_evidence_confidence null,
  risks jsonb null,
  summary_10s text not null,
  extraction_quality public.rp_extraction_quality not null,
  needs_review boolean not null,
  missing_fields jsonb not null,
  signals jsonb not null,
  raw_snapshot jsonb null,
  quality_score numeric null,
  completeness_score numeric null,
  created_at timestamptz not null default now()
);

create index if not exists opportunity_extractions_opportunity_created_at_idx
  on public.opportunity_extractions (opportunity_id, created_at desc);

create index if not exists opportunity_extractions_raw_created_at_idx
  on public.opportunity_extractions (raw_id, created_at desc);

create index if not exists opportunity_extractions_fingerprint_idx
  on public.opportunity_extractions (fingerprint);

create unique index if not exists opportunity_extractions_one_current_per_opportunity_idx
  on public.opportunity_extractions (opportunity_id)
  where is_current = true;

comment on table public.opportunity_extractions is 'Append-only extraction history linked to canonical opportunities and raw source items.';
comment on column public.opportunity_extractions.id is 'Primary key for the extraction version.';
comment on column public.opportunity_extractions.opportunity_id is 'Canonical opportunity associated with this extraction.';
comment on column public.opportunity_extractions.raw_id is 'Raw source item that was extracted.';
comment on column public.opportunity_extractions.agent_run_id is 'Run ledger row that produced this extraction.';
comment on column public.opportunity_extractions.source_id is 'Source registry row associated with the raw item.';
comment on column public.opportunity_extractions.fingerprint is 'Canonical opportunity fingerprint at extraction time.';
comment on column public.opportunity_extractions.is_backfilled is 'True when the row was synthesized from legacy state.';
comment on column public.opportunity_extractions.is_current is 'Marks the current extraction row for the opportunity.';
comment on column public.opportunity_extractions.extract_version is 'Extractor schema/version identifier.';
comment on column public.opportunity_extractions.model is 'Model identifier used for extraction.';
comment on column public.opportunity_extractions.content_type is 'Extracted content type classification.';
comment on column public.opportunity_extractions.buyer_type is 'Extracted buyer type classification.';
comment on column public.opportunity_extractions.buyer_name is 'Extracted buyer name.';
comment on column public.opportunity_extractions.sector is 'Extracted sector label.';
comment on column public.opportunity_extractions.country_code is 'Extracted country code.';
comment on column public.opportunity_extractions.region is 'Extracted region label.';
comment on column public.opportunity_extractions.language is 'Extracted content language.';
comment on column public.opportunity_extractions.deadline_at is 'Extracted submission deadline timestamp.';
comment on column public.opportunity_extractions.deadline_tz is 'Extracted deadline timezone label.';
comment on column public.opportunity_extractions.deadline_confidence is 'Confidence level for the extracted deadline.';
comment on column public.opportunity_extractions.eligibility is 'Structured eligibility payload.';
comment on column public.opportunity_extractions.required_docs is 'Structured required-documents payload.';
comment on column public.opportunity_extractions.submission is 'Structured submission payload.';
comment on column public.opportunity_extractions.budget_value is 'Extracted budget numeric value.';
comment on column public.opportunity_extractions.budget_currency is 'Extracted budget currency.';
comment on column public.opportunity_extractions.budget_confidence is 'Confidence level for extracted budget.';
comment on column public.opportunity_extractions.risks is 'Structured extracted risk signals.';
comment on column public.opportunity_extractions.summary_10s is 'Short canonical extraction summary.';
comment on column public.opportunity_extractions.extraction_quality is 'Overall extraction quality label.';
comment on column public.opportunity_extractions.needs_review is 'True when extraction requires human review.';
comment on column public.opportunity_extractions.missing_fields is 'Structured list of missing fields.';
comment on column public.opportunity_extractions.signals is 'Structured quality and richness signals.';
comment on column public.opportunity_extractions.raw_snapshot is 'Normalized extraction payload snapshot stored for lineage.';
comment on column public.opportunity_extractions.quality_score is 'Compatibility extraction quality score.';
comment on column public.opportunity_extractions.completeness_score is 'Compatibility extraction completeness score.';
comment on column public.opportunity_extractions.created_at is 'Row creation timestamp.';

create table if not exists public.opportunity_scores (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id),
  agent_run_id uuid not null unique references public.agent_runs(id),
  user_id uuid not null references auth.users(id),
  subject_type text not null default 'user',
  is_backfilled boolean not null default false,
  is_current boolean not null default false,
  score_version text not null,
  model text null,
  score_value numeric not null,
  score_band text null,
  rationale_summary text not null,
  rationale_json jsonb not null,
  input_profile_snapshot jsonb null,
  input_extraction_id uuid null references public.opportunity_extractions(id),
  created_at timestamptz not null default now(),
  constraint opportunity_scores_subject_type_check
    check (subject_type = 'user')
);

create unique index if not exists opportunity_scores_one_current_per_user_opportunity_idx
  on public.opportunity_scores (opportunity_id, user_id)
  where is_current = true;

create index if not exists opportunity_scores_user_current_created_at_idx
  on public.opportunity_scores (user_id, is_current, created_at desc);

create index if not exists opportunity_scores_opportunity_user_created_at_idx
  on public.opportunity_scores (opportunity_id, user_id, created_at desc);

comment on table public.opportunity_scores is 'Append-only business relevance score history per opportunity and user.';
comment on column public.opportunity_scores.id is 'Primary key for the score row.';
comment on column public.opportunity_scores.opportunity_id is 'Canonical opportunity being scored.';
comment on column public.opportunity_scores.agent_run_id is 'Run ledger row that produced this score.';
comment on column public.opportunity_scores.user_id is 'User subject for the score.';
comment on column public.opportunity_scores.subject_type is 'Frozen V1 subject type. Must be user.';
comment on column public.opportunity_scores.is_backfilled is 'True when the row was synthesized from legacy state.';
comment on column public.opportunity_scores.is_current is 'Marks the current score row for an opportunity and user.';
comment on column public.opportunity_scores.score_version is 'Scoring logic/version identifier.';
comment on column public.opportunity_scores.model is 'Optional model identifier used during scoring.';
comment on column public.opportunity_scores.score_value is 'Numeric business relevance score.';
comment on column public.opportunity_scores.score_band is 'Optional coarse score band.';
comment on column public.opportunity_scores.rationale_summary is 'Short human-readable score rationale.';
comment on column public.opportunity_scores.rationale_json is 'Structured rationale payload for auditability.';
comment on column public.opportunity_scores.input_profile_snapshot is 'Profile snapshot used when computing the score.';
comment on column public.opportunity_scores.input_extraction_id is 'Extraction version used as the score input.';
comment on column public.opportunity_scores.created_at is 'Row creation timestamp.';

create table if not exists public.brief_versions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id),
  agent_run_id uuid not null unique references public.agent_runs(id),
  source_extraction_id uuid null references public.opportunity_extractions(id),
  source_score_id uuid null references public.opportunity_scores(id),
  is_backfilled boolean not null default false,
  is_current boolean not null default false,
  model text not null,
  prompt_version text not null,
  brief_version text not null,
  executive_summary text not null,
  fit_assessment text not null,
  risk_flags text[] not null default '{}',
  required_documents text[] not null default '{}',
  next_action text not null,
  input_snapshot jsonb null,
  generation_ms integer null,
  created_at timestamptz not null default now()
);

create unique index if not exists brief_versions_one_current_per_opportunity_idx
  on public.brief_versions (opportunity_id)
  where is_current = true;

create index if not exists brief_versions_opportunity_created_at_idx
  on public.brief_versions (opportunity_id, created_at desc);

comment on table public.brief_versions is 'Append-only brief history linked to canonical opportunities.';
comment on column public.brief_versions.id is 'Primary key for the brief version.';
comment on column public.brief_versions.opportunity_id is 'Canonical opportunity described by the brief.';
comment on column public.brief_versions.agent_run_id is 'Run ledger row that produced this brief.';
comment on column public.brief_versions.source_extraction_id is 'Optional extraction version used as brief input.';
comment on column public.brief_versions.source_score_id is 'Optional score row used as brief input.';
comment on column public.brief_versions.is_backfilled is 'True when the row was synthesized from legacy state.';
comment on column public.brief_versions.is_current is 'Marks the current brief row for the opportunity.';
comment on column public.brief_versions.model is 'Model identifier used for brief generation.';
comment on column public.brief_versions.prompt_version is 'Prompt version used for brief generation.';
comment on column public.brief_versions.brief_version is 'Brief generation logic/version identifier.';
comment on column public.brief_versions.executive_summary is 'Generated executive summary text.';
comment on column public.brief_versions.fit_assessment is 'Generated fit assessment text.';
comment on column public.brief_versions.risk_flags is 'Generated risk flag list.';
comment on column public.brief_versions.required_documents is 'Generated required documents list.';
comment on column public.brief_versions.next_action is 'Generated immediate next action.';
comment on column public.brief_versions.input_snapshot is 'Optional persisted brief input snapshot.';
comment on column public.brief_versions.generation_ms is 'Generation duration in milliseconds.';
comment on column public.brief_versions.created_at is 'Row creation timestamp.';

create table if not exists public.decision_history (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id),
  user_id uuid not null references auth.users(id),
  opportunity_decision_id uuid null references public.opportunity_decisions(id),
  agent_run_id uuid null references public.agent_runs(id),
  event_type text not null,
  decision_value text null,
  previous_decision_value text null,
  note text null,
  source text not null,
  is_backfilled boolean not null default false,
  created_at timestamptz not null default now(),
  constraint decision_history_event_type_check
    check (event_type in ('set', 'change', 'clear', 'backfill')),
  constraint decision_history_source_check
    check (source in ('web', 'backfill', 'system')),
  constraint decision_history_decision_value_check
    check (decision_value is null or decision_value in ('GO', 'HOLD', 'NO_GO')),
  constraint decision_history_previous_decision_value_check
    check (previous_decision_value is null or previous_decision_value in ('GO', 'HOLD', 'NO_GO'))
);

create index if not exists decision_history_user_created_at_idx
  on public.decision_history (user_id, created_at desc);

create index if not exists decision_history_opportunity_user_created_at_idx
  on public.decision_history (opportunity_id, user_id, created_at desc);

alter table public.decision_history enable row level security;

drop policy if exists "Users read own decision history" on public.decision_history;
create policy "Users read own decision history"
  on public.decision_history
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Service role manages decision history" on public.decision_history;
create policy "Service role manages decision history"
  on public.decision_history
  for all
  to service_role
  using (true)
  with check (true);

comment on table public.decision_history is 'Append-only audit trail of decision changes for opportunities.';
comment on column public.decision_history.id is 'Primary key for the decision history event.';
comment on column public.decision_history.opportunity_id is 'Canonical opportunity affected by the event.';
comment on column public.decision_history.user_id is 'User who owns the decision event.';
comment on column public.decision_history.opportunity_decision_id is 'Optional link to the current-state decision row.';
comment on column public.decision_history.agent_run_id is 'Optional run ledger row associated with the event.';
comment on column public.decision_history.event_type is 'Decision event type: set, change, clear, or backfill.';
comment on column public.decision_history.decision_value is 'Decision value after the event.';
comment on column public.decision_history.previous_decision_value is 'Decision value before the event.';
comment on column public.decision_history.note is 'Optional note attached to the decision event.';
comment on column public.decision_history.source is 'Origin of the event: web, backfill, or system.';
comment on column public.decision_history.is_backfilled is 'True when the row was synthesized from legacy state.';
comment on column public.decision_history.created_at is 'Event creation timestamp.';

revoke all on table public.decision_history from public;
revoke all on table public.decision_history from anon;
revoke insert, update, delete on table public.decision_history from authenticated;
grant select on table public.decision_history to authenticated;
grant select, insert on table public.decision_history to service_role;
