#!/usr/bin/env bash
#
# da-copy-folder.sh — Copy a DA site's existing content into a company folder.
#
# The demo rebrands a *copy* of the site's existing Document Authoring (DA)
# content placed under /<companyKey>, leaving the shared original untouched
# (SKILL.md Step 2). This script performs that copy deterministically via the
# DA Admin Copy API — including the 206 / continuation-token paging that a
# hand-rolled curl call almost always forgets, which is how partial copies
# happen.
#
# The DA Copy API is recursive at the folder level: POST /copy/{org}/{repo}/{path}
# with a multipart `destination` field copies the whole subtree under {path}.
# For large trees the API returns 206 with {"continuationToken":...}; you must
# re-POST with that token until it returns 204. This script does that loop.
#
# Usage:
#   scripts/da-copy-folder.sh <org> <repo> <companyKey> [--token-file <path>]
#
#   <org>/<repo>   the DA org and site (same as the GitHub org/repo).
#   <companyKey>   destination folder name, e.g. "acme" -> /acme.
#   --token-file   path to the env file holding DA_TOKEN (default: ./token.env
#                  resolved from the repo root).
#
# Reads DA_TOKEN (never printed). Copies ONLY the en/config/public top-level
# trees under /{org}/{repo} (allowlist; override via DA_COPY_ALLOW) into
# /{org}/{repo}/<companyKey>/..., then verifies by a recursive re-list. Sibling
# company demo folders and stray root entries are intentionally NOT copied.
#
# Exit codes: 0 = copied + verified; 1 = usage/auth error; 2 = copy failed;
# 3 = source empty (nothing to copy); 4 = verification mismatch.

set -euo pipefail

ADMIN="${DA_ADMIN_BASE:-https://admin.da.live}"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

die() { echo "ERROR: $*" >&2; exit 1; }

