-- Migration: create access_requests table for lead capture
-- Stores request-access form submissions from the landing page

create table if not exists public.access_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  organization text,
  use_case    text,
  created_at  timestamptz not null default now()
);

-- Allow anonymous inserts from the frontend (no auth required to submit a lead)
alter table public.access_requests enable row level security;

create policy "anon can insert access_requests"
  on public.access_requests
  for insert
  to anon, authenticated
  with check (true);

-- Only service_role can read (for admin review / Resend notifications)
create policy "service_role can read access_requests"
  on public.access_requests
  for select
  to service_role
  using (true);
