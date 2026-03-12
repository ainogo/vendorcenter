param(
  [Parameter(Mandatory=$true)][string]$DbUser,
  [Parameter(Mandatory=$true)][string]$DbPassword,
  [string]$DbHost = "localhost",
  [string]$DbPort = "5432",
  [string]$DbName = "vendorcenter"
)

function Set-Or-ReplaceKey([string]$filePath, [string]$key, [string]$value) {
  if (-not (Test-Path $filePath)) {
    return
  }

  $content = Get-Content $filePath
  $pattern = "^$key="
  $found = $false
  for ($i = 0; $i -lt $content.Count; $i++) {
    if ($content[$i] -match $pattern) {
      $content[$i] = "$key=$value"
      $found = $true
    }
  }

  if (-not $found) {
    $content += "$key=$value"
  }

  Set-Content -Path $filePath -Value $content
}

$targets = @(".env.example", "backend/.env.example", ".env.production")
foreach ($target in $targets) {
  Set-Or-ReplaceKey $target "DB_HOST" $DbHost
  Set-Or-ReplaceKey $target "DB_PORT" $DbPort
  Set-Or-ReplaceKey $target "DB_NAME" $DbName
  Set-Or-ReplaceKey $target "DB_USER" $DbUser
  Set-Or-ReplaceKey $target "DB_PASSWORD" $DbPassword
}

Write-Output "DB credentials synced in env files where present."
