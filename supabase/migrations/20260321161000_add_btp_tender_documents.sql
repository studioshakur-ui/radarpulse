create table if not exists public.btp_tender_documents (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  opportunity_document_id uuid not null references public.opportunity_documents(id) on delete cascade,
  doc_kind text not null,
  is_primary boolean not null default false,
  parse_status text not null default 'PENDING',
  parsed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint btp_tender_documents_doc_kind_check check (doc_kind in (
    'BANDO','DISCIPLINARE','CAPITOLATO','ALLEGATO_TECNICO','MODELLO_DOMANDA','RETTIFICA','PREZZARIO','ALTRO'
  )),
  constraint btp_tender_documents_parse_status_check check (parse_status in ('PENDING','READY','ERROR','SKIPPED')),
  constraint btp_tender_documents_unique unique(opportunity_document_id)
);

create index if not exists btp_tender_documents_opportunity_id_idx on public.btp_tender_documents(opportunity_id);
create index if not exists btp_tender_documents_doc_kind_idx on public.btp_tender_documents(doc_kind);
create index if not exists btp_tender_documents_parse_status_idx on public.btp_tender_documents(parse_status);

create or replace function public.set_btp_tender_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_btp_tender_documents_updated_at on public.btp_tender_documents;
create trigger trg_set_btp_tender_documents_updated_at
before update on public.btp_tender_documents
for each row execute function public.set_btp_tender_documents_updated_at();

alter table public.btp_tender_documents enable row level security;

drop policy if exists "authenticated can read btp_tender_documents" on public.btp_tender_documents;
create policy "authenticated can read btp_tender_documents"
on public.btp_tender_documents
for select
using (auth.role() = 'authenticated');

grant select on public.btp_tender_documents to authenticated;
grant all on public.btp_tender_documents to service_role;
