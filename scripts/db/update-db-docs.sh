#!/usr/bin/env bash
set -euo pipefail

# RadarPulse - DB docs automation
# Generates:
# - docs/db/schema_snapshot.sql
# - docs/db/SCHEMA_CANONIQUE.md
#
# Requirements:
# - docker
# - env DATABASE_URL (Postgres connection string)
#
# Optional env:
# - SCHEMAS (comma-separated), default: "public"
#   Example: SCHEMAS="public,storage,auth"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f "$ROOT_DIR/package.json" ]]; then
  echo "ERROR: package.json not found at repo root. Run from RadarPulse repo root." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker not found. Install Docker and ensure it is available in PATH." >&2
  exit 1
fi

: "${DATABASE_URL:?ERROR: DATABASE_URL is required (Postgres connection string).}"

SCHEMAS="${SCHEMAS:-public}"

DOCS_DIR="$ROOT_DIR/docs/db"
mkdir -p "$DOCS_DIR"

SNAP_OUT="$DOCS_DIR/schema_snapshot.sql"
MD_OUT="$DOCS_DIR/SCHEMA_CANONIQUE.md"

TMPDIR="$(mktemp -d)"
cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

tmp_sql="$TMPDIR/schema_snapshot.sql"
tmp_md="$TMPDIR/SCHEMA_CANONIQUE.md"

echo "== RadarPulse DB docs =="
echo "Repo: $ROOT_DIR"
echo "Schemas: $SCHEMAS"
echo

# --------------------------
# 1) Schema snapshot (DDL)
# --------------------------
# We use official postgres image to run pg_dump (no local pg tools needed).
# We keep output deterministic-ish: no owner/privileges/comments.
# We pass multiple --schema flags.
schema_args=()
IFS=',' read -r -a schema_list <<< "$SCHEMAS"
for s in "${schema_list[@]}"; do
  s_trim="$(echo "$s" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  if [[ -n "$s_trim" ]]; then
    schema_args+=( "--schema=$s_trim" )
  fi
done

echo "[1/2] Generating schema snapshot -> $SNAP_OUT"
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  postgres:17-alpine \
  sh -lc '
    set -e
    pg_dump "$DATABASE_URL" \
      --schema-only \
      --no-owner \
      --no-privileges \
      --no-comments \
      --no-security-labels \
      '"${schema_args[*]}"'
  ' \
  | sed -e 's/\r$//' > "$tmp_sql"

# Only replace if changed (avoid noisy commits)
if [[ -f "$SNAP_OUT" ]] && cmp -s "$tmp_sql" "$SNAP_OUT"; then
  echo "No changes in schema_snapshot.sql"
else
  mv "$tmp_sql" "$SNAP_OUT"
  echo "Updated schema_snapshot.sql"
fi
echo

# --------------------------
# 2) Canonical Markdown view
# --------------------------
echo "[2/2] Generating canonical view -> $MD_OUT"
if [[ ! -f "$ROOT_DIR/scripts/db/schema_doc.sql" ]]; then
  echo "ERROR: scripts/db/schema_doc.sql not found." >&2
  exit 1
fi

docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  -v "$ROOT_DIR:/work" \
  -w /work \
  postgres:17-alpine \
  sh -lc '
    set -e
    psql "$DATABASE_URL" \
      -v ON_ERROR_STOP=1 \
      -v schemas="'"$SCHEMAS"'" \
      -f /work/scripts/db/schema_doc.sql
  ' \
  | sed -e 's/\r$//' > "$tmp_md"

if [[ -f "$MD_OUT" ]] && cmp -s "$tmp_md" "$MD_OUT"; then
  echo "No changes in SCHEMA_CANONIQUE.md"
else
  mv "$tmp_md" "$MD_OUT"
  echo "Updated SCHEMA_CANONIQUE.md"
fi

echo
echo "Done."
echo "Files:"
echo " - $SNAP_OUT"
echo " - $MD_OUT"
