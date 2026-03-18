# DB diff summary

- Generated (UTC): `2026-03-18 13:53:37Z`
- Schemas: `public`

This file summarizes changes detected between the previous and current `schema_snapshot.sql`.

## Added

- (none)

## Removed

- (none)

## Modified

- FUNCTION public.rp_normalize_geo_text
- INDEX geo_countries_zone_sort_idx
- INDEX geo_localities_region_sort_idx
- INDEX geo_regions_country_sort_idx
- INDEX geo_zones_parent_sort_idx
- INDEX opportunity_extractions_geo_country_current_idx
- INDEX opportunity_extractions_geo_locality_current_idx
- INDEX opportunity_extractions_geo_region_current_idx
- POLICY "Authenticated
- POLICY "Users
- POLICY geo_countries_public_read
- POLICY geo_localities_public_read
- POLICY geo_regions_public_read
- POLICY geo_zones_public_read
- TABLE public.geo_countries
- TABLE public.geo_localities
- TABLE public.geo_regions
- TABLE public.geo_zones
- TABLE public.opportunity_ai
- TABLE public.opportunity_extractions
- VIEW public.opportunities_geo_scope_v1

## Notes

- This is a heuristic summary derived from `diff -u` of pg_dump schema output.
- For exact details, inspect `docs/db/schema_snapshot.sql` changes in Git history.

