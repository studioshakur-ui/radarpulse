#!/usr/bin/env bash
set -euo pipefail

# RadarPulse - DB docs automation
# Generates:
# - docs/db/schema_snapshot.sql
# - docs/db/SCHEMA_CANONIQUE.md
# - docs/db/DB_DIFF.md (only when schema_snapshot changes)
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
DIFF_OUT="$DOCS_DIR/DB_DIFF.md"

TMPDIR="$(mktemp -d)"
cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

tmp_sql="$TMPDIR/schema_snapshot.sql"
tmp_md="$TMPDIR/SCHEMA_CANONIQUE.md"
tmp_diff="$TMPDIR/schema_snapshot.diff"
tmp_diff_md="$TMPDIR/DB_DIFF.md"

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

schema_changed="0"
if [[ -f "$SNAP_OUT" ]] && cmp -s "$tmp_sql" "$SNAP_OUT"; then
  echo "No changes in schema_snapshot.sql"
else
  # Produce a unified diff BEFORE replacing
  if [[ -f "$SNAP_OUT" ]]; then
    diff -u "$SNAP_OUT" "$tmp_sql" > "$tmp_diff" || true
  else
    # First snapshot: still create a diff-like marker
    {
      echo "--- /dev/null"
      echo "+++ $SNAP_OUT"
      echo "@@"
      echo "+(initial snapshot)"
    } > "$tmp_diff"
  fi

  mv "$tmp_sql" "$SNAP_OUT"
  echo "Updated schema_snapshot.sql"
  schema_changed="1"
fi
echo

