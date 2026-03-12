param(
  [string]$EnvFile = ".env.production",
  [string]$OutputDir = "./deploy/backups"
)

if (-not (Test-Path $EnvFile)) {
  Write-Error "$EnvFile not found."
  exit 1
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outfile = Join-Path $OutputDir "vendorcenter-db-$timestamp.sql"

$envData = Get-Content $EnvFile | Where-Object { $_ -match "=" -and $_ -notmatch "^#" }
foreach ($line in $envData) {
  $parts = $line -split "=", 2
  [System.Environment]::SetEnvironmentVariable($parts[0], $parts[1], "Process")
}

docker compose --env-file $EnvFile -f deploy/docker-compose.prod.yml exec -T postgres sh -c "pg_dump -U $env:DB_USER -d $env:DB_NAME" > $outfile
Write-Output "Backup created: $outfile"
