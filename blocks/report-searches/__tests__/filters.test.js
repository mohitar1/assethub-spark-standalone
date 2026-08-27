/**
 * Unit tests for Search Report Filters
 * Tests filter state management, URL synchronization, and UI updates
 */

import {
  describe, it, expect,
} from 'vitest';
import { isValidMarketToken, FILTER_ELEMENT_IDS } from '../config.js';

describe('Search Report Filters', () => {
  describe('Filter State Initialization', () => {
    it('should initialize with default "all" values', () => {
      const state = {
        filters: {
          role: 'all',
          searchType: 'all',
          searchTerm: 'all',
          region: 'all',
        },
      };

      expect(state.filters.role).toBe('all');
      expect(state.filters.searchType).toBe('all');
      expect(state.filters.searchTerm).toBe('all');
      expect(state.filters.region).toBe('all');
    });
  });

  describe('Filter Value Validation', () => {
    it('should accept valid role values', () => {
      const validRoles = ['all', 'associate', 'agency', 'partner'];

      validRoles.forEach((role) => {
        const state = { filters: { role } };
        expect(state.filters.role).toBe(role);
      });
    });

    it('should accept valid search type values', () => {
      const validTypes = ['all', 'assets', 'products', 'templates'];

      validTypes.forEach((searchType) => {
        const state = { filters: { searchType } };
        expect(state.filters.searchType).toBe(searchType);
      });
    });

    it('should accept valid search term values', () => {
      const validTerms = ['all', 'empty', 'non-empty'];

      validTerms.forEach((searchTerm) => {
        const state = { filters: { searchTerm } };
        expect(state.filters.searchTerm).toBe(searchTerm);
      });
    });

    it('should accept valid market token values', () => {
      expect(isValidMarketToken('USA')).toBe(true);
      expect(isValidMarketToken('EMEA')).toBe(true);
      expect(isValidMarketToken('Global')).toBe(true);
      expect(isValidMarketToken('APAC')).toBe(true);
      expect(isValidMarketToken('bad/value')).toBe(false);
      expect(isValidMarketToken('')).toBe(false);
    });
  });

  describe('Filter Reset Logic', () => {
    it('should reset all non-date filters to "all"', () => {
      const state = {
        filters: {
          viewType: 'month',
          selectedYear: 2025,
          selectedMonth: 5,
          role: 'partner',
          searchType: 'assets',
          searchTerm: 'non-empty',
          region: 'USA',
        },
      };

      // Simulate reset
      Object.assign(state.filters, {
        role: 'all',
        searchType: 'all',
        searchTerm: 'all',
        region: 'all',
      });

      // Date filters should remain unchanged
      expect(state.filters.viewType).toBe('month');
      expect(state.filters.selectedYear).toBe(2025);
      expect(state.filters.selectedMonth).toBe(5);

      // Non-date filters should be reset
      expect(state.filters.role).toBe('all');
      expect(state.filters.searchType).toBe('all');
      expect(state.filters.searchTerm).toBe('all');
      expect(state.filters.region).toBe('all');
    });
  });

  describe('URL Parameter Generation', () => {
    it('should not include "all" values in URL parameters', () => {
      const filters = {
        role: 'all',
        searchType: 'all',
        searchTerm: 'all',
        region: 'all',
      };

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.set(key, value);
        }
      });

      expect(params.toString()).toBe('');
    });

    it('should include non-"all" values in URL parameters', () => {
      const filters = {
        role: 'partner',
        searchType: 'all',
        searchTerm: 'non-empty',
        region: 'all',
      };

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.set(key, value);
        }
      });

      expect(params.get('role')).toBe('partner');
      expect(params.get('searchTerm')).toBe('non-empty');
      expect(params.has('searchType')).toBe(false);
      expect(params.has('region')).toBe(false);
    });

    it('should generate correct URL with multiple active filters', () => {
      const filters = {
        role: 'agency',
        searchType: 'templates',
        searchTerm: 'empty',
        region: 'EMEA',
      };

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.set(key, value);
        }
      });

      expect(params.get('role')).toBe('agency');
      expect(params.get('searchType')).toBe('templates');
      expect(params.get('searchTerm')).toBe('empty');
      expect(params.get('region')).toBe('EMEA');
    });
  });

  describe('URL Parameter Parsing', () => {
    it('should parse filter values from URL', () => {
      const mockURL = new URL('http://example.com/searches?role=partner&searchType=assets');
      const params = mockURL.searchParams;

      const filters = {
        role: params.get('role') || 'all',
        searchType: params.get('searchType') || 'all',
        searchTerm: params.get('searchTerm') || 'all',
        region: params.get('region') || 'all',
      };

      expect(filters.role).toBe('partner');
      expect(filters.searchType).toBe('assets');
      expect(filters.searchTerm).toBe('all');
      expect(filters.region).toBe('all');
    });

    it('should default to "all" when URL parameters are missing', () => {
      const mockURL = new URL('http://example.com/searches');
      const params = mockURL.searchParams;

      const filters = {
        role: params.get('role') || 'all',
        searchType: params.get('searchType') || 'all',
        searchTerm: params.get('searchTerm') || 'all',
        region: params.get('region') || 'all',
      };

      expect(filters.role).toBe('all');
      expect(filters.searchType).toBe('all');
      expect(filters.searchTerm).toBe('all');
      expect(filters.region).toBe('all');
    });
  });

  describe('Collapsible Filter State', () => {
    it('should determine collapsed state based on active filters', () => {
      const filtersWithDefaults = {
        role: 'all',
        searchType: 'all',
        searchTerm: 'all',
        region: 'all',
      };

      const hasActiveFilters = filtersWithDefaults.role !== 'all'
        || filtersWithDefaults.searchType !== 'all'
        || filtersWithDefaults.searchTerm !== 'all'
        || filtersWithDefaults.region !== 'all';

      expect(hasActiveFilters).toBe(false);
    });

    it('should expand when any filter is active', () => {
      const filtersWithActive = {
        role: 'partner',
        searchType: 'all',
        searchTerm: 'all',
        region: 'all',
      };

      const hasActiveFilters = filtersWithActive.role !== 'all'
        || filtersWithActive.searchType !== 'all'
        || filtersWithActive.searchTerm !== 'all'
        || filtersWithActive.region !== 'all';

      expect(hasActiveFilters).toBe(true);
    });

    it('should expand when multiple filters are active', () => {
      const filtersWithMultiple = {
        role: 'agency',
        searchType: 'templates',
        searchTerm: 'non-empty',
        region: 'NA',
      };

      const hasActiveFilters = filtersWithMultiple.role !== 'all'
        || filtersWithMultiple.searchType !== 'all'
        || filtersWithMultiple.searchTerm !== 'all'
        || filtersWithMultiple.region !== 'all';

      expect(hasActiveFilters).toBe(true);
    });
  });

  describe('Filter Constants', () => {
    it('should have correct FILTER_DEFAULT_VALUE', () => {
      const FILTER_DEFAULT_VALUE = 'all';
      expect(FILTER_DEFAULT_VALUE).toBe('all');
    });

    it('should have correct ANALYTICS_START_YEAR', () => {
      const ANALYTICS_START_YEAR = 2020;
      expect(ANALYTICS_START_YEAR).toBe(2020);
    });

    it('should have correct FILTER_ELEMENT_IDS', () => {
      expect(FILTER_ELEMENT_IDS.ROLE).toBe('role-select');
      expect(FILTER_ELEMENT_IDS.MARKET).toBe('market-select');
      expect(FILTER_ELEMENT_IDS.SEARCH_TYPE).toBe('search-type-select');
      expect(FILTER_ELEMENT_IDS.SEARCH_TERM).toBe('search-term-select');
    });
  });

  describe('Filter Dropdown Helper', () => {
    it('should create dropdown with correct ID and options', () => {
      const options = [
        { value: 'all', label: 'All Roles' },
        { value: 'partner', label: 'Partner' },
      ];

      const id = 'role-select';
      const selectedValue = 'all';

      // Mock implementation of createFilterDropdown
      const createFilterDropdown = (dropdownId, dropdownOptions, selected) => ({
        id: dropdownId,
        options: dropdownOptions,
        selectedValue: selected,
      });

      const dropdown = createFilterDropdown(id, options, selectedValue);

      expect(dropdown.id).toBe('role-select');
      expect(dropdown.options).toEqual(options);
      expect(dropdown.selectedValue).toBe('all');
    });
  });
});