# --------------------------
# 1bis) DB Diff Summary (Markdown)
# --------------------------
# Only update DB_DIFF.md when schema snapshot changed, to avoid noisy commits.
if [[ "$schema_changed" == "1" ]]; then
  now_utc="$(date -u +"%Y-%m-%d %H:%M:%SZ")"

  {
    echo "# DB diff summary"
    echo
    echo "- Generated (UTC): \`$now_utc\`"
    echo "- Schemas: \`$SCHEMAS\`"
    echo
    echo "This file summarizes changes detected between the previous and current \`schema_snapshot.sql\`."
    echo

    # If it's the first snapshot, keep it simple.
    if grep -q "initial snapshot" "$tmp_diff" 2>/dev/null; then
      echo "## Initial snapshot"
      echo
      echo "A baseline schema snapshot was created."
      echo
    else
      # Parse unified diff and extract added/removed/modified objects.
      # Heuristics:
      # - Added/Removed: +/- lines containing CREATE <KIND> <NAME>
      # - Modified: any +/- line inside a hunk, attributed to the nearest CREATE <KIND> <NAME> context line.
      # Supported kinds: TABLE, VIEW, MATERIALIZED VIEW, FUNCTION, TYPE, POLICY, TRIGGER, INDEX, SEQUENCE
      awk '
      function norm_kind(k) {
        if (k == "MATERIALIZED") return "MATERIALIZED VIEW";
        return k;
      }
      function add_unique(map, key) { map[key]=1; }
      function in_map(map, key) { return (key in map); }

      BEGIN { obj=""; }

      # Track context object for hunks
      /^@@/ { obj=""; next; }

      # Context lines that define current object (CREATE ...)
      /^[ +\-]CREATE[[:space:]]+(MATERIALIZED[[:space:]]+VIEW|TABLE|VIEW|FUNCTION|TYPE|POLICY|TRIGGER|INDEX|SEQUENCE)[[:space:]]+/ {
        line=$0
        sub(/^[ +\-]/,"",line)

        kind=""
        name=""

        if (match(line, /^CREATE[[:space:]]+MATERIALIZED[[:space:]]+VIEW[[:space:]]+([^[:space:](;]+)/, m)) {
          kind="MATERIALIZED VIEW"; name=m[1];
        } else if (match(line, /^CREATE[[:space:]]+(TABLE|VIEW|FUNCTION|TYPE|POLICY|TRIGGER|INDEX|SEQUENCE)[[:space:]]+([^[:space:](;]+)/, m2)) {
          kind=m2[1]; name=m2[2];
        }

        if (kind != "" && name != "") obj = kind " " name;
        next;
      }

      # Added CREATE lines
      /^\+[^\+].*CREATE[[:space:]]+(MATERIALIZED[[:space:]]+VIEW|TABLE|VIEW|FUNCTION|TYPE|POLICY|TRIGGER|INDEX|SEQUENCE)[[:space:]]+/ {
        line=$0
        sub(/^\+/,"",line)
        kind=""; name=""
        if (match(line, /^CREATE[[:space:]]+MATERIALIZED[[:space:]]+VIEW[[:space:]]+([^[:space:](;]+)/, a)) {
          kind="MATERIALIZED VIEW"; name=a[1];
        } else if (match(line, /^CREATE[[:space:]]+(TABLE|VIEW|FUNCTION|TYPE|POLICY|TRIGGER|INDEX|SEQUENCE)[[:space:]]+([^[:space:](;]+)/, a2)) {
          kind=a2[1]; name=a2[2];
        }
        if (kind != "" && name != "") add_unique(added, kind " " name);
        next;
      }

      # Removed CREATE lines
      /^-[^-].*CREATE[[:space:]]+(MATERIALIZED[[:space:]]+VIEW|TABLE|VIEW|FUNCTION|TYPE|POLICY|TRIGGER|INDEX|SEQUENCE)[[:space:]]+/ {
        line=$0
        sub(/^-/, "", line)
        kind=""; name=""
        if (match(line, /^CREATE[[:space:]]+MATERIALIZED[[:space:]]+VIEW[[:space:]]+([^[:space:](;]+)/, r)) {
          kind="MATERIALIZED VIEW"; name=r[1];
        } else if (match(line, /^CREATE[[:space:]]+(TABLE|VIEW|FUNCTION|TYPE|POLICY|TRIGGER|INDEX|SEQUENCE)[[:space:]]+([^[:space:](;]+)/, r2)) {
          kind=r2[1]; name=r2[2];
        }
        if (kind != "" && name != "") add_unique(removed, kind " " name);
        next;
      }

      # Mark modified objects if we see +/- lines within a hunk and we have a context object
      /^[+-]/ {
        if ($0 ~ /^\+\+\+/ || $0 ~ /^---/) next;
        if (obj != "") add_unique(modified, obj);
        next;
      }

      END {
        # Print in 3 sections (prefixed) to be post-processed in shell
        for (k in added)   print "ADDED\t" k;
        for (k in removed) print "REMOVED\t" k;
        for (k in modified) {
          if (!(k in added) && !(k in removed)) print "MODIFIED\t" k;
        }
      }' "$tmp_diff" \
      | sort > "$TMPDIR/parsed.tsv"

      echo "## Added"
      echo
      if grep -q "^ADDED" "$TMPDIR/parsed.tsv"; then
        grep "^ADDED" "$TMPDIR/parsed.tsv" | cut -f2- | sed 's/^/- /'
      else
        echo "- (none)"
      fi
      echo

      echo "## Removed"
      echo
      if grep -q "^REMOVED" "$TMPDIR/parsed.tsv"; then
        grep "^REMOVED" "$TMPDIR/parsed.tsv" | cut -f2- | sed 's/^/- /'
      else
        echo "- (none)"
      fi
      echo

      echo "## Modified"
      echo
      if grep -q "^MODIFIED" "$TMPDIR/parsed.tsv"; then
        grep "^MODIFIED" "$TMPDIR/parsed.tsv" | cut -f2- | sed 's/^/- /'
      else
        echo "- (none)"
      fi
      echo

      echo "## Notes"
      echo
      echo "- This is a heuristic summary derived from \`diff -u\` of pg_dump schema output."
      echo "- For exact details, inspect \`docs/db/schema_snapshot.sql\` changes in Git history."
      echo
    fi
  } > "$tmp_diff_md"

  # Only replace if changed (avoid noisy commits)
  if [[ -f "$DIFF_OUT" ]] && cmp -s "$tmp_diff_md" "$DIFF_OUT"; then
    echo "No changes in DB_DIFF.md"
  else
    mv "$tmp_diff_md" "$DIFF_OUT"
    echo "Updated DB_DIFF.md"
  fi
  echo
fi

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
if [[ "$schema_changed" == "1" ]]; then
  echo " - $DIFF_OUT"
fi
