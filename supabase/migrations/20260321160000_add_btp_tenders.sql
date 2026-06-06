create table if not exists public.btp_tenders (
  opportunity_id uuid primary key references public.opportunities(id) on delete cascade,
  source_provider text,
  procedure_type text,
  buyer_name text,
  buyer_name_normalized text,
  buyer_type text,
  contract_type text,
  sector text,
  cpv_codes jsonb not null default '[]'::jsonb,
  soa_categories jsonb not null default '[]'::jsonb,
  base_amount numeric(14,2),
  currency text,
  deadline_at timestamptz,
  publication_at timestamptz,
  region_code text,
  province_code text,
  locality_name text,
  status_btp text not null default 'NEW',
  classification_confidence numeric(5,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint btp_tenders_status_check check (status_btp in ('NEW','CLASSIFIED','ENRICHED','DOCS_READY','REVIEW'))
);

create index if not exists btp_tenders_region_code_idx on public.btp_tenders(region_code);
create index if not exists btp_tenders_province_code_idx on public.btp_tenders(province_code);
create index if not exists btp_tenders_deadline_at_idx on public.btp_tenders(deadline_at desc nulls last);
create index if not exists btp_tenders_buyer_type_idx on public.btp_tenders(buyer_type);
create index if not exists btp_tenders_contract_type_idx on public.btp_tenders(contract_type);
create index if not exists btp_tenders_sector_idx on public.btp_tenders(sector);
create index if not exists btp_tenders_status_btp_idx on public.btp_tenders(status_btp);
create index if not exists btp_tenders_cpv_codes_gin_idx on public.btp_tenders using gin(cpv_codes);
create index if not exists btp_tenders_soa_categories_gin_idx on public.btp_tenders using gin(soa_categories);

create or replace function public.set_btp_tenders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_btp_tenders_updated_at on public.btp_tenders;
create trigger trg_set_btp_tenders_updated_at
before update on public.btp_tenders
for each row execute function public.set_btp_tenders_updated_at();

alter table public.btp_tenders enable row level security;

drop policy if exists "authenticated can read btp_tenders" on public.btp_tenders;
create policy "authenticated can read btp_tenders"
on public.btp_tenders
for select
using (auth.role() = 'authenticated');

revoke all on public.btp_tenders from anon;
grant select on public.btp_tenders to authenticated;
grant all on public.btp_tenders to service_role;
