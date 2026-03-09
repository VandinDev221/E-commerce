#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:3001/api}"
EMAIL="${SMOKE_EMAIL:-admin@ecommerce.com}"
PASSWORD="${SMOKE_PASSWORD:-admin123}"

echo "[smoke] API_URL=$API_URL"

HEALTH="$(curl -fsS "$API_URL/health")"
echo "[smoke] health ok"

TOKEN="$(
  curl -fsS -X POST "$API_URL/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);if(!o.accessToken) process.exit(1);console.log(o.accessToken);})"
)"
echo "[smoke] login ok"

PRODUCTS="$(curl -fsS "$API_URL/products?limit=1")"
PRODUCT_ID="$(
  printf '%s' "$PRODUCTS" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const i=JSON.parse(s).items?.[0];if(!i?.id) process.exit(1);console.log(i.id);})"
)"
echo "[smoke] products ok"

ORDER_RESPONSE="$(
  curl -fsS -X POST "$API_URL/orders" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"items\":[{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}],\"shippingStreet\":\"Rua Teste, 100\",\"shippingCity\":\"Sao Paulo\",\"shippingState\":\"SP\",\"shippingZip\":\"01001000\",\"paymentMethod\":\"PIX\",\"shippingCost\":0}"
)"
printf '%s' "$ORDER_RESPONSE" \
| node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);if(!o.id||!o.total) process.exit(1);console.log('[smoke] order ok: '+o.id);})"

echo "[smoke] PASS"
