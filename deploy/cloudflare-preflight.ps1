param(
  [Parameter(Mandatory=$true)][string]$ExpectedIp
)

$checks = @("vendorcenter.in", "www.vendorcenter.in")
$failed = $false

foreach ($domain in $checks) {
  try {
    $records = Resolve-DnsName -Name $domain -Type A -ErrorAction Stop
    $ips = $records | Select-Object -ExpandProperty IPAddress
    if ($ips -contains $ExpectedIp) {
      Write-Output "[OK] $domain resolves to $ExpectedIp"
    } else {
      Write-Output "[FAIL] $domain resolves to: $($ips -join ', ')"
      $failed = $true
    }
  } catch {
    Write-Output "[FAIL] Unable to resolve $domain"
    $failed = $true
  }
}

if ($failed) { exit 1 }
Write-Output "Cloudflare DNS preflight passed."
