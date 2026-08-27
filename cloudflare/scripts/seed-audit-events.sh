#!/bin/bash
# Seed local AUDIT_EVENTS D1 with realistic test data.
# Can be run from anywhere — it always operates on the cloudflare/ directory.
# Safe to re-run: uses INSERT OR IGNORE so existing rows are skipped.

set -e
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

DB="spark-audit-events"

# Pre-compute dates (works on both macOS and Linux)
days_ago() {
  if date -v-"${1}d" '+%Y-%m-%d' 2>/dev/null; then
    return
  fi
  date -u -d "${1} days ago" '+%Y-%m-%d'
}

D90=$(days_ago 90); D89=$(days_ago 89); D88=$(days_ago 88); D87=$(days_ago 87)
D85=$(days_ago 85); D82=$(days_ago 82); D81=$(days_ago 81); D80=$(days_ago 80)
D79=$(days_ago 79); D75=$(days_ago 75); D74=$(days_ago 74); D73=$(days_ago 73)
D72=$(days_ago 72); D70=$(days_ago 70); D65=$(days_ago 65); D64=$(days_ago 64)
D62=$(days_ago 62); D61=$(days_ago 61); D60=$(days_ago 60); D59=$(days_ago 59)
D58=$(days_ago 58); D55=$(days_ago 55); D50=$(days_ago 50); D49=$(days_ago 49)
D45=$(days_ago 45); D44=$(days_ago 44); D42=$(days_ago 42); D41=$(days_ago 41)
D40=$(days_ago 40); D39=$(days_ago 39); D35=$(days_ago 35); D30=$(days_ago 30)
D28=$(days_ago 28); D27=$(days_ago 27); D25=$(days_ago 25); D20=$(days_ago 20)
D15=$(days_ago 15); D14=$(days_ago 14); D13=$(days_ago 13); D10=$(days_ago 10)
D07=$(days_ago 7);  D05=$(days_ago 5);  D04=$(days_ago 4)

