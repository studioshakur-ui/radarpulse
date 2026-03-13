-- Sprint 6: user_profiles and notification_preferences tables.
-- user_profiles stores onboarding data (name, org, country focus).
-- notification_preferences stores per-user digest settings.

-- ─── user_profiles ───────────────────────────────────────────────────────────

create table if not exists public.user_profiles (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  full_name             text,
  organization          text,
  country_focus         text,          -- ISO-2 code or "GLOBAL"
  onboarding_complete_at timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

create policy "owner_rw" on public.user_profiles
  for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── notification_preferences ────────────────────────────────────────────────

create table if not exists public.notification_preferences (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  email_digest_enabled   boolean  not null default true,
  -- 'immediate' | 'daily' | 'weekly' | 'off'
  email_digest_frequency text     not null default 'daily',
  last_digest_at         timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "owner_rw" on public.notification_preferences
  for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- service_role can read all prefs for the digest job
create policy "service_role_all" on public.notification_preferences
  for all to service_role
  using (true)
  with check (true);
