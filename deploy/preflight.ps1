param(
  [string]$EnvFile = ".env.production",
  [string]$ExpectedIp = ""
)

$errors = @()

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  $errors += "Docker CLI not found"
}

if (-not (Test-Path $EnvFile)) {
  $errors += "$EnvFile not found"
}

if ($errors.Count -eq 0) {
  $required = @("DB_NAME", "DB_USER", "DB_PASSWORD", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET")
  $content = Get-Content $EnvFile
  foreach ($key in $required) {
    if (-not ($content | Where-Object { $_ -match "^$key=" })) {
      $errors += "Missing $key in $EnvFile"
    }
  }
}

if ($errors.Count -eq 0 -and $ExpectedIp) {
  foreach ($domain in @("vendorcenter.in", "www.vendorcenter.in")) {
    try {
      $records = Resolve-DnsName -Name $domain -Type A -ErrorAction Stop
      $ips = $records | Select-Object -ExpandProperty IPAddress
      if (-not ($ips -contains $ExpectedIp)) {
        $errors += "DNS mismatch for $domain. Expected $ExpectedIp but got: $($ips -join ', ')"
      }
    } catch {
      $errors += "DNS lookup failed for $domain"
    }
  }
}

Write-Output "Preflight checks for VendorCenter production"
if ($errors.Count -gt 0) {
  $errors | ForEach-Object { Write-Output "- $_" }
  exit 1
}

Write-Output "All required checks passed"
