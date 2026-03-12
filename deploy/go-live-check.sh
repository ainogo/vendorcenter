#!/usr/bin/env sh
set -eu

ENV_FILE="${1:-.env.production}"
EXPECTED_IP="${2:-}"
DOMAIN="${3:-vendorcenter.in}"
failed=0

echo "VendorCenter go-live precheck"

sh ./deploy/preflight.sh "$ENV_FILE" "$EXPECTED_IP" || failed=1

for url in "https://$DOMAIN" "https://$DOMAIN/health"; do
  code="$(curl -sS -o /dev/null -w "%{http_code}" "$url" || true)"
  if [ -n "$code" ] && [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
    echo "[OK] $url => $code"
  else
    echo "[FAIL] $url => ${code:-unreachable}"
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  echo "Go-live check failed"
  exit 1
fi

echo "Go-live check passed"
