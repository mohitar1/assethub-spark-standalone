#!/bin/bash

# Update or create secrets in Cloudflare Secret Store by NAME

set -e

STORE_ID="$1"
NAME="$2"

if [ -z "$STORE_ID" ] || [ -z "$NAME" ]; then
  echo "Usage: echo <value> | secret-store-update.sh <secret-store-id> <name>"
  echo
  echo "Update or create secret in Cloudflare Secret Store by NAME."
  echo "The secret <value> is passed via stdin to avoid exposing it in logs."
  echo
  echo "  <secret-store-id>   Cloudflare secret store ID (same as in production)"
  echo
  echo "  <name>              Name of the secret to update"
  exit 1
fi

ID=$(npx wrangler secrets-store secret list $STORE_ID --remote 2>/dev/null | grep -F "$NAME" | awk '{print $4}')

if [ -z "$ID" ]; then
  # if not found, create
  cat /dev/stdin | npx wrangler secrets-store secret create $STORE_ID --remote --scopes workers --name "$NAME"
else
  # if found, update
  cat /dev/stdin | npx wrangler secrets-store secret update $STORE_ID --remote --scopes workers --secret-id "$ID"
fi