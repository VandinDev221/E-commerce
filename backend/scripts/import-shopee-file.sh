#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Uso: npm run shopee:import-file -- /caminho/arquivo.json"
  exit 1
fi

INPUT_FILE="$1"
if [[ ! -f "${INPUT_FILE}" ]]; then
  echo "[shopee-import-file] arquivo não encontrado: ${INPUT_FILE}"
  exit 1
fi

LIMIT="${SHOPEE_LIMIT:-5000}"
BATCH_SIZE="${SHOPEE_BATCH_SIZE:-80}"
FEATURED="${SHOPEE_FEATURED:-12}"
OUTPUT_FILE="${SHOPEE_OUTPUT_FILE:-./tmp/shopee_import_file_$(date +%Y%m%d_%H%M%S).json}"

mkdir -p ./tmp

echo "[shopee-import-file] input: ${INPUT_FILE}"
echo "[shopee-import-file] limite: ${LIMIT}"
echo "[shopee-import-file] batch: ${BATCH_SIZE}"
echo "[shopee-import-file] destaque: ${FEATURED}"

SHOPEE_INPUT_FILE="${INPUT_FILE}" \
SHOPEE_LIMIT="${LIMIT}" \
SHOPEE_BATCH_SIZE="${BATCH_SIZE}" \
SHOPEE_FEATURED="${FEATURED}" \
SHOPEE_OUTPUT_FILE="${OUTPUT_FILE}" \
npm run shopee:full-sync
