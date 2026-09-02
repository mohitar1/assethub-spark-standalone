#!/usr/bin/env bash
#
# ensure-eds-tokens.sh — validate DA access and ensure a Helix Admin token.
#
# Usage:
#   .claude/skills/rebrand-portal/scripts/da/ensure-eds-tokens.sh <org> <site> [--token-file token.env]
#
# Reads DA_TOKEN from token.env. Reuses an existing valid HLX_ADMIN_TOKEN when
# present; otherwise mints a new Helix Admin API key from DA_TOKEN and writes it
# back to token.env. Never prints token values.

set -euo pipefail

ADMIN_DA="${DA_ADMIN_BASE:-https://admin.da.live}"
ADMIN_HLX="${HELIX_ADMIN_BASE:-${HLX_ADMIN_BASE:-https://admin.hlx.page}}"

die() {
  echo "ERROR: $*" >&2
  exit 1
}

[ $# -ge 2 ] || die "usage: ensure-eds-tokens.sh <org> <site> [--token-file token.env]"
ORG="$1"
SITE="$2"
shift 2

TOKEN_FILE="token.env"
while [ $# -gt 0 ]; do
  case "$1" in
    --token-file)
      [ $# -ge 2 ] || die "--token-file requires a path"
      TOKEN_FILE="$2"
      shift 2
      ;;
    *)
      die "unknown arg: $1"
      ;;
  esac
done

[ -f "$TOKEN_FILE" ] || die "token file not found: $TOKEN_FILE"

read_env_value() {
  local key="$1"
  node -e "
const fs = require('fs');
const key = process.argv[1];
const file = process.argv[2];
const text = fs.readFileSync(file, 'utf8');
const line = text.split(/\\r?\\n/).find((row) => row.match(new RegExp('^\\\\s*' + key + '\\\\s*=')));
if (!line) process.exit(0);
let value = line.slice(line.indexOf('=') + 1).trim();
value = value.replace(/^['\"]|['\"]$/g, '');
value = value.replace(/^Bearer\\s+/i, '');
process.stdout.write(value);
" "$key" "$TOKEN_FILE"
}

write_env_value() {
  local key="$1"
  local value_file="$2"
  node -e "
const fs = require('fs');
const key = process.argv[1];
const valueFile = process.argv[2];
const tokenFile = process.argv[3];
const value = fs.readFileSync(valueFile, 'utf8').trim();
let text = fs.readFileSync(tokenFile, 'utf8');
const re = new RegExp('^\\\\s*' + key + '\\\\s*=.*$', 'm');
if (re.test(text)) {
  text = text.replace(re, key + '=' + value);
} else {
  text = text.replace(/\\s*$/, '') + '\\n' + key + '=' + value + '\\n';
}
fs.writeFileSync(tokenFile, text, { mode: 0o600 });
" "$key" "$value_file" "$TOKEN_FILE"
}

DA_TOKEN="$(read_env_value DA_TOKEN)"
[ -n "$DA_TOKEN" ] || die "DA_TOKEN missing/empty in $TOKEN_FILE"

tmp_body="$(mktemp)"
tmp_token="$(mktemp)"
cleanup() {
  rm -f "$tmp_body" "$tmp_token"
}
trap cleanup EXIT

da_code="$(curl -sS -o "$tmp_body" -w '%{http_code}' \
  -H "Authorization: Bearer $DA_TOKEN" \
  "$ADMIN_DA/list/$ORG/$SITE")" || die "DA_TOKEN is expired or does not have access to this DA site."

if [ "$da_code" != "200" ]; then
  die "DA_TOKEN is expired or does not have access to this DA site. DA list returned HTTP $da_code."
fi

echo "DA_TOKEN verified for $ORG/$SITE."

HLX_ADMIN_TOKEN="$(read_env_value HLX_ADMIN_TOKEN)"
if [ -n "$HLX_ADMIN_TOKEN" ]; then
  hlx_code="$(curl -sS -o "$tmp_body" -w '%{http_code}' \
    -H "x-auth-token: $HLX_ADMIN_TOKEN" \
    "$ADMIN_HLX/status/$ORG/$SITE/main/")" || hlx_code="000"
  if [ "$hlx_code" = "200" ]; then
    echo "Existing HLX_ADMIN_TOKEN verified for $ORG/$SITE."
    exit 0
  fi
  echo "Existing HLX_ADMIN_TOKEN did not verify; minting a replacement."
fi

mint_code="$(curl -sS -o "$tmp_body" -w '%{http_code}' -X POST \
  -H "Authorization: Bearer $DA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "description": "rebrand-portal rebrand", "roles": ["admin"] }' \
  "$ADMIN_HLX/config/$ORG/sites/$SITE/apiKeys.json")" || {
    die "DA_TOKEN works for DA, but this user cannot mint the publish token for this site. Use a DA token from a user with required site admin/config rights."
  }

if [ "$mint_code" != "200" ]; then
  die "DA_TOKEN works for DA, but this user cannot mint the publish token for this site. Helix mint returned HTTP $mint_code."
fi

node -e "
const fs = require('fs');
const body = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
if (!body.value || typeof body.value !== 'string') process.exit(2);
fs.writeFileSync(process.argv[2], body.value, { mode: 0o600 });
" "$tmp_body" "$tmp_token" || {
  die "DA_TOKEN works for DA, but this user cannot mint the publish token for this site. Helix mint response did not include a token value."
}

write_env_value HLX_ADMIN_TOKEN "$tmp_token"

FINAL_HLX_TOKEN="$(cat "$tmp_token")"
verify_code="$(curl -sS -o "$tmp_body" -w '%{http_code}' \
  -H "x-auth-token: $FINAL_HLX_TOKEN" \
  "$ADMIN_HLX/status/$ORG/$SITE/main/")" || verify_code="000"

if [ "$verify_code" != "200" ]; then
  die "Minted publish token did not verify for this site. Helix status returned HTTP $verify_code."
fi

echo "HLX_ADMIN_TOKEN minted, stored, and verified for $ORG/$SITE."
