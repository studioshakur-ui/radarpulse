# RadarPulse Ops Runbook (IT-only)

## Scope
- Ingestion restricted to Italian tenders only.
- Active provider: TED (`eu_ted_search`).
- Inbox reads from `public.opportunities` with `country_code='IT'`.

## Prerequisites
- Supabase CLI authenticated and project linked.
- Secrets configured for deployed functions:
  - `SB_URL`
  - `SERVICE_ROLE_KEY`
  - Optional AI: `OPENAI_API_KEY` (if missing, AI is skipped, job still succeeds)

## JWT mode and auth model
- `verify_jwt=false` is enabled for `dispatcher` and `worker` at function config level.
- Reason: avoid legacy gateway JWT rejection issues while preserving compatibility with scheduler calls.
- Security model:
  - If an `Authorization: Bearer ...` header is provided, functions manually verify it via `sb.auth.getUser(token)`.
  - Invalid bearer token returns `401`.
  - System/scheduler calls without bearer remain allowed.
- For all other user-facing functions, repo-managed function config is the source of truth for `verify_jwt`.
- Do not keep manual Supabase dashboard JWT toggles as a long-term override; redeploy from the repo instead.

## Deploy DB changes (source of truth: migrations)
From repo root:

```bash
supabase db push
```

## Local reset (optional, for clean test)
From repo root:

```bash
supabase db reset
```

`supabase/seed.sql` enforces IT-only source activity after reset.

## Run ingestion once (manual smoke test)
Use authenticated calls (or your existing scheduler), then:

1. Trigger dispatcher once (queue due IT sources).
2. Trigger worker once (or with `max_jobs`) to process queued jobs.

Expected outcome:
- jobs move to `success`
- new rows in `public.opportunities_raw`
- new/upserted rows in `public.opportunities` with `country_code='IT'` and `is_public=true`

### HTTP smoke test (PowerShell)
```powershell
pwsh ./scripts/test_dispatcher_worker.ps1 `
  -SupabaseUrl "https://<PROJECT_REF>.supabase.co" `
  -AnonKey "<SUPABASE_ANON_KEY>" `
  -JwtToken "<OPTIONAL_USER_JWT>"
```

If no JWT is provided, the script still works for system-style calls.

### HTTP smoke test (curl)
```bash
curl -s -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/dispatcher" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'

curl -s -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/worker" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"max_jobs":1}'
```

## Post-deploy SQL verification

### 1) Active sources must be IT only
```sql
select key, name, country_code, is_active, coalesce(meta->>'provider','') as provider
from public.sources
where is_active = true
order by key;
```
Expected: only IT rows; TED provider active.

### 2) Guard check: no non-IT active source
```sql
select count(*) as non_it_active_sources
from public.sources
where is_active = true
  and coalesce(country_code, '') <> 'IT';
```
Expected: `0`.

### 3) Opportunities presence for Inbox
```sql
select
  count(*) as total,
  count(*) filter (where country_code='IT') as it_total,
  count(*) filter (where country_code='IT' and is_public=true) as it_public_total
from public.opportunities;
```
Expected: `it_total > 0` and `it_public_total > 0` after successful ingestion.

### 4) Ingestion health (last 24h)
```sql
select status, count(*) as total
from public.ingestion_jobs
where created_at >= now() - interval '24 hours'
group by status
order by status;
```
Expected: majority `success`, no recurring TED 400.

### 5) Recent errors (quick diagnostics)
```sql
select id, source_id, status, error, created_at
from public.ingestion_jobs
where status='error'
order by created_at desc
limit 20;
```
Expected: no `fields must not be empty`, no `openaiModel` undefined errors, no `confidence` column mismatch.

## Notes on failure modes fixed
- TED 400 (`fields must not be empty`): connector now always sends non-empty `fields`.
- AI optional crash: AI extraction safely skips when `OPENAI_API_KEY` is missing; best-effort failures do not fail jobs.
- DB mismatch writes: worker writes only columns that exist in `opportunities_raw` / `opportunities`.

## ANAC OCDS (IT_NATIVE) checks
Use these checks after deploy to confirm Italy-native ingestion path:

```sql
select key, country_code, origin_type, is_active
from public.sources
where key like 'it_anac%';
```

```sql
select source_key, status, fetched_count, raw_upserted_count, opp_upserted_count, started_at
from public.ingestion_runs
order by started_at desc
limit 10;
```

```sql
select source_id, count(*)
from public.opportunities_raw
group by 1
order by 2 desc;
```

```sql
select source_id, count(*)
from public.opportunities
group by 1
order by 2 desc;
```

```sql
select count(*)
from public.opportunities_search_v1
where source_key = 'it_anac_ocds';
```

### Dispatcher smoke test with anon + bearer
```bash
curl -s -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/dispatcher" \
  -H "apikey: <SUPABASE_ANON_KEY>" \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: HTTP 200 with `{ "ok": true, ... }`.
