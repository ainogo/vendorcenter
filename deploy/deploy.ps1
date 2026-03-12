param(
  [string]$EnvFile = ".env.production"
)

if (-not (Test-Path $EnvFile)) {
  Write-Error "$EnvFile not found. Copy .env.production.example to .env.production and fill secrets."
  exit 1
}

./deploy/preflight.ps1 -EnvFile $EnvFile
if ($LASTEXITCODE -ne 0) {
  Write-Error "Preflight failed. Deployment aborted."
  exit 1
}

docker compose --env-file $EnvFile -f deploy/docker-compose.prod.yml up -d --build
Write-Output "VendorCenter production stack deployed."
