create or replace view public.btp_inbox_fvg_v1 as
select
  o.id as opportunity_id,
  o.title,
  o.summary,
  o.source_url,
  o.deadline_at,
  o.published_at,
  o.buyer_name,
  bt.procedure_type,
  bt.contract_type,
  bt.sector,
  bt.base_amount,
  bt.currency,
  bt.region_code,
  bt.province_code,
  bt.locality_name,
  bt.status_btp,
  bt.classification_confidence,
  (
    select bfs.fit_score
    from public.btp_fit_scores bfs
    where bfs.opportunity_id = o.id
      and bfs.user_id = auth.uid()
      and bfs.is_current = true
    order by bfs.created_at desc
    limit 1
  ) as fit_score,
  (
    select bfs.fit_band
    from public.btp_fit_scores bfs
    where bfs.opportunity_id = o.id
      and bfs.user_id = auth.uid()
      and bfs.is_current = true
    order by bfs.created_at desc
    limit 1
  ) as fit_band,
  (
    select d.status
    from public.dossiers d
    where d.opportunity_id = o.id
      and d.user_id = auth.uid()
    order by d.updated_at desc
    limit 1
  ) as dossier_status
from public.opportunities o
join public.btp_tenders bt on bt.opportunity_id = o.id
where coalesce(bt.region_code, o.country_code) is not null;

grant select on public.btp_inbox_fvg_v1 to authenticated;

create or replace view public.btp_dossier_fvg_v1 as
select
  o.id as opportunity_id,
  o.title,
  o.summary,
  o.source_url,
  o.deadline_at,
  o.published_at,
  o.buyer_name,
  bt.procedure_type,
  bt.buyer_type,
  bt.contract_type,
  bt.sector,
  bt.base_amount,
  bt.currency,
  bt.region_code,
  bt.province_code,
  bt.locality_name,
  bt.status_btp,
  bt.classification_confidence,
  (
    select jsonb_agg(jsonb_build_object(
      'id', d.id,
      'opportunity_document_id', d.opportunity_document_id,
      'doc_kind', d.doc_kind,
      'is_primary', d.is_primary,
      'parse_status', d.parse_status,
      'parsed_at', d.parsed_at
    ) order by d.is_primary desc, d.created_at asc)
    from public.btp_tender_documents d
    where d.opportunity_id = o.id
  ) as documents,
  (
    select jsonb_agg(jsonb_build_object(
      'id', r.id,
      'requirement_type', r.requirement_type,
      'label', r.label,
      'details', r.details,
      'mandatory', r.mandatory,
      'confidence', r.confidence
    ) order by r.mandatory desc, r.created_at asc)
    from public.btp_requirements r
    where r.opportunity_id = o.id
  ) as requirements,
  (
    select jsonb_agg(jsonb_build_object(
      'id', x.id,
      'severity', x.severity,
      'risk_code', x.risk_code,
      'label', x.label,
      'details', x.details
    ) order by x.created_at asc)
    from public.btp_risks x
    where x.opportunity_id = o.id
  ) as risks
from public.opportunities o
join public.btp_tenders bt on bt.opportunity_id = o.id;

grant select on public.btp_dossier_fvg_v1 to authenticated;
