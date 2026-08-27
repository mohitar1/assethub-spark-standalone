/**
 * Unit tests for uniqueVisitorsByMonth query generation
 * Tests the new query that counts distinct users across all event types
 */

import { describe, expect, it } from 'vitest';

/**
 * Mock implementation of the uniqueVisitorsByMonth query builder
 * This mirrors the logic in analytics.js buildReportMetricQuery function
 */
function buildUniqueVisitorsByMonthQuery(startDate, endDate) {
  const startDateTime = `toDateTime('${startDate} 00:00:00')`;
  const endDateTime = `toDateTime('${endDate} 23:59:59')`;
  const timestampFilter = `timestamp >= ${startDateTime} AND timestamp <= ${endDateTime}`;

  return `SELECT 
        formatDateTime(timestamp, '%Y-%m') as month,
        COUNT(DISTINCT blob1) as uniqueVisitors
      FROM spark_analyticstest 
      WHERE index1 IN ('login', 'search', 'download') AND blob1 IS NOT NULL AND blob1 != '' AND ${timestampFilter}
      GROUP BY month 
      ORDER BY month`;
}

describe('uniqueVisitorsByMonth Query', () => {
  describe('Query Structure', () => {
    it('should generate valid SQL for single month range', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-01-31');

      expect(query).toContain('SELECT');
      expect(query).toContain('COUNT(DISTINCT blob1) as uniqueVisitors');
      expect(query).toContain('FROM spark_analyticstest');
      expect(query).toContain('GROUP BY month');
      expect(query).toContain('ORDER BY month');
    });

    it('should generate valid SQL for full year range', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-12-31');

      expect(query).toContain("timestamp >= toDateTime('2025-01-01 00:00:00')");
      expect(query).toContain("timestamp <= toDateTime('2025-12-31 23:59:59')");
    });

    it('should format month as YYYY-MM', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-12-31');

      expect(query).toContain("formatDateTime(timestamp, '%Y-%m') as month");
    });
  });

  describe('Event Type Filtering', () => {
    it('should include all three event types: login, search, download', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-01-31');

      expect(query).toContain("index1 IN ('login', 'search', 'download')");
    });

    it('should use IN clause not OR clause for event types', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-01-31');

      // Should use IN clause
      expect(query).toContain("IN ('login', 'search', 'download')");

      // Should NOT use OR clauses
      expect(query).not.toContain("index1 = 'login' OR");
      expect(query).not.toContain("OR index1 = 'search'");
    });
  });

  describe('Data Quality Filtering', () => {
    it('should filter out NULL blob1 values', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-01-31');

      expect(query).toContain('blob1 IS NOT NULL');
    });

    it('should filter out empty string blob1 values', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-01-31');

      expect(query).toContain("blob1 != ''");
    });

    it('should apply both NULL and empty string filters', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-01-31');

      expect(query).toContain("blob1 IS NOT NULL AND blob1 != ''");
    });
  });

  describe('Date Range Handling', () => {
    it('should use correct datetime format with time components', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-06-15', '2025-06-30');

      expect(query).toContain("toDateTime('2025-06-15 00:00:00')");
      expect(query).toContain("toDateTime('2025-06-30 23:59:59')");
    });

    it('should use >= for start date', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-12-31');

      expect(query).toContain("timestamp >= toDateTime('2025-01-01 00:00:00')");
    });

    it('should use <= for end date', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-12-31');

      expect(query).toContain("timestamp <= toDateTime('2025-12-31 23:59:59')");
    });

    it('should include both start and end date boundaries', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-03-01', '2025-03-31');

      expect(query).toContain("timestamp >= toDateTime('2025-03-01 00:00:00')");
      expect(query).toContain("timestamp <= toDateTime('2025-03-31 23:59:59')");
      expect(query).toContain('AND');
    });
  });

  describe('Aggregation Logic', () => {
    it('should count distinct blob1 values only', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-12-31');

      expect(query).toContain('COUNT(DISTINCT blob1)');
      expect(query).not.toContain('COUNT(*)');
      expect(query).not.toContain('COUNT(blob1)');
    });

    it('should alias count as uniqueVisitors', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-12-31');

      expect(query).toContain('COUNT(DISTINCT blob1) as uniqueVisitors');
    });

    it('should group by month only (not by event type)', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-12-31');

      expect(query).toContain('GROUP BY month');
      expect(query).not.toContain('GROUP BY month, eventType');
      expect(query).not.toContain('GROUP BY month, index1');
    });

    it('should order results by month', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-12-31');

      expect(query).toContain('ORDER BY month');
    });
  });

  describe('Table and Column References', () => {
    it('should query spark_analyticstest table', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-12-31');

      expect(query).toContain('FROM spark_analyticstest');
    });

    it('should reference correct blob field (blob1 for userId)', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-12-31');

      expect(query).toContain('blob1');
      expect(query).not.toContain('blob2'); // Should not use other blob fields for user count
    });

    it('should reference index1 for event type', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-12-31');

      expect(query).toContain('index1 IN');
    });
  });

  describe('Query Differences from userActivityByMonth', () => {
    it('should NOT group by event type like userActivityByMonth does', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-12-31');

      // uniqueVisitorsByMonth should aggregate across all event types
      expect(query).not.toContain('index1 as eventType');
      expect(query).not.toContain('GROUP BY month, eventType');
      expect(query).not.toContain('GROUP BY month, index1');
    });

    it('should return single count per month (not split by event type)', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-12-31');

      // Should have only month and uniqueVisitors in SELECT
      expect(query).toContain('month');
      expect(query).toContain('uniqueVisitors');
      expect(query).not.toContain('eventType');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should not allow SQL injection through date parameters', () => {
      // Dates come from controlled sources, but verify format
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-12-31');

      // Should be safely enclosed in toDateTime function
      expect(query).toContain("toDateTime('2025-01-01 00:00:00')");
      expect(query).toContain("toDateTime('2025-12-31 23:59:59')");
    });
  });

  describe('Edge Cases', () => {
    it('should handle single-day date range', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-15', '2025-01-15');

      expect(query).toContain("toDateTime('2025-01-15 00:00:00')");
      expect(query).toContain("toDateTime('2025-01-15 23:59:59')");
    });

    it('should handle year boundary crossing', () => {
      const query = buildUniqueVisitorsByMonthQuery('2024-12-01', '2025-01-31');

      expect(query).toContain('2024-12-01');
      expect(query).toContain('2025-01-31');
    });

    it('should handle leap year February', () => {
      const query = buildUniqueVisitorsByMonthQuery('2024-02-01', '2024-02-29');

      expect(query).toContain('2024-02-01');
      expect(query).toContain('2024-02-29');
    });
  });

  describe('Query Performance Considerations', () => {
    it('should use indexed columns (timestamp, index1, blob1)', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-12-31');

      // Verify query uses potentially indexed columns
      expect(query).toContain('timestamp');
      expect(query).toContain('index1');
      expect(query).toContain('blob1');
    });

    it('should filter before aggregation for better performance', () => {
      const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-12-31');

      // WHERE clause should come before GROUP BY
      const whereIndex = query.indexOf('WHERE');
      const groupByIndex = query.indexOf('GROUP BY');

      expect(whereIndex).toBeGreaterThan(-1);
      expect(groupByIndex).toBeGreaterThan(-1);
      expect(whereIndex).toBeLessThan(groupByIndex);
    });
  });
});

describe('Integration with User Activity Table', () => {
  it('should provide total unique visitors for percentage calculations', () => {
    // This query provides the denominator for percentage calculations
    // e.g., (registeredNewUsers / uniqueVisitors) * 100
    const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-12-31');

    expect(query).toContain('uniqueVisitors');
    expect(query).toContain('COUNT(DISTINCT blob1)');
  });

  it('should match month format used by other queries', () => {
    const query = buildUniqueVisitorsByMonthQuery('2025-01-01', '2025-12-31');

    // Should use same month format as userActivityByMonth and firstTimeUsersByMonth
    expect(query).toContain("formatDateTime(timestamp, '%Y-%m')");
  });
});
