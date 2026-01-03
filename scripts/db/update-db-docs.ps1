# RadarPulse - DB docs automation (PowerShell)
# Generates:
# - docs/db/schema_snapshot.sql
# - docs/db/SCHEMA_CANONIQUE.md
#
# Requirements:
# - Docker Desktop running (linux engine)
# - env DATABASE_URL (Postgres connection string)
#
# Optional env:
# - SCHEMAS (comma-separated), default: "public"

$ErrorActionPreference = "Stop"

# Robust script directory resolution (works reliably with -File)
$scriptPath = $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($scriptPath) -or -not (Test-Path $scriptPath)) {
  throw "Cannot resolve script path. Run with: powershell -File scripts\db\update-db-docs.ps1"
}
$scriptDir = Split-Path -Parent $scriptPath

# Repo root: scripts\db -> scripts -> repo
$root = (Resolve-Path (Join-Path $scriptDir "..\..")).Path

if (-not (Test-Path (Join-Path $root "package.json"))) {
  throw "package.json not found at repo root: $root"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "docker not found. Install Docker and ensure it is in PATH."
}

$DATABASE_URL = $env:DATABASE_URL
if ([string]::IsNullOrWhiteSpace($DATABASE_URL)) {
  throw "DATABASE_URL is required. Example: `$env:DATABASE_URL = 'postgresql://user:pass@host:5432/db?sslmode=require'"
}

$SCHEMAS = $env:SCHEMAS
if ([string]::IsNullOrWhiteSpace($SCHEMAS)) {
  $SCHEMAS = "public"
}

# Use Postgres 17 client tools to match Supabase server (17.x)
$PG_IMAGE = "postgres:17-alpine"

$docsDir = Join-Path $root "docs\db"
New-Item -ItemType Directory -Path $docsDir -Force | Out-Null

$snapOut = Join-Path $docsDir "schema_snapshot.sql"
$mdOut   = Join-Path $docsDir "SCHEMA_CANONIQUE.md"

$tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ("radarpulse-dbdocs-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null

$tmpSql = Join-Path $tmpDir "schema_snapshot.sql"
$tmpMd  = Join-Path $tmpDir "SCHEMA_CANONIQUE.md"

try {
  Write-Host "== RadarPulse DB docs =="
  Write-Host "Repo: $root"
  Write-Host "Schemas: $SCHEMAS"
  Write-Host "Docker image: $PG_IMAGE"
  Write-Host ""

  # Build pg_dump --schema args
  $schemaArgs = @()
  $SCHEMAS.Split(",") | ForEach-Object {
    $s = $_.Trim()
    if ($s) { $schemaArgs += "--schema=$s" }
  }

  # --------------------------
  # 1) Schema snapshot (pg_dump in Docker)
  # --------------------------
  Write-Host "[1/2] Generating schema snapshot -> $snapOut"

  $dumpCmd = @(
    "sh", "-lc",
    ("set -e; pg_dump `"$DATABASE_URL`" --schema-only --no-owner --no-privileges --no-comments --no-security-labels " + ($schemaArgs -join " "))
  )

  $dump = docker run --rm -e "DATABASE_URL=$DATABASE_URL" $PG_IMAGE @dumpCmd
  if ($LASTEXITCODE -ne 0) {
    throw "pg_dump failed. Check DATABASE_URL / credentials / network / sslmode, or server/client version mismatch."
  }

  $dump = $dump -replace "`r",""
  Set-Content -Path $tmpSql -Value $dump -Encoding UTF8

  if ((Test-Path $snapOut) -and ((Get-FileHash $tmpSql).Hash -eq (Get-FileHash $snapOut).Hash)) {
    Write-Host "No changes in schema_snapshot.sql"
  } else {
    Move-Item -Force $tmpSql $snapOut
    Write-Host "Updated schema_snapshot.sql"
  }

  Write-Host ""

  # --------------------------
  # 2) Canonical Markdown view (psql in Docker)
  # --------------------------
  $schemaDocSql = Join-Path $root "scripts\db\schema_doc.sql"
  if (-not (Test-Path $schemaDocSql)) {
    throw "scripts/db/schema_doc.sql not found at: $schemaDocSql"
  }

  Write-Host "[2/2] Generating canonical view -> $mdOut"

  $psqlCmd = @(
    "sh", "-lc",
    ("set -e; psql `"$DATABASE_URL`" -v ON_ERROR_STOP=1 -v schemas=`"$SCHEMAS`" -f /work/scripts/db/schema_doc.sql")
  )

  $md = docker run --rm `
    -e "DATABASE_URL=$DATABASE_URL" `
    -v "${root}:/work" `
    -w /work `
    $PG_IMAGE `
    @psqlCmd

  if ($LASTEXITCODE -ne 0) {
    throw "psql failed. Check DATABASE_URL / credentials / network / permissions."
  }

  $md = $md -replace "`r",""
  Set-Content -Path $tmpMd -Value $md -Encoding UTF8

  if ((Test-Path $mdOut) -and ((Get-FileHash $tmpMd).Hash -eq (Get-FileHash $mdOut).Hash)) {
    Write-Host "No changes in SCHEMA_CANONIQUE.md"
  } else {
    Move-Item -Force $tmpMd $mdOut
    Write-Host "Updated SCHEMA_CANONIQUE.md"
  }

  Write-Host ""
  Write-Host "Done."
  Write-Host "Files:"
  Write-Host " - $snapOut"
  Write-Host " - $mdOut"
}
finally {
  if (Test-Path $tmpDir) { Remove-Item -Recurse -Force $tmpDir }
}
