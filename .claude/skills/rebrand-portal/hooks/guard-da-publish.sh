#!/usr/bin/env bash
#
# PreToolUse guard for the rebrand-portal skill.
#
# Blocks any Document Authoring / Helix publish whose target path is not
# under the demo's company folder (`customer.daFolder` in
# .internal/onboarding-state.json). Fail-safe: if no company folder is
# resolved yet, all DA/Helix publish writes are blocked.
#
# Defense-in-depth, NOT a sandbox: it is pattern-based over the tool
# input, so unusual command shapes or paths constructed inside a wrapper
# can slip past. The skill still passes explicit /<company>/... paths as
# args (SKILL.md Step 4) to keep them visible here.
#
# Contract: reads the PreToolUse event JSON on stdin. Exit 0 = allow.
# Exit 2 = block (message on stderr is shown to the model). Works for
# Claude Code and Copilot CLI PreToolUse hooks.

set -uo pipefail

HOOK_INPUT="$(cat)"
export HOOK_INPUT

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${COPILOT_PROJECT_DIR:-$PWD}}"
export STATE_FILE="${PROJECT_DIR}/.internal/onboarding-state.json"

python3 <<'PY'
import json
import os
import re
import sys

blob = os.environ.get("HOOK_INPUT", "") or ""
state_file = os.environ.get("STATE_FILE", "")

try:
    event = json.loads(blob) if blob.strip().startswith("{") else {}
except ValueError:
    event = {}
tool_name = (
    event.get("tool_name")
    or (event.get("tool") or {}).get("name")
    or event.get("toolName")
    or ""
)
if tool_name in {"Write", "Edit", "MultiEdit", "NotebookEdit", "str_replace_editor"}:
    sys.exit(0)

# Resolve the allowed company folder from the onboarding state file.
da_folder = None
try:
    with open(state_file, "r", encoding="utf-8") as fh:
        state = json.load(fh)
    da_folder = (state.get("customer") or {}).get("daFolder")
except (OSError, ValueError):
    da_folder = None

if isinstance(da_folder, str):
    da_folder = da_folder.strip().rstrip("/")
    if da_folder and not da_folder.startswith("/"):
        da_folder = "/" + da_folder
else:
    da_folder = None


def under_folder(path):
    """True if `path` is inside (or equal to) the company folder."""
    if not da_folder:
        return False
    p = "/" + path.strip().lstrip("/")
    p = re.split(r"[?#]", p)[0].rstrip("/")
    return p == da_folder or p.startswith(da_folder + "/")


def deny(reason):
    sys.stderr.write(
        "Blocked by rebrand-portal publish guard: " + reason + "\n"
        "Demo publishes are scoped to the company folder "
        f"({da_folder or '<unset>'}). "
        "Only publish paths under that folder.\n"
    )
    sys.exit(2)


violations = []

# 1) Helix Admin publish/preview/live: .../<verb>/{org}/{repo}/{ref}/<path>
#    These are always writes to the hosted site -> enforce the path.
for m in re.finditer(
    r"admin\.hlx\.page/(?:preview|live|publish)/[^/\s\"']+/[^/\s\"']+/[^/\s\"']+((?:/[^\s\"'?#]+)*)",
    blob,
):
    path = m.group(1) or "/"
    if not under_folder(path):
        violations.append("Helix publish -> " + path)

# 2) DA source write (PUT/POST upload) to .../source/{org}/{repo}/<path>
#    Only enforce when a write method/upload is present in the input.
is_write = re.search(
    r"(-X|--request)\s*(POST|PUT|DELETE)|--upload-file|(^|\s)-T\s|\"method\"\s*:\s*\"(POST|PUT|DELETE)\"",
    blob,
    re.IGNORECASE,
)
if is_write:
    for m in re.finditer(
        r"admin\.da\.live/source/[^/\s\"']+/[^/\s\"']+((?:/[^\s\"'?#]+)*)",
        blob,
    ):
        path = m.group(1) or "/"
        if not under_folder(path):
            violations.append("DA source write -> " + path)

# 3) DA copy: only the destination matters (source is a read). Destination
#    may be a form field or JSON: destination=<path> / "destination":"<path>".
for m in re.finditer(
    r"destination[\"']?\s*[:=]\s*[\"']?(/[^\s\"',&]+)",
    blob,
    re.IGNORECASE,
):
    path = m.group(1)
    if not under_folder(path):
        violations.append("DA copy destination -> " + path)

# 4) Packaged DA copy helper. The helper builds the DA copy URLs internally,
#    so enforce its <companyKey> arg before the script runs.
for m in re.finditer(
    r"(?:^|[\s\"'])(?:[^\s\"']*/)?(?:scripts/da-copy-folder\.sh|scripts/da/copy-folder\.sh)\s+[^\s\"']+\s+[^\s\"']+\s+([^\s\"']+)",
    blob,
):
    company = "/" + m.group(1).strip().strip("/")
    if not under_folder(company):
        violations.append("DA copy script destination -> " + company)

if violations:
    if not da_folder:
        deny(
            "no company folder resolved yet (customer.daFolder unset) — "
            "refusing DA/Helix publish until Step 2 sets it. "
            + "; ".join(violations)
        )
    deny("target(s) outside the company folder: " + "; ".join(violations))

sys.exit(0)
PY
