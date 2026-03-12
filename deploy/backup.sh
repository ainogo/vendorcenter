#!/usr/bin/env sh
set -eu

ENV_FILE="${1:-.env.production}"
OUT_DIR="${2:-./deploy/backups}"

if [ ! -f "$ENV_FILE" ]; then
  echo "$ENV_FILE not found."
  exit 1
fi

mkdir -p "$OUT_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
OUTFILE="$OUT_DIR/vendorcenter-db-$TS.sql"

set -a
. "$ENV_FILE"
set +a

docker compose --env-file "$ENV_FILE" -f deploy/docker-compose.prod.yml exec -T postgres sh -c "pg_dump -U $DB_USER -d $DB_NAME" > "$OUTFILE"
echo "Backup created: $OUTFILE"
