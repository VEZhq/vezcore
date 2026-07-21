#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${WEBHOOK_URL:-}" ]]; then
  echo "::error::The environment-specific Coolify webhook secret is missing."
  exit 1
fi

if [[ -z "${COOLIFY_API_TOKEN:-}" ]]; then
  echo "::error::The Coolify API token secret is missing."
  exit 1
fi

if [[ "$WEBHOOK_URL" != https://* ]]; then
  echo "::error::The Coolify webhook must use HTTPS."
  exit 1
fi

curl \
  --fail \
  --silent \
  --show-error \
  --request POST \
  --header "Authorization: Bearer $COOLIFY_API_TOKEN" \
  --retry 2 \
  --retry-all-errors \
  --connect-timeout 10 \
  --max-time 45 \
  "$WEBHOOK_URL" >/dev/null
