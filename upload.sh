#!/usr/bin/env bash
set -euo pipefail

source .env

# Strip trailing slash defensively
PIM_HOST="${PIM_HOST%/}"

# Step 1 — Fetch a fresh API token
echo "Fetching API token..."
token_response=$(curl -s -X POST "$PIM_HOST/api/oauth/v1/token" \
  -H "Content-Type: application/json" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "{\"grant_type\":\"password\",\"username\":\"$PIM_USERNAME\",\"password\":\"$PIM_PASSWORD\"}")
API_TOKEN=$(echo "$token_response" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p' || true)
if [ -z "$API_TOKEN" ]; then
  echo "ERROR: Failed to fetch API token. PIM response: $token_response"
  exit 1
fi

# Step 2 — Upload or update
if [ -z "${EXTENSION_UUID:-}" ]; then
  echo "Creating extension..."
  result=$(curl -s -X POST "$PIM_HOST/api/rest/v1/ui-extensions" \
    -H "Authorization: Bearer $API_TOKEN" \
    -F "name=marketing_costs_saved" \
    -F "type=sdk_script" \
    -F "position=pim.activity.navigation.tab" \
    -F "file=@dist/marketing-costs-saved.js" \
    -F "configuration[default_label]=Marketing Costs Saved")
  EXTENSION_UUID=$(echo "$result" | sed -n 's/.*"uuid":"\([^"]*\)".*/\1/p' || true)
  if [ -z "$EXTENSION_UUID" ]; then
    echo "ERROR: Upload failed. PIM response: $result"
    exit 1
  fi
  sed -i.bak "s|^EXTENSION_UUID=.*|EXTENSION_UUID=$EXTENSION_UUID|" .env && rm -f .env.bak
  echo "SUCCESS: Extension created. UUID=$EXTENSION_UUID"
else
  echo "Updating extension $EXTENSION_UUID..."
  result=$(curl -s -X POST "$PIM_HOST/api/rest/v1/ui-extensions/$EXTENSION_UUID" \
    -H "Authorization: Bearer $API_TOKEN" \
    -F "name=marketing_costs_saved" \
    -F "type=sdk_script" \
    -F "position=pim.activity.navigation.tab" \
    -F "file=@dist/marketing-costs-saved.js" \
    -F "configuration[default_label]=Marketing Costs Saved")
  if echo "$result" | grep -q '"code":[45]'; then
    echo "ERROR: Update failed. PIM response: $result"
    exit 1
  fi
  echo "SUCCESS: Extension updated. UUID=$EXTENSION_UUID"
fi