SQL=$(cat <<EOF
INSERT OR IGNORE INTO audit_events (user_id, user_email, user_country, user_type, user_role, action, asset_id, occurred_at) VALUES

-- Alice (internal employee, GB) — 15 rows
('sub-001','alice@frescopa.coffee','GB','internal','employee','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000001','${D90}T09:01:00Z'),
('sub-001','alice@frescopa.coffee','GB','internal','employee','download',       'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000001','${D89}T09:15:00Z'),
('sub-001','alice@frescopa.coffee','GB','internal','employee','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000002','${D88}T10:00:00Z'),
('sub-001','alice@frescopa.coffee','GB','internal','employee','share-link-copy','urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000002','${D87}T10:05:00Z'),
('sub-001','alice@frescopa.coffee','GB','internal','employee','collection-add', 'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000003','${D85}T11:00:00Z'),
('sub-001','alice@frescopa.coffee','GB','internal','employee','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000003','${D80}T14:00:00Z'),
('sub-001','alice@frescopa.coffee','GB','internal','employee','download',       'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000003','${D79}T14:30:00Z'),
('sub-001','alice@frescopa.coffee','GB','internal','employee','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000004','${D60}T09:00:00Z'),
('sub-001','alice@frescopa.coffee','GB','internal','employee','dm-url-copy',    'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000004','${D59}T09:10:00Z'),
('sub-001','alice@frescopa.coffee','GB','internal','employee','download',       'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000004','${D58}T09:20:00Z'),
('sub-001','alice@frescopa.coffee','GB','internal','employee','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000005','${D45}T11:00:00Z'),
('sub-001','alice@frescopa.coffee','GB','internal','employee','download',       'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000005','${D44}T11:30:00Z'),
('sub-001','alice@frescopa.coffee','GB','internal','employee','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000001','${D30}T08:00:00Z'),
('sub-001','alice@frescopa.coffee','GB','internal','employee','download',       'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000002','${D15}T09:00:00Z'),
('sub-001','alice@frescopa.coffee','GB','internal','employee','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000006','${D07}T10:00:00Z'),

-- Bob (external agency, DE) — 13 rows
('sub-002','bob@brandagency.de','DE','external','agency','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000001','${D88}T13:00:00Z'),
('sub-002','bob@brandagency.de','DE','external','agency','download',       'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000001','${D87}T13:20:00Z'),
('sub-002','bob@brandagency.de','DE','external','agency','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000002','${D85}T14:00:00Z'),
('sub-002','bob@brandagency.de','DE','external','agency','share-link-copy','urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000002','${D85}T14:10:00Z'),
('sub-002','bob@brandagency.de','DE','external','agency','download',       'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000003','${D70}T10:00:00Z'),
('sub-002','bob@brandagency.de','DE','external','agency','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000004','${D65}T11:00:00Z'),
('sub-002','bob@brandagency.de','DE','external','agency','dm-url-copy',    'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000004','${D64}T11:05:00Z'),
('sub-002','bob@brandagency.de','DE','external','agency','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000005','${D50}T15:00:00Z'),
('sub-002','bob@brandagency.de','DE','external','agency','collection-add', 'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000005','${D49}T15:10:00Z'),
('sub-002','bob@brandagency.de','DE','external','agency','download',       'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000006','${D35}T09:30:00Z'),
('sub-002','bob@brandagency.de','DE','external','agency','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000001','${D20}T12:00:00Z'),
('sub-002','bob@brandagency.de','DE','external','agency','download',       'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000001','${D10}T12:30:00Z'),
('sub-002','bob@brandagency.de','DE','external','agency','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000003','${D07}T08:00:00Z'),

-- Carol (internal employee, US) — 10 rows
('sub-003','carol@frescopa.coffee','US','internal','employee','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000002','${D75}T08:30:00Z'),
('sub-003','carol@frescopa.coffee','US','internal','employee','download',       'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000002','${D74}T08:45:00Z'),
('sub-003','carol@frescopa.coffee','US','internal','employee','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000003','${D73}T09:00:00Z'),
('sub-003','carol@frescopa.coffee','US','internal','employee','collection-add', 'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000003','${D72}T09:05:00Z'),
('sub-003','carol@frescopa.coffee','US','internal','employee','share-link-copy','urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000004','${D55}T14:00:00Z'),
('sub-003','carol@frescopa.coffee','US','internal','employee','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000005','${D40}T10:30:00Z'),
('sub-003','carol@frescopa.coffee','US','internal','employee','download',       'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000005','${D39}T10:45:00Z'),
('sub-003','carol@frescopa.coffee','US','internal','employee','dm-url-copy',    'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000006','${D25}T16:00:00Z'),
('sub-003','carol@frescopa.coffee','US','internal','employee','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000001','${D14}T09:00:00Z'),
('sub-003','carol@frescopa.coffee','US','internal','employee','download',       'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000001','${D13}T09:15:00Z'),

-- Dieter (external partner, unknown country) — 10 rows
('sub-004','dieter@retailpartner.com',NULL,'external','partner','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000001','${D82}T07:00:00Z'),
('sub-004','dieter@retailpartner.com',NULL,'external','partner','download',       'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000001','${D81}T07:20:00Z'),
('sub-004','dieter@retailpartner.com',NULL,'external','partner','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000002','${D62}T08:00:00Z'),
('sub-004','dieter@retailpartner.com',NULL,'external','partner','share-link-copy','urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000003','${D61}T08:10:00Z'),
('sub-004','dieter@retailpartner.com',NULL,'external','partner','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000004','${D42}T09:00:00Z'),
('sub-004','dieter@retailpartner.com',NULL,'external','partner','dm-url-copy',    'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000004','${D41}T09:05:00Z'),
('sub-004','dieter@retailpartner.com',NULL,'external','partner','download',       'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000005','${D28}T11:00:00Z'),
('sub-004','dieter@retailpartner.com',NULL,'external','partner','collection-add', 'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000006','${D27}T11:15:00Z'),
('sub-004','dieter@retailpartner.com',NULL,'external','partner','view',           'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000001','${D05}T06:00:00Z'),
('sub-004','dieter@retailpartner.com',NULL,'external','partner','download',       'urn:aaid:aem:aaaaaaaa-0001-0001-0001-000000000003','${D04}T06:30:00Z');
EOF
)

echo "Applying schema..."
npx wrangler d1 execute "$DB" --local -y --file schema/audit_events.sql

echo "Inserting seed rows..."
npx wrangler d1 execute "$DB" --local -y --command "$SQL"

echo ""
echo "Done. Verify with:"
echo "  npx wrangler d1 execute $DB --local --command 'SELECT action, COUNT(*) n FROM audit_events GROUP BY action ORDER BY n DESC;'"
