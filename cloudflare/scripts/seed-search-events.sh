#!/bin/bash

# Seed local D1 spark-search-events with realistic demo data.
# Run from anywhere — the script cd-s into cloudflare/ automatically.
# Safe to re-run: uses INSERT OR IGNORE on a synthetic id-based unique index.

set -e
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "Applying search_events schema..."
WRANGLER_LOG=error npx wrangler d1 execute spark-search-events --local --file schema/search_events.sql -y

# Pre-compute date strings (macOS + Linux compatible)
TODAY=$(date '+%Y-%m-%d')
D01=$(date -v-90d '+%Y-%m-%d' 2>/dev/null || date -d '90 days ago' '+%Y-%m-%d')
D05=$(date -v-85d '+%Y-%m-%d' 2>/dev/null || date -d '85 days ago' '+%Y-%m-%d')
D10=$(date -v-80d '+%Y-%m-%d' 2>/dev/null || date -d '80 days ago' '+%Y-%m-%d')
D14=$(date -v-76d '+%Y-%m-%d' 2>/dev/null || date -d '76 days ago' '+%Y-%m-%d')
D18=$(date -v-72d '+%Y-%m-%d' 2>/dev/null || date -d '72 days ago' '+%Y-%m-%d')
D22=$(date -v-68d '+%Y-%m-%d' 2>/dev/null || date -d '68 days ago' '+%Y-%m-%d')
D27=$(date -v-63d '+%Y-%m-%d' 2>/dev/null || date -d '63 days ago' '+%Y-%m-%d')
D31=$(date -v-59d '+%Y-%m-%d' 2>/dev/null || date -d '59 days ago' '+%Y-%m-%d')
D35=$(date -v-55d '+%Y-%m-%d' 2>/dev/null || date -d '55 days ago' '+%Y-%m-%d')
D38=$(date -v-52d '+%Y-%m-%d' 2>/dev/null || date -d '52 days ago' '+%Y-%m-%d')
D42=$(date -v-48d '+%Y-%m-%d' 2>/dev/null || date -d '48 days ago' '+%Y-%m-%d')
D46=$(date -v-44d '+%Y-%m-%d' 2>/dev/null || date -d '44 days ago' '+%Y-%m-%d')
D50=$(date -v-40d '+%Y-%m-%d' 2>/dev/null || date -d '40 days ago' '+%Y-%m-%d')
D54=$(date -v-36d '+%Y-%m-%d' 2>/dev/null || date -d '36 days ago' '+%Y-%m-%d')
D58=$(date -v-32d '+%Y-%m-%d' 2>/dev/null || date -d '32 days ago' '+%Y-%m-%d')
D62=$(date -v-28d '+%Y-%m-%d' 2>/dev/null || date -d '28 days ago' '+%Y-%m-%d')
D66=$(date -v-24d '+%Y-%m-%d' 2>/dev/null || date -d '24 days ago' '+%Y-%m-%d')
D70=$(date -v-20d '+%Y-%m-%d' 2>/dev/null || date -d '20 days ago' '+%Y-%m-%d')
D74=$(date -v-16d '+%Y-%m-%d' 2>/dev/null || date -d '16 days ago' '+%Y-%m-%d')
D78=$(date -v-12d '+%Y-%m-%d' 2>/dev/null || date -d '12 days ago' '+%Y-%m-%d')
D82=$(date -v-8d '+%Y-%m-%d' 2>/dev/null || date -d '8 days ago' '+%Y-%m-%d')
D86=$(date -v-4d '+%Y-%m-%d' 2>/dev/null || date -d '4 days ago' '+%Y-%m-%d')

echo "Seeding search events..."

# Users: alice (internal/GB), bob (agency/DE), carol (internal/US), dieter (external/null)
# search_types: all | assets | products | templates
# result_count: realistic values

