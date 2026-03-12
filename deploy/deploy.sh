#!/usr/bin/env sh
set -eu

ENV_FILE="${1:-.env.production}"

if [ ! -f "$ENV_FILE" ]; then
  echo "$ENV_FILE not found. Copy .env.production.example to .env.production and fill secrets."
  exit 1
fi

sh ./deploy/preflight.sh "$ENV_FILE"

docker compose --env-file "$ENV_FILE" -f deploy/docker-compose.prod.yml up -d --build
echo "VendorCenter production stack deployed."
