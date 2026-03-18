# RadarPulse Full Deployment Script
# Run from project root in Windows PowerShell

Write-Host "RadarPulse - Full Deployment" -ForegroundColor Cyan
Write-Host ""

$publicFunctions = @(
    "create-magic-link",
    "verify-magic-link",
    "submit-access-request",
    "notify-email"
)

$manualAuthFunctions = @(
    "opportunities-search",
    "opportunity-brief",
    "opportunity-score",
    "opportunity-prep",
    "opportunity-decision",
    "opportunity-workflow",
    "stripe-create-checkout"
)

$gatewayProtectedFunctions = @(
    "notify-telegram",
    "notify-whatsapp"
)

function Deploy-Functions {
    param(
        [string[]]$Names,
        [switch]$NoVerifyJwt
    )

    foreach ($name in $Names) {
        Write-Host ("Deploying {0}..." -f $name) -ForegroundColor DarkYellow
        if ($NoVerifyJwt) {
            supabase functions deploy $name --no-verify-jwt
        } else {
            supabase functions deploy $name
        }

        if ($LASTEXITCODE -ne 0) {
            Write-Host ("Deployment failed for {0}!" -f $name) -ForegroundColor Red
            exit 1
        }
    }
}

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
Deploy-Functions -Names $publicFunctions -NoVerifyJwt
Write-Host "Public functions deployed" -ForegroundColor Green
Write-Host ""

# Step 4: Deploy manually authenticated Edge Functions (verify_jwt disabled, auth enforced in code)
Write-Host "Step 4: Deploying manually authenticated Edge Functions..." -ForegroundColor Yellow
Deploy-Functions -Names $manualAuthFunctions -NoVerifyJwt
Write-Host "Manually authenticated functions deployed" -ForegroundColor Green
Write-Host ""

# Step 5: Deploy gateway-protected Edge Functions (still rely on platform JWT verification)
Write-Host "Step 5: Deploying gateway-protected Edge Functions..." -ForegroundColor Yellow
Deploy-Functions -Names $gatewayProtectedFunctions
Write-Host "Gateway-protected functions deployed" -ForegroundColor Green
Write-Host ""

Write-Host "Dashboard note: repo config and this script are the source of truth for verify_jwt." -ForegroundColor Yellow
Write-Host "If the Supabase dashboard shows a conflicting JWT toggle, reset it by redeploying instead of keeping a manual override." -ForegroundColor Yellow
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
