#!/usr/bin/env bash
set -euo pipefail

KEYWORDS="${SHOPEE_KEYWORDS:-eletronicos,acessorios,moda,casa,beleza,informatica,esporte,celular,cozinha}"
PAGES="${SHOPEE_PAGES:-6}"
LIMIT="${SHOPEE_LIMIT:-3000}"
BATCH_SIZE="${SHOPEE_BATCH_SIZE:-80}"
FEATURED="${SHOPEE_FEATURED:-12}"
OUTPUT_FILE="${SHOPEE_OUTPUT_FILE:-./tmp/shopee_full_sync_$(date +%Y%m%d_%H%M%S).json}"

mkdir -p ./tmp

if [[ -n "${SHOPEE_INPUT_FILE:-}" ]]; then
  echo "[full-sync] usando arquivo de entrada: ${SHOPEE_INPUT_FILE}"
  SHOPEE_LIMIT="${LIMIT}" \
  SHOPEE_BATCH_SIZE="${BATCH_SIZE}" \
  SHOPEE_FEATURED="${FEATURED}" \
  SHOPEE_OUTPUT_FILE="${OUTPUT_FILE}" \
  node scripts/sync-shopee-home.mjs
  exit 0
fi

IFS=',' read -r -a KEYWORD_LIST <<<"${KEYWORDS}"
SECTION_URLS=()

for keyword in "${KEYWORD_LIST[@]}"; do
  kw_trimmed="$(echo "${keyword}" | xargs)"
  if [[ -z "${kw_trimmed}" ]]; then
    continue
  fi
  kw_encoded="$(node -e "console.log(encodeURIComponent(process.argv[1]))" "${kw_trimmed}")"
  for ((page=0; page<PAGES; page++)); do
    SECTION_URLS+=("https://shopee.com.br/search?keyword=${kw_encoded}&page=${page}")
  done
done

SECTION_URLS_CSV="$(IFS=','; echo "${SECTION_URLS[*]}")"

echo "[full-sync] palavras-chave: ${KEYWORDS}"
echo "[full-sync] páginas por palavra: ${PAGES}"
echo "[full-sync] total de URLs-alvo: ${#SECTION_URLS[@]}"
echo "[full-sync] limite de produtos: ${LIMIT}"
echo "[full-sync] batch size: ${BATCH_SIZE}"
echo "[full-sync] arquivo de saída: ${OUTPUT_FILE}"

SHOPEE_SECTION_URLS="${SECTION_URLS_CSV}" \
SHOPEE_LIMIT="${LIMIT}" \
SHOPEE_BATCH_SIZE="${BATCH_SIZE}" \
SHOPEE_FEATURED="${FEATURED}" \
SHOPEE_OUTPUT_FILE="${OUTPUT_FILE}" \
node scripts/sync-shopee-home.mjs