WRANGLER_LOG=error npx wrangler d1 execute spark-search-events --local -y --command "
INSERT OR IGNORE INTO search_events (user_id, user_email, user_country, user_role, search_term, search_type, result_count, occurred_at) VALUES
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'coffee machine', 'assets', 124, '${D01}T09:12:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'espresso lifestyle', 'assets', 45, '${D01}T09:35:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'packaging 2025', 'assets', 8, '${D01}T11:00:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', '', 'all', 0, '${D01}T14:20:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'capsule pod', 'products', 32, '${D05}T10:05:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'logo transparent', 'assets', 3, '${D05}T12:30:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'machine hero shot', 'assets', 67, '${D05}T15:10:00.000Z'),
  ('user-dieter-004', NULL,                   NULL, 'external', 'coffee packaging', 'assets', 22, '${D05}T16:00:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'frescopa mug', 'assets', 19, '${D10}T08:45:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'social media banner', 'templates', 11, '${D10}T09:00:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'black espresso', 'assets', 55, '${D10}T10:15:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'product shot white bg', 'assets', 34, '${D10}T11:20:00.000Z'),
  ('user-dieter-004', NULL,                   NULL, 'external', '', 'all', 0, '${D10}T13:00:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'latte art', 'assets', 78, '${D14}T09:00:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'christmas campaign', 'assets', 16, '${D14}T10:00:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'homepage hero', 'templates', 7, '${D14}T14:00:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'barista', 'assets', 42, '${D18}T08:30:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'print ad landscape', 'templates', 5, '${D18}T11:00:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'capsule variety pack', 'products', 28, '${D18}T13:15:00.000Z'),
  ('user-dieter-004', NULL,                   NULL, 'external', 'award winning blend', 'assets', 9, '${D18}T15:30:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'packaging front', 'assets', 61, '${D22}T09:20:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'influencer kit', 'assets', 14, '${D22}T10:45:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'social story template', 'templates', 4, '${D22}T12:00:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'coffee machine detail', 'assets', 87, '${D27}T08:00:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'brand guidelines', 'all', 2, '${D27}T09:30:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'Q1 launch', 'assets', 33, '${D27}T11:00:00.000Z'),
  ('user-dieter-004', NULL,                   NULL, 'external', 'roast profile', 'products', 17, '${D27}T14:00:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'outdoor billboard', 'templates', 6, '${D31}T09:10:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'espresso single shot', 'assets', 51, '${D31}T10:00:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'magazine double page', 'templates', 3, '${D31}T12:30:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'travel pack', 'assets', 22, '${D35}T08:50:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'sustainability', 'assets', 38, '${D35}T10:20:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'homepage product', 'assets', 73, '${D35}T13:00:00.000Z'),
  ('user-dieter-004', NULL,                   NULL, 'external', 'rare single origin', 'products', 5, '${D35}T15:00:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'machine close-up', 'assets', 44, '${D38}T09:00:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'spring promo', 'templates', 8, '${D38}T10:30:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'dark roast', 'products', 26, '${D38}T11:45:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'coffee lifestyle', 'assets', 99, '${D42}T08:15:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'email header', 'templates', 12, '${D42}T09:45:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'award blend', 'assets', 31, '${D42}T13:20:00.000Z'),
  ('user-dieter-004', NULL,                   NULL, 'external', '', 'all', 0, '${D42}T16:00:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'box packaging', 'assets', 57, '${D46}T08:30:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'ambassador photo', 'assets', 19, '${D46}T10:00:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'recipe card template', 'templates', 2, '${D46}T12:15:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'espresso machine', 'assets', 112, '${D50}T09:00:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'retail pos', 'templates', 7, '${D50}T10:30:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'holiday blend', 'products', 43, '${D50}T13:00:00.000Z'),
  ('user-dieter-004', NULL,                   NULL, 'external', 'cafe bar shot', 'assets', 11, '${D50}T15:30:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'sustainability pack', 'assets', 29, '${D54}T08:45:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'co-branding', 'assets', 6, '${D54}T10:15:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'machine white', 'assets', 84, '${D54}T12:00:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'capsule pod selection', 'products', 37, '${D58}T09:10:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'digital banner 300x250', 'templates', 9, '${D58}T10:40:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'store display', 'templates', 4, '${D58}T13:30:00.000Z'),
  ('user-dieter-004', NULL,                   NULL, 'external', 'limited edition', 'products', 3, '${D58}T15:00:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'coffee beans', 'assets', 66, '${D62}T08:20:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'trade show banner', 'templates', 5, '${D62}T10:00:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'cold brew', 'products', 48, '${D62}T12:45:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'machine black', 'assets', 91, '${D66}T09:05:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'instagram story', 'templates', 15, '${D66}T10:30:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'premium blend pack', 'assets', 27, '${D66}T13:00:00.000Z'),
  ('user-dieter-004', NULL,                   NULL, 'external', 'morning ritual', 'assets', 8, '${D66}T16:00:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'loyalty programme', 'assets', 13, '${D70}T08:40:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'co-op promo', 'templates', 6, '${D70}T10:10:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'nespresso compat', 'products', 39, '${D70}T12:30:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'in-store display', 'templates', 4, '${D74}T09:00:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'summer campaign', 'assets', 71, '${D74}T11:00:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'hero video still', 'assets', 25, '${D74}T13:00:00.000Z'),
  ('user-dieter-004', NULL,                   NULL, 'external', 'grinder accessories', 'products', 14, '${D74}T15:00:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'capsule pod red', 'products', 30, '${D78}T08:55:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'brand refresh', 'assets', 18, '${D78}T10:20:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'white label', 'assets', 42, '${D78}T12:00:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'espresso', 'assets', 158, '${D82}T09:00:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'catalogue spread', 'templates', 10, '${D82}T10:30:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'machine range', 'assets', 63, '${D82}T13:15:00.000Z'),
  ('user-dieter-004', NULL,                   NULL, 'external', 'fair trade cert', 'assets', 1, '${D82}T15:00:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'coffee machine bundle', 'products', 35, '${D86}T08:30:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'social media pack', 'templates', 16, '${D86}T10:00:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'lifestyle hero', 'assets', 88, '${D86}T12:30:00.000Z'),
  ('user-alice-001', 'alice@frescopa.coffee', 'GB', 'internal', 'dark roast beans', 'products', 44, '${TODAY}T08:00:00.000Z'),
  ('user-bob-002',   'bob@brandagency.de',    'DE', 'agency',   'point of sale', 'templates', 7, '${TODAY}T09:30:00.000Z'),
  ('user-carol-003', 'carol@frescopa.coffee', 'US', 'internal', 'machine silver', 'assets', 76, '${TODAY}T11:00:00.000Z'),
  ('user-dieter-004', NULL,                   NULL, 'external', 'coffee pods', 'products', 20, '${TODAY}T14:00:00.000Z')
;
"

echo "Seeding search event markets..."

WRANGLER_LOG=error npx wrangler d1 execute spark-search-events --local -y --command "
INSERT OR IGNORE INTO search_event_markets (event_id, market)
SELECT id, 'USA' FROM search_events WHERE user_id = 'user-carol-003';

INSERT OR IGNORE INTO search_event_markets (event_id, market)
SELECT id, 'EMEA' FROM search_events WHERE user_id IN ('user-alice-001', 'user-bob-002');

INSERT OR IGNORE INTO search_event_markets (event_id, market)
SELECT id, 'Global' FROM search_events WHERE user_id = 'user-dieter-004';

INSERT OR IGNORE INTO search_event_markets (event_id, market)
SELECT id, 'APAC' FROM search_events WHERE user_id = 'user-dieter-004' AND search_type = 'products';
"

echo ""
echo "Done. $(WRANGLER_LOG=error npx wrangler d1 execute spark-search-events --local -y --command "SELECT COUNT(*) as total FROM search_events;" 2>/dev/null | grep -o '[0-9]*' | tail -1) search events in local D1."
echo "Run 'npx wrangler dev' from cloudflare/ to test."
