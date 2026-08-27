#!/usr/bin/env bash
set -euo pipefail

HOST="${1:-https://spark.aem.media}"
# Strip trailing slash
HOST="${HOST%/}"

URLS=(
  "/rendition/preview1/png/content/dam/acme/products/ma/brand-a/brand-a-sugar/00000090375323/90375323_U1N1_s01"
  "/rendition/preview2/png/content/dam/acme/products/ma/brand-a/brand-a-sugar/00000090375323/90375323_U1N1_s01"
  "/rendition/preview/png/content/dam/acme/products/ma/brand-a/brand-a-sugar/00000090375323/90375323_U1N1_s01"
  "/rendition/original/png/content/dam/acme/products/ma/brand-a/brand-a-sugar/00000090375323/90375323_U1N1_s01"
  "/public/download/original/png/content/dam/acme/marketing/public-links/SparkLogoTransparent"
  "/public/download/original/mp4/content/dam/acme/marketing/public-links/global-sprite-motion-wordmark-immersive-mp4"
)

echo "Testing: ${HOST}"
echo ""

failed=0

for path in "${URLS[@]}"; do
  url="${HOST}${path}"
  if ! status=$(curl -s -o /dev/null -w '%{http_code}:%{size_download}' "$url" 2>&1); then
    echo "FAIL  curl error  ${path}"
    failed=1
    continue
  fi
  code="${status%%:*}"
  size="${status##*:}"

  if [[ "$code" != "200" || "$size" == "0" ]]; then
    echo "FAIL  ${code}  ${size}B  ${path}"
    failed=1
  else
    echo "OK    ${code}  ${size}B  ${path}"
  fi
done

if [[ "$failed" -eq 1 ]]; then
  echo -e "\nSome URLs failed."
  exit 1
else
  echo -e "\nAll URLs OK."
fi
