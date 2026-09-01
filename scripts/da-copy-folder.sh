#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
exec "$ROOT/.claude/skills/customer-migration/scripts/da-copy-folder.sh" "$@"
