#!/usr/bin/env sh
set -eu

ENV_FILE="${1:-.env.production}"
EXPECTED_IP="${2:-}"
errors=""

if ! command -v docker >/dev/null 2>&1; then
  errors="$errors\n- Docker CLI not found"
fi

if [ -z "$errors" ] && [ -n "$EXPECTED_IP" ]; then
  for domain in vendorcenter.in www.vendorcenter.in; do
    if command -v getent >/dev/null 2>&1; then
      resolved_ips="$(getent ahostsv4 "$domain" | awk '{print $1}' | sort -u | tr '\n' ' ')"
      if ! printf '%s' "$resolved_ips" | grep -q "$EXPECTED_IP"; then
        errors="$errors\n- DNS mismatch for $domain. Expected $EXPECTED_IP but got: $resolved_ips"
      fi
    else
      errors="$errors\n- getent not found; cannot perform DNS check for $domain"
    fi
  done
fi

if [ ! -f "$ENV_FILE" ]; then
  errors="$errors\n- $ENV_FILE not found"
else
  for key in DB_NAME DB_USER DB_PASSWORD JWT_ACCESS_SECRET JWT_REFRESH_SECRET; do
    if ! grep -q "^${key}=" "$ENV_FILE"; then
      errors="$errors\n- Missing ${key} in $ENV_FILE"
    fi
  done
fi

echo "Preflight checks for VendorCenter production"
if [ -n "$errors" ]; then
  printf "%b\n" "$errors"
  exit 1
fi

echo "All required checks passed"
