param(
  [string]$EnvFile = ".env.production",
  [string]$ExpectedIp = "",
  [string]$Domain = "vendorcenter.in"
)

$failed = $false
Write-Output "VendorCenter go-live precheck"

# 1) Base preflight
./deploy/preflight.ps1 -EnvFile $EnvFile -ExpectedIp $ExpectedIp
if ($LASTEXITCODE -ne 0) {
  $failed = $true
}

# 2) Domain HTTPS health checks
foreach ($url in @("https://$Domain", "https://$Domain/health")) {
  try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) {
      Write-Output "[OK] $url => $($resp.StatusCode)"
    } else {
      Write-Output "[FAIL] $url => $($resp.StatusCode)"
      $failed = $true
    }
  } catch {
    Write-Output "[FAIL] $url => $($_.Exception.Message)"
    $failed = $true
  }
}

if ($failed) {
  Write-Output "Go-live check failed"
  exit 1
}

Write-Output "Go-live check passed"
