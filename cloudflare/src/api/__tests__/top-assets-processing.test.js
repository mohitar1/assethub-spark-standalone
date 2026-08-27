/**
 * Unit tests for top assets processing in analytics.js
 *
 * NOTE: The processTopAssets function is private to the analytics module.
 * These tests verify the expected behavior by testing the data transformation
 * logic separately (copied from analytics.js).
 */

import { describe, expect, it } from 'vitest';

// =============================================================================
// CONSTANTS (Copied from analytics.js for testing)
// Keep in sync with cloudflare/src/api/analytics.js
// =============================================================================

const TOP_ASSETS_LIMIT = 10;
const UNKNOWN_VALUE = 'unknown';

// =============================================================================
// FUNCTION UNDER TEST (Copied from analytics.js)
// Keep in sync with cloudflare/src/api/analytics.js
// =============================================================================

/**
 * Process top assets data - aggregate raw download events by asset ID
 * @param {Array} data - Raw query data from topAssets query (individual download events)
 * @returns {Array} Formatted assets data (top 10 by download count)
 */
function processTopAssets(data) {
  const assetMap = {};

  // Aggregate data by asset ID
  data.forEach((row) => {
    const assetId = row.assetId || UNKNOWN_VALUE;

    // Skip unknown/empty asset IDs
    if (assetId === UNKNOWN_VALUE || assetId === '') {
      return;
    }

    if (!assetMap[assetId]) {
      assetMap[assetId] = {
        assetId,
        brand: row.brand || UNKNOWN_VALUE,
        campaign: row.campaign || UNKNOWN_VALUE,
        countries: new Set(),
        downloaders: new Set(),
        totalDownloads: 0,
      };
    }

    const asset = assetMap[assetId];

    // Track unique countries (OUs)
    if (row.country) {
      asset.countries.add(row.country);
    }

    // Track unique downloaders
    if (row.email) {
      asset.downloaders.add(row.email);
    }

    // Sum total downloads (each event = 1 download in new schema)
    asset.totalDownloads += parseFloat(row.downloadCount) || 1;
  });

  // Convert to array and format for UI
  const assets = Object.values(assetMap).map((asset) => ({
    assetId: asset.assetId,
    brand: asset.brand,
    campaign: asset.campaign,
    ousWithDownload: asset.countries.size,
    downloaders: asset.downloaders.size,
    totalDownloads: Math.round(asset.totalDownloads),
  }));

  // Sort by totalDownloads DESC and return top 10
  return assets.sort((a, b) => b.totalDownloads - a.totalDownloads).slice(0, TOP_ASSETS_LIMIT);
}

// =============================================================================
// TESTS
// =============================================================================

