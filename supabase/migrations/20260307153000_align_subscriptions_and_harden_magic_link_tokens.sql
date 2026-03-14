-- Align subscriptions schema with app/edge-function usage.
-- Keep existing legacy columns untouched; only add missing fields used by code.

alter table public.subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists status text,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean;

alter table public.subscriptions
  alter column status set default 'inactive',
  alter column cancel_at_period_end set default false;

update public.subscriptions
set cancel_at_period_end = false
where cancel_at_period_end is null;

-- Required by stripe-webhook upserts (onConflict: user_id / stripe_subscription_id).
create unique index if not exists subscriptions_user_id_unique_idx
  on public.subscriptions (user_id);

create unique index if not exists subscriptions_stripe_subscription_id_unique_idx
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists subscriptions_status_idx
  on public.subscriptions (status);

create index if not exists subscriptions_current_period_end_idx
  on public.subscriptions (current_period_end desc);

-- Harden magic_link_tokens: anon policies are no longer needed because both
-- create-magic-link and verify-magic-link execute with service-role clients.
drop policy if exists "anon can insert tokens" on public.magic_link_tokens;
drop policy if exists "anon can read unused tokens" on public.magic_link_tokens;
drop policy if exists "anon can update tokens" on public.magic_link_tokens;

drop policy if exists "service_role can manage tokens" on public.magic_link_tokens;
create policy "service_role can manage tokens"
  on public.magic_link_tokens
  for all
  to service_role
  using (true)
  with check (true);
