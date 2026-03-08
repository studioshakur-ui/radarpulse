-- Migration: create magic_link_tokens table for trial access flow
-- Stores temporary tokens that allow users to create accounts via magic links

create table if not exists public.magic_link_tokens (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  token       text not null unique,
  used        boolean default false,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz
);

-- Index for fast token lookup
create index if not exists idx_magic_link_tokens_token on magic_link_tokens(token);
create index if not exists idx_magic_link_tokens_email on magic_link_tokens(email);

-- Enable RLS
alter table public.magic_link_tokens enable row level security;

-- Drop old policies if they exist
drop policy if exists "anon can read unused tokens" on public.magic_link_tokens;
drop policy if exists "service_role can manage tokens" on public.magic_link_tokens;

-- Anon can insert tokens (for creating magic links)
create policy "anon can insert tokens"
  on public.magic_link_tokens
  for insert
  to anon
  with check (true);

-- Anon can read unused tokens (for verifying magic links)
create policy "anon can read unused tokens"
  on public.magic_link_tokens
  for select
  to anon, authenticated
  using (not used and expires_at > now());

-- Anon can update tokens (to mark as used)
create policy "anon can update tokens"
  on public.magic_link_tokens
  for update
  to anon
  using (not used and expires_at > now())
  with check (true);

-- Service role can do anything
create policy "service_role can manage tokens"
  on public.magic_link_tokens
  for all
  to service_role
  using (true);
