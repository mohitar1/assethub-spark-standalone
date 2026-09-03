#!/usr/bin/env bash
#
# PreToolUse guard for the rebrand-portal skill.
#
# cloudflare/src/auth.js carries a commented-out DISABLE_AUTHENTICATION
# bypass block for local testing (see docs/step-4g-verification.md, "Local
# testing without Entra login"). Blocks any git commit/add/stage or push
# while that block is UNCOMMENTED in the working tree — it must only ever
# exist locally, never land in a commit or a PR.
#
# Defense-in-depth, NOT a sandbox: pattern-based over the tool input and a
# working-tree file check, so unusual command shapes can slip past.
#
# Contract: reads the PreToolUse event JSON on stdin. Exit 0 = allow.
# Exit 2 = block (message on stderr is shown to the model). Works for
# Claude Code and Copilot CLI PreToolUse hooks.

set -uo pipefail

HOOK_INPUT="$(cat)"
export HOOK_INPUT

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${COPILOT_PROJECT_DIR:-$PWD}}"
AUTH_FILE="${PROJECT_DIR}/cloudflare/src/auth.js"

python3 <<PY
import json
import os
import re
import sys

blob = os.environ.get("HOOK_INPUT", "") or ""
auth_file = "${AUTH_FILE}"

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

# Only git commit/add/stage/push commands run through a shell tool are in
# scope; file edits themselves are how the bypass gets uncommented/recommented
# and must stay allowed.
if tool_name not in {"Bash", "Terminal", "execute_command", "run_command"}:
    sys.exit(0)

command = (
    event.get("tool_input", {}).get("command")
    if isinstance(event.get("tool_input"), dict)
    else None
) or blob

if not re.search(r"\bgit\s+(commit|add|push|stage)\b", command):
    sys.exit(0)

try:
    with open(auth_file, "r", encoding="utf-8") as fh:
        contents = fh.read()
except OSError:
    sys.exit(0)

# The shipped state is commented out (every line prefixed with '//' inside
# the block). Uncommented means an active 'if (env.DISABLE_AUTHENTICATION'
# line with no leading '//' immediately before it.
uncommented = re.search(
    r"^\s*if\s*\(env\.DISABLE_AUTHENTICATION\s*===\s*'true'\)\s*\{",
    contents,
    re.MULTILINE,
)

if uncommented:
    sys.stderr.write(
        "Blocked by rebrand-portal auth-bypass guard: "
        "cloudflare/src/auth.js has the DISABLE_AUTHENTICATION bypass block "
        "UNCOMMENTED. This is a local-testing-only helper (see "
        "docs/step-4g-verification.md) and must never be committed or "
        "pushed. Re-comment the block in auth.js before running git "
        "commit/add/push.\n"
    )
    sys.exit(2)

sys.exit(0)
PY
