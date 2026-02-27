param(
  [Parameter(Mandatory = $true)]
  [string]$SupabaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$AnonKey,

  [Parameter(Mandatory = $false)]
  [string]$JwtToken = ""
)

$headers = @{
  "apikey" = $AnonKey
  "Content-Type" = "application/json"
}

if ($JwtToken -ne "") {
  $headers["Authorization"] = "Bearer $JwtToken"
}

Write-Host "Calling dispatcher..."
$dispatcher = Invoke-RestMethod -Method Post -Uri "$SupabaseUrl/functions/v1/dispatcher" -Headers $headers -Body "{}"
$dispatcher | ConvertTo-Json -Depth 6

Write-Host "Calling worker..."
$worker = Invoke-RestMethod -Method Post -Uri "$SupabaseUrl/functions/v1/worker" -Headers $headers -Body '{"max_jobs":1}'
$worker | ConvertTo-Json -Depth 6
