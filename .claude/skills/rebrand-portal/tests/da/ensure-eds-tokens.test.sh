#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$SCRIPT_DIR/../../scripts/da/ensure-eds-tokens.sh"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

assert_contains() {
  local file="$1" value="$2"
  grep -qF "$value" "$file" || fail "expected $file to contain $value"
}

assert_not_contains() {
  local file="$1" value="$2"
  ! grep -qF "$value" "$file" || fail "expected $file not to contain $value"
}

run_case() {
  local name="$1"
  local scenario="$2"
  local token_text="$3"
  local expect_status="$4"
  local expect_hlx="$5"

  local dir bin token_file out err status
  dir="$(mktemp -d)"
  bin="$dir/bin"
  mkdir -p "$bin"
  token_file="$dir/token.env"
  printf '%s\n' "$token_text" > "$token_file"

  cat > "$bin/curl" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail

out=""
write_code=false
method="GET"
headers=()
url=""

while [ $# -gt 0 ]; do
  case "$1" in
    -o) out="$2"; shift 2 ;;
    -w) write_code=true; shift 2 ;;
    -X) method="$2"; shift 2 ;;
    -H) headers+=("$2"); shift 2 ;;
    -d) shift 2 ;;
    -s|-S|-sS) shift ;;
    *) url="$1"; shift ;;
  esac
done

body() {
  [ -n "$out" ] && printf '%s' "$1" > "$out"
}

has_header() {
  local needle="$1" h
  for h in "${headers[@]}"; do
    [ "$h" = "$needle" ] && return 0
  done
  return 1
}

code="500"
case "$TOKEN_TEST_SCENARIO:$method:$url" in
  da-fail:GET:*admin.da.live/list/*)
    body '{}'; code="401" ;;
  existing-valid:GET:*admin.da.live/list/*)
    body '[]'; code="200" ;;
  existing-valid:GET:*admin.hlx.page/status/*)
    if has_header "x-auth-token: VALID_HLX"; then body '{}'; code="200"; else body '{}'; code="401"; fi ;;
  stale-then-mint:GET:*admin.da.live/list/*)
    body '[]'; code="200" ;;
  stale-then-mint:GET:*admin.hlx.page/status/*)
    if has_header "x-auth-token: NEW_HLX"; then body '{}'; code="200"; else body '{}'; code="401"; fi ;;
  stale-then-mint:POST:*admin.hlx.page/config/*/sites/*/apiKeys.json)
    body '{"value":"NEW_HLX"}'; code="200" ;;
  mint-no-value:GET:*admin.da.live/list/*)
    body '[]'; code="200" ;;
  mint-no-value:POST:*admin.hlx.page/config/*/sites/*/apiKeys.json)
    body '{"id":"missing-value"}'; code="200" ;;
  mint-403:GET:*admin.da.live/list/*)
    body '[]'; code="200" ;;
  mint-403:POST:*admin.hlx.page/config/*/sites/*/apiKeys.json)
    body '{}'; code="403" ;;
esac

$write_code && printf '%s' "$code"
exit 0
MOCK
  chmod +x "$bin/curl"

  out="$dir/out.txt"
  err="$dir/err.txt"
  status=0
  PATH="$bin:$PATH" TOKEN_TEST_SCENARIO="$scenario" "$SCRIPT" org site --token-file "$token_file" >"$out" 2>"$err" || status=$?

  if [ "$expect_status" = "0" ] && [ "$status" != "0" ]; then
    cat "$out" >&2
    cat "$err" >&2
    fail "$name exited $status"
  fi
  if [ "$expect_status" != "0" ] && [ "$status" = "0" ]; then
    cat "$out" >&2
    fail "$name unexpectedly succeeded"
  fi

  assert_not_contains "$out" "DA_SECRET"
  assert_not_contains "$err" "DA_SECRET"
  assert_not_contains "$out" "VALID_HLX"
  assert_not_contains "$err" "VALID_HLX"
  assert_not_contains "$out" "NEW_HLX"
  assert_not_contains "$err" "NEW_HLX"

  if [ -n "$expect_hlx" ]; then
    assert_contains "$token_file" "HLX_ADMIN_TOKEN=$expect_hlx"
  fi

  rm -rf "$dir"
  echo "PASS: $name"
}

tmp_missing="$(mktemp -d)"
if "$SCRIPT" org site --token-file "$tmp_missing/no-token.env" >/tmp/ensure-eds-missing.out 2>/tmp/ensure-eds-missing.err; then
  fail "missing token file unexpectedly succeeded"
fi
rm -rf "$tmp_missing"
echo "PASS: missing token file"

run_case "missing DA_TOKEN" "da-fail" "HLX_ADMIN_TOKEN=VALID_HLX" "1" ""
run_case "DA validate failure" "da-fail" "DA_TOKEN=DA_SECRET" "1" ""
run_case "existing HLX valid" "existing-valid" $'DA_TOKEN=DA_SECRET\nHLX_ADMIN_TOKEN=VALID_HLX' "0" "VALID_HLX"
run_case "stale HLX mints replacement" "stale-then-mint" $'DA_TOKEN=DA_SECRET\nHLX_ADMIN_TOKEN=STALE_HLX' "0" "NEW_HLX"
run_case "missing HLX mints token" "stale-then-mint" "DA_TOKEN=DA_SECRET" "0" "NEW_HLX"
run_case "mint 403 fails" "mint-403" "DA_TOKEN=DA_SECRET" "1" ""
run_case "mint without value fails" "mint-no-value" "DA_TOKEN=DA_SECRET" "1" ""