describe('Cloudflare top-assets-processing', () => {
  describe('processTopAssets', () => {
    it('aggregates downloads by asset ID', () => {
      const data = [
        {
          assetId: 'urn:aaid:aem:asset1',
          brand: 'Acme Corp',
          campaign: 'Summer',
          email: 'user1@test.com',
          country: 'US',
          downloadCount: 1,
        },
        {
          assetId: 'urn:aaid:aem:asset1',
          brand: 'Acme Corp',
          campaign: 'Summer',
          email: 'user2@test.com',
          country: 'UK',
          downloadCount: 1,
        },
        {
          assetId: 'urn:aaid:aem:asset2',
          brand: 'Sprite',
          campaign: 'Winter',
          email: 'user1@test.com',
          country: 'US',
          downloadCount: 1,
        },
      ];

      const result = processTopAssets(data);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        assetId: 'urn:aaid:aem:asset1',
        brand: 'Acme Corp',
        campaign: 'Summer',
        ousWithDownload: 2, // US, UK
        downloaders: 2, // user1, user2
        totalDownloads: 2,
      });
      expect(result[1]).toEqual({
        assetId: 'urn:aaid:aem:asset2',
        brand: 'Sprite',
        campaign: 'Winter',
        ousWithDownload: 1,
        downloaders: 1,
        totalDownloads: 1,
      });
    });

    it('counts unique downloaders (same user multiple downloads)', () => {
      const data = [
        {
          assetId: 'urn:aaid:aem:asset1',
          brand: 'Acme Corp',
          campaign: 'Summer',
          email: 'user1@test.com',
          country: 'US',
          downloadCount: 1,
        },
        {
          assetId: 'urn:aaid:aem:asset1',
          brand: 'Acme Corp',
          campaign: 'Summer',
          email: 'user1@test.com',
          country: 'US',
          downloadCount: 1,
        },
        {
          assetId: 'urn:aaid:aem:asset1',
          brand: 'Acme Corp',
          campaign: 'Summer',
          email: 'user1@test.com',
          country: 'US',
          downloadCount: 1,
        },
      ];

      const result = processTopAssets(data);

      expect(result).toHaveLength(1);
      expect(result[0].downloaders).toBe(1); // Same user
      expect(result[0].totalDownloads).toBe(3); // 3 downloads
    });

    it('counts unique OUs (same OU multiple downloads)', () => {
      const data = [
        {
          assetId: 'urn:aaid:aem:asset1',
          brand: 'Acme Corp',
          campaign: 'Summer',
          email: 'user1@test.com',
          country: 'US',
          downloadCount: 1,
        },
        {
          assetId: 'urn:aaid:aem:asset1',
          brand: 'Acme Corp',
          campaign: 'Summer',
          email: 'user2@test.com',
          country: 'US',
          downloadCount: 1,
        },
      ];

      const result = processTopAssets(data);

      expect(result).toHaveLength(1);
      expect(result[0].ousWithDownload).toBe(1); // Both from US
      expect(result[0].downloaders).toBe(2); // Different users
    });

    it('sorts by totalDownloads descending', () => {
      const data = [
        {
          assetId: 'urn:aaid:aem:low',
          brand: 'A',
          campaign: 'A',
          email: 'u1@test.com',
          country: 'US',
          downloadCount: 1,
        },
        {
          assetId: 'urn:aaid:aem:high',
          brand: 'B',
          campaign: 'B',
          email: 'u1@test.com',
          country: 'US',
          downloadCount: 1,
        },
        {
          assetId: 'urn:aaid:aem:high',
          brand: 'B',
          campaign: 'B',
          email: 'u2@test.com',
          country: 'US',
          downloadCount: 1,
        },
        {
          assetId: 'urn:aaid:aem:high',
          brand: 'B',
          campaign: 'B',
          email: 'u3@test.com',
          country: 'US',
          downloadCount: 1,
        },
        {
          assetId: 'urn:aaid:aem:medium',
          brand: 'C',
          campaign: 'C',
          email: 'u1@test.com',
          country: 'US',
          downloadCount: 1,
        },
        {
          assetId: 'urn:aaid:aem:medium',
          brand: 'C',
          campaign: 'C',
          email: 'u2@test.com',
          country: 'US',
          downloadCount: 1,
        },
      ];

      const result = processTopAssets(data);

      expect(result).toHaveLength(3);
      expect(result[0].assetId).toBe('urn:aaid:aem:high'); // 3 downloads
      expect(result[1].assetId).toBe('urn:aaid:aem:medium'); // 2 downloads
      expect(result[2].assetId).toBe('urn:aaid:aem:low'); // 1 download
    });

    it('limits results to TOP_ASSETS_LIMIT (10)', () => {
      // Create 15 assets with varying download counts
      const data = [];
      for (let i = 1; i <= 15; i += 1) {
        for (let j = 0; j < i; j += 1) {
          data.push({
            assetId: `urn:aaid:aem:asset${i}`,
            brand: `Brand${i}`,
            campaign: `Campaign${i}`,
            email: `user${j}@test.com`,
            country: 'US',
            downloadCount: 1,
          });
        }
      }

      const result = processTopAssets(data);

      expect(result).toHaveLength(10);
      // Should have assets 15, 14, 13, 12, 11, 10, 9, 8, 7, 6 (highest downloads)
      expect(result[0].assetId).toBe('urn:aaid:aem:asset15');
      expect(result[0].totalDownloads).toBe(15);
      expect(result[9].assetId).toBe('urn:aaid:aem:asset6');
      expect(result[9].totalDownloads).toBe(6);
    });

    it('skips entries with empty assetId', () => {
      const data = [
        {
          assetId: '',
          brand: 'Acme Corp',
          campaign: 'Summer',
          email: 'user1@test.com',
          country: 'US',
          downloadCount: 1,
        },
        {
          assetId: 'urn:aaid:aem:valid',
          brand: 'Sprite',
          campaign: 'Winter',
          email: 'user1@test.com',
          country: 'US',
          downloadCount: 1,
        },
      ];

      const result = processTopAssets(data);

      expect(result).toHaveLength(1);
      expect(result[0].assetId).toBe('urn:aaid:aem:valid');
    });

    it('skips entries with undefined/null assetId', () => {
      const data = [
        {
          brand: 'Acme Corp',
          campaign: 'Summer',
          email: 'user1@test.com',
          country: 'US',
          downloadCount: 1,
        }, // assetId missing
        {
          assetId: null,
          brand: 'Sprite',
          campaign: 'Winter',
          email: 'user1@test.com',
          country: 'US',
          downloadCount: 1,
        },
        {
          assetId: 'urn:aaid:aem:valid',
          brand: 'Fanta',
          campaign: 'Fall',
          email: 'user1@test.com',
          country: 'US',
          downloadCount: 1,
        },
      ];

      const result = processTopAssets(data);

      expect(result).toHaveLength(1);
      expect(result[0].assetId).toBe('urn:aaid:aem:valid');
    });

    it('uses "unknown" as default for missing brand/campaign', () => {
      const data = [
        {
          assetId: 'urn:aaid:aem:asset1',
          email: 'user1@test.com',
          country: 'US',
          downloadCount: 1,
        }, // brand and campaign missing
      ];

      const result = processTopAssets(data);

      expect(result).toHaveLength(1);
      expect(result[0].brand).toBe('unknown');
      expect(result[0].campaign).toBe('unknown');
    });

    it('handles missing email gracefully (0 unique downloaders)', () => {
      const data = [
        {
          assetId: 'urn:aaid:aem:asset1',
          brand: 'Acme Corp',
          campaign: 'Summer',
          country: 'US',
          downloadCount: 1,
        },
      ];

      const result = processTopAssets(data);

      expect(result).toHaveLength(1);
      expect(result[0].downloaders).toBe(0);
      expect(result[0].totalDownloads).toBe(1);
    });

    it('handles missing country gracefully (0 OUs)', () => {
      const data = [
        {
          assetId: 'urn:aaid:aem:asset1',
          brand: 'Acme Corp',
          campaign: 'Summer',
          email: 'user1@test.com',
          downloadCount: 1,
        },
      ];

      const result = processTopAssets(data);

      expect(result).toHaveLength(1);
      expect(result[0].ousWithDownload).toBe(0);
      expect(result[0].downloaders).toBe(1);
    });

    it('defaults downloadCount to 1 if missing or invalid', () => {
      const data = [
        {
          assetId: 'urn:aaid:aem:asset1',
          brand: 'Acme Corp',
          campaign: 'Summer',
          email: 'user1@test.com',
          country: 'US',
        }, // downloadCount missing
        {
          assetId: 'urn:aaid:aem:asset1',
          brand: 'Acme Corp',
          campaign: 'Summer',
          email: 'user2@test.com',
          country: 'US',
          downloadCount: 'invalid',
        },
      ];

      const result = processTopAssets(data);

      expect(result).toHaveLength(1);
      expect(result[0].totalDownloads).toBe(2); // 1 + 1 (defaults)
    });

    it('returns empty array for empty input', () => {
      const result = processTopAssets([]);
      expect(result).toEqual([]);
    });

    it('returns empty array when all entries have invalid assetIds', () => {
      const data = [
        {
          assetId: '',
          brand: 'Acme Corp',
          campaign: 'Summer',
          email: 'user1@test.com',
          country: 'US',
          downloadCount: 1,
        },
        {
          brand: 'Sprite',
          campaign: 'Winter',
          email: 'user2@test.com',
          country: 'UK',
          downloadCount: 1,
        },
      ];

      const result = processTopAssets(data);
      expect(result).toEqual([]);
    });

    it('keeps first brand/campaign encountered for an asset', () => {
      // Different brand/campaign values for same asset - first one wins
      const data = [
        {
          assetId: 'urn:aaid:aem:asset1',
          brand: 'First Brand',
          campaign: 'First Campaign',
          email: 'user1@test.com',
          country: 'US',
          downloadCount: 1,
        },
        {
          assetId: 'urn:aaid:aem:asset1',
          brand: 'Second Brand',
          campaign: 'Second Campaign',
          email: 'user2@test.com',
          country: 'UK',
          downloadCount: 1,
        },
      ];

      const result = processTopAssets(data);

      expect(result).toHaveLength(1);
      expect(result[0].brand).toBe('First Brand');
      expect(result[0].campaign).toBe('First Campaign');
    });

    it('rounds totalDownloads to nearest integer', () => {
      const data = [
        {
          assetId: 'urn:aaid:aem:asset1',
          brand: 'Acme Corp',
          campaign: 'Summer',
          email: 'user1@test.com',
          country: 'US',
          downloadCount: 1.5,
        },
        {
          assetId: 'urn:aaid:aem:asset1',
          brand: 'Acme Corp',
          campaign: 'Summer',
          email: 'user2@test.com',
          country: 'UK',
          downloadCount: 1.7,
        },
      ];

      const result = processTopAssets(data);

      expect(result).toHaveLength(1);
      expect(result[0].totalDownloads).toBe(3); // Math.round(1.5 + 1.7) = 3
    });
  });
});
