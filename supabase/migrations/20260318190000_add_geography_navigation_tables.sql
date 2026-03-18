create table if not exists public.geo_zones (
  id uuid primary key default gen_random_uuid(),
  parent_zone_id uuid null references public.geo_zones(id) on delete set null,
  slug text not null unique,
  name text not null,
  kind text not null check (kind in ('continent', 'subcontinent', 'market_zone')),
  description text null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.geo_zones enable row level security;

create table if not exists public.geo_countries (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.geo_zones(id) on delete restrict,
  country_code text not null unique,
  slug text not null unique,
  name text not null,
  territory_kind text not null default 'country' check (territory_kind in ('country', 'territory', 'union')),
  flag_emoji text null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint geo_countries_country_code_upper check (country_code = upper(country_code))
);

alter table public.geo_countries enable row level security;

create table if not exists public.geo_regions (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.geo_countries(id) on delete cascade,
  slug text not null,
  name text not null,
  normalized_name text not null,
  code text null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint geo_regions_country_slug_unique unique (country_id, slug),
  constraint geo_regions_country_normalized_name_unique unique (country_id, normalized_name)
);

alter table public.geo_regions enable row level security;

create table if not exists public.geo_localities (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.geo_regions(id) on delete cascade,
  slug text not null,
  name text not null,
  normalized_name text not null,
  code text null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint geo_localities_region_slug_unique unique (region_id, slug),
  constraint geo_localities_region_normalized_name_unique unique (region_id, normalized_name)
);

alter table public.geo_localities enable row level security;

create index if not exists geo_zones_parent_sort_idx
  on public.geo_zones (parent_zone_id, sort_order, name);

create index if not exists geo_countries_zone_sort_idx
  on public.geo_countries (zone_id, sort_order, name);

create index if not exists geo_regions_country_sort_idx
  on public.geo_regions (country_id, sort_order, name);

create index if not exists geo_localities_region_sort_idx
  on public.geo_localities (region_id, sort_order, name);

grant select on public.geo_zones to anon;
grant select on public.geo_zones to authenticated;
grant select on public.geo_countries to anon;
grant select on public.geo_countries to authenticated;
grant select on public.geo_regions to anon;
grant select on public.geo_regions to authenticated;
grant select on public.geo_localities to anon;
grant select on public.geo_localities to authenticated;

drop policy if exists "geo_zones_public_read" on public.geo_zones;
create policy "geo_zones_public_read"
on public.geo_zones
as permissive
for select
to public
using (is_active = true);

drop policy if exists "geo_countries_public_read" on public.geo_countries;
create policy "geo_countries_public_read"
on public.geo_countries
as permissive
for select
to public
using (is_active = true);

drop policy if exists "geo_regions_public_read" on public.geo_regions;
create policy "geo_regions_public_read"
on public.geo_regions
as permissive
for select
to public
using (is_active = true);

drop policy if exists "geo_localities_public_read" on public.geo_localities;
create policy "geo_localities_public_read"
on public.geo_localities
as permissive
for select
to public
using (is_active = true);

insert into public.geo_zones (slug, name, kind, description, sort_order)
values
  ('europe', 'Europe', 'continent', 'European markets and territories currently covered by RadarPulse sources.', 10),
  ('north-america', 'North America', 'continent', 'North American markets currently covered by RadarPulse sources.', 20)
on conflict (slug) do update
set
  name = excluded.name,
  kind = excluded.kind,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true;

with seeded_countries as (
  select
    z.id as zone_id,
    v.country_code,
    v.slug,
    v.name,
    v.territory_kind,
    v.flag_emoji,
    v.sort_order
  from (
    values
      ('europe', 'EU', 'eu', 'European Union', 'union', '🇪🇺', 5),
      ('europe', 'IT', 'it', 'Italy', 'country', '🇮🇹', 10),
      ('europe', 'GB', 'gb', 'United Kingdom', 'country', '🇬🇧', 20),
      ('north-america', 'US', 'us', 'United States', 'country', '🇺🇸', 10)
  ) as v(zone_slug, country_code, slug, name, territory_kind, flag_emoji, sort_order)
  join public.geo_zones z on z.slug = v.zone_slug
)
insert into public.geo_countries (zone_id, country_code, slug, name, territory_kind, flag_emoji, sort_order)
select zone_id, country_code, slug, name, territory_kind, flag_emoji, sort_order
from seeded_countries
on conflict (country_code) do update
set
  zone_id = excluded.zone_id,
  slug = excluded.slug,
  name = excluded.name,
  territory_kind = excluded.territory_kind,
  flag_emoji = excluded.flag_emoji,
  sort_order = excluded.sort_order,
  is_active = true;

with italy_country as (
  select id
  from public.geo_countries
  where country_code = 'IT'
)
insert into public.geo_regions (country_id, slug, name, normalized_name, sort_order)
select
  italy_country.id,
  v.slug,
  v.name,
  v.normalized_name,
  v.sort_order
from italy_country
cross join (
  values
    ('abruzzo', 'Abruzzo', 'abruzzo', 10),
    ('basilicata', 'Basilicata', 'basilicata', 20),
    ('calabria', 'Calabria', 'calabria', 30),
    ('campania', 'Campania', 'campania', 40),
    ('emilia-romagna', 'Emilia-Romagna', 'emilia romagna', 50),
    ('friuli-venezia-giulia', 'Friuli-Venezia Giulia', 'friuli venezia giulia', 60),
    ('lazio', 'Lazio', 'lazio', 70),
    ('liguria', 'Liguria', 'liguria', 80),
    ('lombardia', 'Lombardia', 'lombardia', 90),
    ('marche', 'Marche', 'marche', 100),
    ('molise', 'Molise', 'molise', 110),
    ('piemonte', 'Piemonte', 'piemonte', 120),
    ('puglia', 'Puglia', 'puglia', 130),
    ('sardegna', 'Sardegna', 'sardegna', 140),
    ('sicilia', 'Sicilia', 'sicilia', 150),
    ('toscana', 'Toscana', 'toscana', 160),
    ('trentino-alto-adige', 'Trentino-Alto Adige', 'trentino alto adige', 170),
    ('umbria', 'Umbria', 'umbria', 180),
    ('valle-d-aosta', 'Valle d’Aosta', 'valle d aosta', 190),
    ('veneto', 'Veneto', 'veneto', 200)
) as v(slug, name, normalized_name, sort_order)
on conflict (country_id, slug) do update
set
  name = excluded.name,
  normalized_name = excluded.normalized_name,
  sort_order = excluded.sort_order,
  is_active = true;

comment on table public.geo_zones is 'Hierarchical geographic navigation zones (continent, subcontinent, or commercial market zone).';
comment on table public.geo_countries is 'Countries or territories used as first-class navigation nodes.';
comment on table public.geo_regions is 'Country-scoped regional navigation nodes.';
comment on table public.geo_localities is 'Region-scoped localities/comuni navigation nodes.';
