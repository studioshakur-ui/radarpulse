create table if not exists public.btp_requirements (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  source_document_id uuid references public.btp_tender_documents(id) on delete set null,
  requirement_type text not null,
  label text not null,
  details text,
  mandatory boolean not null default true,
  confidence numeric(5,4),
  created_by_run_id uuid references public.agent_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint btp_requirements_type_check check (requirement_type in (
    'ADMINISTRATIVE','TECHNICAL','FINANCIAL','CERTIFICATION','DEADLINE','SITE_VISIT','SUBMISSION_MODE','OTHER'
  ))
);

create table if not exists public.btp_risks (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  source_document_id uuid references public.btp_tender_documents(id) on delete set null,
  risk_code text not null,
  severity text not null,
  label text not null,
  details text,
  created_by_run_id uuid references public.agent_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint btp_risks_severity_check check (severity in ('LOW','MEDIUM','HIGH','BLOCKER'))
);

create index if not exists btp_requirements_opportunity_id_idx on public.btp_requirements(opportunity_id);
create index if not exists btp_requirements_requirement_type_idx on public.btp_requirements(requirement_type);
create index if not exists btp_requirements_mandatory_idx on public.btp_requirements(mandatory);
create index if not exists btp_risks_opportunity_id_idx on public.btp_risks(opportunity_id);
create index if not exists btp_risks_severity_idx on public.btp_risks(severity);

create or replace function public.set_btp_requirements_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_btp_requirements_updated_at on public.btp_requirements;
create trigger trg_set_btp_requirements_updated_at
before update on public.btp_requirements
for each row execute function public.set_btp_requirements_updated_at();

create or replace function public.set_btp_risks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_btp_risks_updated_at on public.btp_risks;
create trigger trg_set_btp_risks_updated_at
before update on public.btp_risks
for each row execute function public.set_btp_risks_updated_at();

alter table public.btp_requirements enable row level security;
alter table public.btp_risks enable row level security;

create policy "authenticated can read btp_requirements"
on public.btp_requirements
for select
using (auth.role() = 'authenticated');

create policy "authenticated can read btp_risks"
on public.btp_risks
for select
using (auth.role() = 'authenticated');

grant select on public.btp_requirements to authenticated;
grant all on public.btp_requirements to service_role;
grant select on public.btp_risks to authenticated;
grant all on public.btp_risks to service_role;
