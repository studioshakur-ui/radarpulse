# RadarPulse Full Deployment Script
# Run from project root in Windows PowerShell

Write-Host "RadarPulse - Full Deployment" -ForegroundColor Cyan
Write-Host ""

# Step 1: Upload Edge Function secrets from .env
# FIX: SB_URL + SERVICE_ROLE_KEY must be uploaded or the functions fail with "Invalid API key"
Write-Host "Step 1: Uploading Edge Function secrets..." -ForegroundColor Yellow
supabase secrets set --env-file ./supabase/functions/.env
if ($LASTEXITCODE -ne 0) {
    Write-Host "Secrets upload failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Secrets uploaded" -ForegroundColor Green
Write-Host ""

# Step 2: Push database migrations
Write-Host "Step 2: Deploying database migrations..." -ForegroundColor Yellow
supabase db push
if ($LASTEXITCODE -ne 0) {
    Write-Host "Migration failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Migrations deployed" -ForegroundColor Green
Write-Host ""

# Step 3: Deploy public Edge Functions (no JWT required - callers have no session yet)
Write-Host "Step 3: Deploying public Edge Functions..." -ForegroundColor Yellow
supabase functions deploy create-magic-link --no-verify-jwt
supabase functions deploy verify-magic-link --no-verify-jwt
supabase functions deploy submit-access-request --no-verify-jwt
supabase functions deploy notify-email --no-verify-jwt
if ($LASTEXITCODE -ne 0) {
    Write-Host "Function deployment failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Public functions deployed" -ForegroundColor Green
Write-Host ""

# Step 4: Deploy authenticated Edge Functions
Write-Host "Step 4: Deploying authenticated Edge Functions..." -ForegroundColor Yellow
supabase functions deploy opportunities-search
if ($LASTEXITCODE -ne 0) {
    Write-Host "Function deployment failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Authenticated functions deployed" -ForegroundColor Green
Write-Host ""

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Refresh the landing page"
Write-Host "2. Fill out the request form"
Write-Host "3. Check your email for the magic link"
Write-Host "4. Click the link to activate your account"