[ $# -ge 3 ] || die "usage: da-copy-folder.sh <org> <repo> <companyKey> [--token-file <path>]"
ORG="$1"; REPO="$2"; COMPANY="${3#/}"; shift 3

case "$COMPANY" in
  ""|*/*|*..*|.*|*[^a-z0-9-]*)
    die "companyKey must be a lowercase slug like acme-demo (got: $COMPANY)"
    ;;
esac

RESERVED_COMPANY_KEYS="api auth blocks config en fonts icons ja media public scripts styles tools"
for key in $RESERVED_COMPANY_KEYS; do
  [ "$COMPANY" = "$key" ] && die "companyKey '$COMPANY' is reserved; use a specific company slug like ${COMPANY}-demo"
done

STATE_FILE="$ROOT/.internal/onboarding-state.json"
if [ -f "$STATE_FILE" ]; then
  STATE_DA_FOLDER="$(python3 -c '
import json, sys
try:
    state = json.load(open(sys.argv[1], encoding="utf-8"))
except Exception:
    sys.exit(0)
folder = (state.get("customer") or {}).get("daFolder")
if isinstance(folder, str):
    folder = "/" + folder.strip().strip("/")
    if folder != "/":
        print(folder)
' "$STATE_FILE" || true)"
  if [ -n "$STATE_DA_FOLDER" ] && [ "$STATE_DA_FOLDER" != "/$COMPANY" ]; then
    die "companyKey '$COMPANY' does not match state company folder $STATE_DA_FOLDER"
  fi
fi

TOKEN_FILE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --token-file) TOKEN_FILE="$2"; shift 2 ;;
    *) die "unknown arg: $1" ;;
  esac
done

if [ -z "$TOKEN_FILE" ]; then
  TOKEN_FILE="$ROOT/token.env"
fi
[ -f "$TOKEN_FILE" ] || die "token file not found: $TOKEN_FILE (create it with DA_TOKEN=...)"
DA_TOKEN="$(grep -E '^DA_TOKEN=' "$TOKEN_FILE" | head -1 | cut -d= -f2- | tr -d '"'"'"' ' | tr -d '\r')"
[ -n "$DA_TOKEN" ] || die "DA_TOKEN missing/empty in $TOKEN_FILE"

AUTH=(-H "Authorization: Bearer $DA_TOKEN")

# The demo copies ONLY the three top-level content trees that make up the portal:
#   en      -> the authored pages (incl. nav/footer and reports/my-dam subtrees)
#   config  -> site config, incl. config/access (the access-control .json sheet)
#   public  -> the login/welcome page
# Everything else at the root — sibling company demo folders (e.g. /disney, /urbn),
# stray files, dotfolders — is intentionally NOT copied, so /<company> is a clean,
# faithful mirror of just the portal content. Override with DA_COPY_ALLOW if ever needed.
ALLOW_TOP="${DA_COPY_ALLOW:-en config public}"
is_allowed_top() {
  local name="$1" a
  for a in $ALLOW_TOP; do [ "$name" = "$a" ] && return 0; done
  return 1
}

# list_json <subpath> -> concatenated JSON array of every page of a DA list,
# following the da-continuation-token response header. Fails hard on non-200
# (a 404/403 is NOT "empty" — it is a bad token/path).
list_json() {
  local sub="$1" url="$ADMIN/list/$ORG/$REPO" tok="" hdrs body code combined="[]"
  [ -n "$sub" ] && url="$url/$sub"
  while :; do
    hdrs="$(mktemp)"; body="$(mktemp)"
    code="$(curl -sS "${AUTH[@]}" -D "$hdrs" -o "$body" -w '%{http_code}' \
              ${tok:+-H "da-continuation-token: $tok"} "$url")" || { rm -f "$hdrs" "$body"; die "list request failed for /$ORG/$REPO/$sub"; }
    if [ "$code" != "200" ]; then
      rm -f "$hdrs" "$body"
      die "list returned HTTP $code for /$ORG/$REPO/$sub (404/403 = wrong path or bad/expired DA_TOKEN, NOT empty)"
    fi
    combined="$(python3 - "$combined" "$body" <<'PY'
import json,sys
a=json.loads(sys.argv[1] or "[]")
try: b=json.load(open(sys.argv[2]))
except Exception: b=[]
print(json.dumps(a+(b if isinstance(b,list) else [])))
PY
)"
    tok="$(grep -i '^da-continuation-token:' "$hdrs" | head -1 | cut -d: -f2- | tr -d ' \r' || true)"
    rm -f "$hdrs" "$body"
    [ -n "$tok" ] || break
  done
  printf '%s' "$combined"
}

# entries: read a list JSON on stdin, emit "TYPE<TAB>relpath" per entry, where
# TYPE is F(ile) or D(irectory) and relpath is under /{org}/{repo}. For files
# the extension is appended so the value is the real document path.
entries() {
  # NOTE: uses python3 -c (not a heredoc) so stdin stays the piped list JSON.
  python3 -c '
import json,sys
org,repo=sys.argv[1],sys.argv[2]
try:
    data=json.load(sys.stdin)
except Exception:
    data=[]
pref="/%s/%s/"%(org,repo)
for it in data:
    p=it.get("path","") or ""
    rel=p[len(pref):] if p.startswith(pref) else p.lstrip("/")
    if not rel: continue
    ext=it.get("ext")
    print(("F\t%s.%s"%(rel,ext)) if ext else ("D\t%s"%rel))
' "$ORG" "$REPO"
}

# recursive_count <subpath> -> number of file docs under subpath (recursive).
recursive_count() {
  local sub="$1" n=0 typ rel
  while IFS=$'\t' read -r typ rel; do
    [ -z "${typ:-}" ] && continue
    if [ "$typ" = "F" ]; then
      n=$((n+1))
    else
      n=$((n + $(recursive_count "$rel") ))
    fi
  done < <(list_json "$sub" | entries)
  echo "$n"
}

# recursive_files <subpath> -> emit each FILE doc's relpath (under /{org}/{repo})
# beneath subpath, recursively. Used for path-by-path copy verification (a total
# count can hide an entire missing subtree when another subtree over-counts).
recursive_files() {
  local sub="$1" typ rel
  while IFS=$'\t' read -r typ rel; do
    [ -z "${typ:-}" ] && continue
    if [ "$typ" = "F" ]; then
      printf '%s\n' "$rel"
    else
      recursive_files "$rel"
    fi
  done < <(list_json "$sub" | entries)
}

# copy_entry <relpath> — copy one entry (recursively for folders) into
# /{company}/<relpath>, looping on the 206 continuation token until 204.
copy_entry() {
  local rel="$1" dest="/$ORG/$REPO/$COMPANY/$1" url="$ADMIN/copy/$ORG/$REPO/$1"
  local tok="" code tmp
  while :; do
    tmp="$(mktemp)"
    code="$(curl -sS "${AUTH[@]}" -o "$tmp" -w '%{http_code}' \
             -F "destination=$dest" ${tok:+-F "continuation-token=$tok"} "$url")"
    case "$code" in
      204) rm -f "$tmp"; return 0 ;;
      206) tok="$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("continuationToken",""))' "$tmp")"
           rm -f "$tmp"
           [ -n "$tok" ] || { echo "ERROR: 206 with no continuationToken for $rel" >&2; return 2; } ;;
      *)   rm -f "$tmp"; echo "ERROR: copy of $rel -> $dest returned HTTP $code" >&2; return 2 ;;
    esac
  done
}

echo ">> Enumerating existing content under /$ORG/$REPO ..."
# A failed list (404/403/etc.) MUST abort — it is a bad token/path, NEVER
# grounds to conclude the source is empty. Only a real HTTP 200 with zero
# entries counts as empty.
if ! TOP_JSON="$(list_json "")"; then
  echo "ERROR: could not list /$ORG/$REPO — aborting. This is NOT treated as an empty source; fix DA_TOKEN or the org/repo and retry." >&2
  exit 1
fi
TOP="$(printf '%s' "$TOP_JSON" | entries)"
if [ -z "${TOP//[$'\n\t ']/}" ]; then
  echo ">> Authenticated list of /$ORG/$REPO returned HTTP 200 with ZERO documents — source is genuinely empty; nothing to copy."
  exit 3
fi

echo ">> Copying top-level entries into /$COMPANY ..."
COPIED=0; ELIGIBLE=0
while IFS=$'\t' read -r typ rel; do
  [ -z "${typ:-}" ] && continue
  if ! is_allowed_top "$rel"; then echo "   - skip $rel (only en/config/public are copied)"; continue; fi
  echo "   - copy $rel -> /$COMPANY/$rel"
  copy_entry "$rel"
  COPIED=$((COPIED+1))
  if [ "$typ" = "F" ]; then ELIGIBLE=$((ELIGIBLE+1)); else ELIGIBLE=$((ELIGIBLE + $(recursive_count "$rel") )); fi
done <<< "$TOP"

[ "$COPIED" -gt 0 ] || die "none of the expected top-level trees (en/config/public) were found under /$ORG/$REPO — check the org/repo and DA_TOKEN"

echo ">> Verifying copy under /$COMPANY (path-by-path — every source doc must have a copy) ..."
# Enumerate every eligible SOURCE file relpath (skipping the company folder + dotfolders),
# then assert each one exists under /$COMPANY/<relpath>. A count check is NOT enough: a
# single over-counted subtree (e.g. /en) can mask a whole missing one (e.g. /public or the
# /config folder that carries the access-control sheet) — exactly how the login/welcome
# page and config/access silently went missing before.
SRC_FILES="$(mktemp)"; DST_SET="$(mktemp)"
while IFS=$'\t' read -r typ rel; do
  [ -z "${typ:-}" ] && continue
  is_allowed_top "$rel" || continue
  if [ "$typ" = "F" ]; then printf '%s\n' "$rel" >> "$SRC_FILES"; else recursive_files "$rel" >> "$SRC_FILES"; fi
done <<< "$TOP"

# compute_missing <dst_set_file>: print every source relpath (WITH its extension) that has
# no counterpart in the given destination set. The extension is part of the relpath, so a
# wrong-extension twin (e.g. an .xlsx media asset, or any re-authored file, standing in for
# the real source config/access/application.json DA sheet) is correctly reported MISSING,
# never a false match — faithful extensions are enforced here. In DA a .json is a structured
# sheet (publishes as /<path>.json); an .xlsx is opaque media that never publishes — so the
# extension MUST match the source exactly.
compute_missing() {
  local dst="$1" rel
  while IFS= read -r rel; do
    [ -z "$rel" ] && continue
    grep -qxF "$rel" "$dst" || printf '%s\n' "$rel"
  done < <(sort -u "$SRC_FILES")
}

# Destination file set, with the leading "$COMPANY/" stripped so paths line up with source.
recursive_files "$COMPANY" | sed "s#^$COMPANY/##" | sort -u > "$DST_SET"

MISS="$(mktemp)"
compute_missing "$DST_SET" > "$MISS"
MISSING="$(grep -c . "$MISS" || true)"

# Repair pass — this is the fix for the "config folder was the miss" failure. If the bulk
# top-level recursive copy left ANY source document without a destination counterpart (the
# /config subtree with its access sheet, a nested page, etc.), copy each missing document
# INDIVIDUALLY from its exact source path. copy_entry copies the real resource, so a .json
# sheet stays .json and a .docx stays .docx — it never re-authors or converts a doc to a
# different type. Only if something is STILL missing after this repair do we fail.
if [ "$MISSING" -gt 0 ]; then
  echo ">> $MISSING document(s) not present after the bulk copy — repairing by copying each one individually ..." >&2
  while IFS= read -r rel; do
    [ -z "$rel" ] && continue
    echo "   - repair-copy $rel -> /$COMPANY/$rel" >&2
    copy_entry "$rel" || echo "   - WARN: repair copy of $rel failed" >&2
  done < "$MISS"
  # Re-list the destination and recompute what is still missing after repair.
  recursive_files "$COMPANY" | sed "s#^$COMPANY/##" | sort -u > "$DST_SET"
  compute_missing "$DST_SET" > "$MISS"
  MISSING="$(grep -c . "$MISS" || true)"
fi

if [ "$MISSING" -gt 0 ]; then
  while IFS= read -r rel; do
    [ -n "$rel" ] && echo "   - MISSING at destination: /$COMPANY/$rel" >&2
  done < "$MISS"
fi

SRC_N="$(sort -u "$SRC_FILES" | grep -c . || true)"
DST_N="$(grep -c . "$DST_SET" || true)"
rm -f "$SRC_FILES" "$DST_SET" "$MISS"

if [ "$MISSING" -gt 0 ]; then
  echo "ERROR: verification failed — $MISSING of $SRC_N source document(s) are STILL missing under /$COMPANY after the repair pass. Copy is INCOMPLETE; not marking done." >&2
  exit 4
fi
echo ">> OK: all $SRC_N source document(s) have a copy under /$COMPANY ($DST_N doc(s) present). Copy verified path-by-path (incl. /config)."
exit 0
