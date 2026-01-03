\set ON_ERROR_STOP on

-- RadarPulse — Canonical DB View generator (Markdown)
-- Input:
--   psql -v schemas="public,auth,storage" -f scripts/db/schema_doc.sql
--
-- Output:
--   Markdown to STDOUT

WITH
params AS (
  SELECT
    ARRAY(
      SELECT trim(x)
      FROM unnest(regexp_split_to_array(:'schemas', '\s*,\s*')) AS x
      WHERE trim(x) <> ''
    ) AS schemas
),
target_schemas AS (
  SELECT n.oid AS nsp_oid, n.nspname
  FROM pg_namespace n
  JOIN params p ON n.nspname = ANY(p.schemas)
),
lines AS (

  -- --------------------------
  -- Header
  -- --------------------------
  SELECT 10::int AS k, 0::int AS k2, '# RadarPulse — Vue canonique de la base'::text AS line
  UNION ALL SELECT 11, 0, ''
  UNION ALL SELECT 12, 0, 'Générée automatiquement via `scripts/db/update-db-docs.sh` (Docker + psql/pg_dump).'
  UNION ALL SELECT 13, 0, ''
  UNION ALL SELECT 14, 0, '## Sommaire'
  UNION ALL SELECT 15, 0, '- Schemas'
  UNION ALL SELECT 16, 0, '- Enums'
  UNION ALL SELECT 17, 0, '- Tables'
  UNION ALL SELECT 18, 0, '- Views'
  UNION ALL SELECT 19, 0, '- Functions'
  UNION ALL SELECT 20, 0, ''

  -- --------------------------
  -- Schemas
  -- --------------------------
  UNION ALL SELECT 100, 0, '## Schemas'
  UNION ALL
  SELECT
    101,
    row_number() OVER (ORDER BY ts.nspname),
    format('- `%s`', ts.nspname)
  FROM target_schemas ts
  UNION ALL SELECT 199, 0, ''

  -- --------------------------
  -- Enums
  -- --------------------------
  UNION ALL SELECT 200, 0, '## Enums'
  UNION ALL
  SELECT
    201,
    row_number() OVER (ORDER BY ns.nspname, t.typname),
    format(
      '- `%I.%I` = %s',
      ns.nspname,
      t.typname,
      string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder)
    )
  FROM pg_type t
  JOIN pg_namespace ns ON ns.oid = t.typnamespace
  JOIN target_schemas ts ON ts.nsp_oid = ns.oid
  JOIN pg_enum e ON e.enumtypid = t.oid
  GROUP BY ns.nspname, t.typname
  UNION ALL
  SELECT 202, 0, '_Aucun enum détecté dans les schemas ciblés._'
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace ns ON ns.oid = t.typnamespace
    JOIN target_schemas ts ON ts.nsp_oid = ns.oid
    JOIN pg_enum e ON e.enumtypid = t.oid
  )
  UNION ALL SELECT 299, 0, ''

  -- --------------------------
  -- Tables summary
  -- --------------------------
  UNION ALL SELECT 300, 0, '## Tables'
  UNION ALL SELECT 301, 0, ''
  UNION ALL SELECT 302, 0, '### Résumé'
  UNION ALL
  SELECT
    303,
    row_number() OVER (ORDER BY n.nspname, c.relname),
    format(
      '- `%I.%I` — size: %s — RLS: %s — cols: %s',
      n.nspname,
      c.relname,
      pg_size_pretty(pg_total_relation_size(c.oid)),
      CASE WHEN c.relrowsecurity THEN 'on' ELSE 'off' END,
      (SELECT count(*) FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped)
    )
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN target_schemas ts ON ts.nsp_oid = n.oid
  WHERE c.relkind = 'r'
  UNION ALL
  SELECT 304, 0, '_Aucune table détectée dans les schemas ciblés._'
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN target_schemas ts ON ts.nsp_oid = n.oid
    WHERE c.relkind = 'r'
  )
  UNION ALL SELECT 399, 0, ''

  -- --------------------------
  -- Table details
  -- --------------------------
  UNION ALL SELECT 400, 0, '### Détails par table'
  UNION ALL SELECT 401, 0, ''

  -- For each table: header
  UNION ALL
  SELECT
    410,
    (row_number() OVER (ORDER BY n.nspname, c.relname) * 1000),
    format('#### Table: `%I.%I`', n.nspname, c.relname)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN target_schemas ts ON ts.nsp_oid = n.oid
  WHERE c.relkind = 'r'

  -- For each table: meta lines (RLS + size)
  UNION ALL
  SELECT
    411,
    (row_number() OVER (ORDER BY n.nspname, c.relname) * 1000) + 1,
    format('- **RLS**: `%s`', CASE WHEN c.relrowsecurity THEN 'on' ELSE 'off' END)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN target_schemas ts ON ts.nsp_oid = n.oid
  WHERE c.relkind = 'r'

  UNION ALL
  SELECT
    412,
    (row_number() OVER (ORDER BY n.nspname, c.relname) * 1000) + 2,
    format('- **Size**: `%s`', pg_size_pretty(pg_total_relation_size(c.oid)))
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN target_schemas ts ON ts.nsp_oid = n.oid
  WHERE c.relkind = 'r'

  UNION ALL
  SELECT
    413,
    (row_number() OVER (ORDER BY n.nspname, c.relname) * 1000) + 3,
    ''
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN target_schemas ts ON ts.nsp_oid = n.oid
  WHERE c.relkind = 'r'

  -- Columns markdown header per table
  UNION ALL
  SELECT
    414,
    (row_number() OVER (ORDER BY n.nspname, c.relname) * 1000) + 4,
    '| Column | Type | Nullable | Default |'
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN target_schemas ts ON ts.nsp_oid = n.oid
  WHERE c.relkind = 'r'

  UNION ALL
  SELECT
    415,
    (row_number() OVER (ORDER BY n.nspname, c.relname) * 1000) + 5,
    '|---|---|---|---|'
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN target_schemas ts ON ts.nsp_oid = n.oid
  WHERE c.relkind = 'r'

  -- Column rows per table
  UNION ALL
  SELECT
    416,
    (tbl.rn * 1000) + 10 + cols.ord,
    format(
      '| `%s` | `%s` | `%s` | %s |',
      cols.column_name,
      cols.column_type,
      cols.nullable,
      cols.col_default
    )
  FROM (
    SELECT
      c.oid AS table_oid,
      n.nspname AS schema_name,
      c.relname AS table_name,
      row_number() OVER (ORDER BY n.nspname, c.relname) AS rn
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN target_schemas ts ON ts.nsp_oid = n.oid
    WHERE c.relkind = 'r'
  ) AS tbl
  JOIN LATERAL (
    SELECT
      a.attname AS column_name,
      pg_catalog.format_type(a.atttypid, a.atttypmod) AS column_type,
      CASE WHEN a.attnotnull THEN 'no' ELSE 'yes' END AS nullable,
      COALESCE(pg_get_expr(d.adbin, d.adrelid), '—') AS col_default,
      row_number() OVER (ORDER BY a.attnum) AS ord
    FROM pg_attribute a
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attrelid = tbl.table_oid
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) AS cols ON true

  -- Blank line after columns
  UNION ALL
  SELECT
    417,
    (row_number() OVER (ORDER BY n.nspname, c.relname) * 1000) + 900,
    ''
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN target_schemas ts ON ts.nsp_oid = n.oid
  WHERE c.relkind = 'r'

  -- Indexes header
  UNION ALL
  SELECT
    418,
    (row_number() OVER (ORDER BY n.nspname, c.relname) * 1000) + 910,
    '##### Indexes'
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN target_schemas ts ON ts.nsp_oid = n.oid
  WHERE c.relkind = 'r'

  -- Indexes list
  UNION ALL
  SELECT
    419,
    (tbl.rn * 1000) + 920 + idx.ord,
    format('- `%s`', idx.indexdef)
  FROM (
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      row_number() OVER (ORDER BY n.nspname, c.relname) AS rn
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN target_schemas ts ON ts.nsp_oid = n.oid
    WHERE c.relkind = 'r'
  ) AS tbl
  JOIN LATERAL (
    SELECT
      indexdef,
      row_number() OVER (ORDER BY indexname) AS ord
    FROM pg_indexes
    WHERE schemaname = tbl.schema_name
      AND tablename = tbl.table_name
  ) AS idx ON true

  UNION ALL
  SELECT
    420,
    (tbl.rn * 1000) + 919,
    '- (none)'
  FROM (
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      row_number() OVER (ORDER BY n.nspname, c.relname) AS rn
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN target_schemas ts ON ts.nsp_oid = n.oid
    WHERE c.relkind = 'r'
  ) AS tbl
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_indexes i
    WHERE i.schemaname = tbl.schema_name AND i.tablename = tbl.table_name
  )

  -- Policies header
  UNION ALL
  SELECT
    421,
    (row_number() OVER (ORDER BY n.nspname, c.relname) * 1000) + 940,
    '##### RLS Policies'
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN target_schemas ts ON ts.nsp_oid = n.oid
  WHERE c.relkind = 'r'

  -- Policies list
  UNION ALL
  SELECT
    422,
    (tbl.rn * 1000) + 950 + pol.ord,
    format('- `%s` (cmd: %s, roles: %s)', pol.policyname, pol.cmd, pol.roles)
  FROM (
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      row_number() OVER (ORDER BY n.nspname, c.relname) AS rn
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN target_schemas ts ON ts.nsp_oid = n.oid
    WHERE c.relkind = 'r'
  ) AS tbl
  JOIN LATERAL (
    SELECT
      policyname,
      cmd,
      COALESCE(roles::text, '—') AS roles,
      row_number() OVER (ORDER BY policyname) AS ord
    FROM pg_policies
    WHERE schemaname = tbl.schema_name
      AND tablename = tbl.table_name
  ) AS pol ON true

  UNION ALL
  SELECT
    423,
    (tbl.rn * 1000) + 949,
    '- (none)'
  FROM (
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      row_number() OVER (ORDER BY n.nspname, c.relname) AS rn
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN target_schemas ts ON ts.nsp_oid = n.oid
    WHERE c.relkind = 'r'
  ) AS tbl
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_policies p
    WHERE p.schemaname = tbl.schema_name AND p.tablename = tbl.table_name
  )

  -- Triggers header
  UNION ALL
  SELECT
    424,
    (row_number() OVER (ORDER BY n.nspname, c.relname) * 1000) + 970,
    '##### Triggers'
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN target_schemas ts ON ts.nsp_oid = n.oid
  WHERE c.relkind = 'r'

  -- Triggers list
  UNION ALL
  SELECT
    425,
    (tbl.rn * 1000) + 980 + trg.ord,
    format('- `%s`: %s', trg.tgname, trg.tgdef)
  FROM (
    SELECT
      c.oid AS table_oid,
      n.nspname AS schema_name,
      c.relname AS table_name,
      row_number() OVER (ORDER BY n.nspname, c.relname) AS rn
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN target_schemas ts ON ts.nsp_oid = n.oid
    WHERE c.relkind = 'r'
  ) AS tbl
  JOIN LATERAL (
    SELECT
      t.tgname,
      pg_get_triggerdef(t.oid, true) AS tgdef,
      row_number() OVER (ORDER BY t.tgname) AS ord
    FROM pg_trigger t
    WHERE t.tgrelid = tbl.table_oid
      AND NOT t.tgisinternal
  ) AS trg ON true

  UNION ALL
  SELECT
    426,
    (tbl.rn * 1000) + 979,
    '- (none)'
  FROM (
    SELECT
      c.oid AS table_oid,
      n.nspname AS schema_name,
      c.relname AS table_name,
      row_number() OVER (ORDER BY n.nspname, c.relname) AS rn
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN target_schemas ts ON ts.nsp_oid = n.oid
    WHERE c.relkind = 'r'
  ) AS tbl
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    WHERE t.tgrelid = tbl.table_oid AND NOT t.tgisinternal
  )

  -- Separator blank line per table
  UNION ALL
  SELECT
    427,
    (row_number() OVER (ORDER BY n.nspname, c.relname) * 1000) + 999,
    ''
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN target_schemas ts ON ts.nsp_oid = n.oid
  WHERE c.relkind = 'r'

  UNION ALL SELECT 499, 0, ''

  -- --------------------------
  -- Views (including materialized)
  -- --------------------------
  UNION ALL SELECT 500, 0, '## Views'
  UNION ALL
  SELECT
    501,
    row_number() OVER (ORDER BY n.nspname, c.relname),
    format('- `%I.%I` (%s)', n.nspname, c.relname, CASE WHEN c.relkind = 'm' THEN 'materialized' ELSE 'view' END)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN target_schemas ts ON ts.nsp_oid = n.oid
  WHERE c.relkind IN ('v','m')
  UNION ALL
  SELECT 502, 0, '_Aucune view détectée dans les schemas ciblés._'
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN target_schemas ts ON ts.nsp_oid = n.oid
    WHERE c.relkind IN ('v','m')
  )
  UNION ALL SELECT 599, 0, ''

  -- --------------------------
  -- Functions
  -- --------------------------
  UNION ALL SELECT 600, 0, '## Functions'
  UNION ALL
  SELECT
    601,
    row_number() OVER (ORDER BY ns.nspname, p.proname, pg_get_function_identity_arguments(p.oid)),
    format(
      '- `%I.%I(%s)` → `%s` (lang: %s)',
      ns.nspname,
      p.proname,
      pg_get_function_identity_arguments(p.oid),
      pg_catalog.format_type(p.prorettype, NULL),
      l.lanname
    )
  FROM pg_proc p
  JOIN pg_namespace ns ON ns.oid = p.pronamespace
  JOIN target_schemas ts ON ts.nsp_oid = ns.oid
  JOIN pg_language l ON l.oid = p.prolang
  WHERE p.prokind = 'f'
  UNION ALL
  SELECT 602, 0, '_Aucune fonction détectée dans les schemas ciblés._'
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    JOIN target_schemas ts ON ts.nsp_oid = ns.oid
    WHERE p.prokind = 'f'
  )
)

SELECT line
FROM lines
ORDER BY k, k2;
