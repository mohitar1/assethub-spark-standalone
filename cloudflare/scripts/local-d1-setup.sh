#!/bin/bash

# Apply local D1 schemas before `wrangler dev`.
# Only re-runs when a schema file is newer than its stamp file.

set -e
set -o pipefail

# Always run from the cloudflare/ directory where wrangler.toml lives.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

apply_schema() {
  local SCHEMA_FILE="$1"
  local DATABASE_NAME="$2"
  local STAMP_FILE=".wrangler/state/v3/d1/.${DATABASE_NAME}_schema_applied"

  if [ ! -f "$SCHEMA_FILE" ]; then
    echo "Error: missing cloudflare/$SCHEMA_FILE"
    exit 1
  fi

  if [ ! -d ".wrangler/state/v3/d1" ] || [ "$SCHEMA_FILE" -nt "$STAMP_FILE" ]; then
    echo "Applying $SCHEMA_FILE to local D1 database '$DATABASE_NAME'..."
    mkdir -p "$(dirname "$STAMP_FILE")"
    WRANGLER_LOG=error npx wrangler d1 execute "$DATABASE_NAME" --local --file "$SCHEMA_FILE" -y
    touch "$STAMP_FILE"
  else
    echo "Local D1 schema is up to date with cloudflare/$SCHEMA_FILE."
  fi
}

apply_schema "schema/user_logins.sql"    "spark-user-logins"
apply_schema "schema/audit_events.sql"   "spark-audit-events"
apply_schema "schema/search_events.sql"  "spark-search-events"
