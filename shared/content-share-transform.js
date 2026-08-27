/**
 * Shared URL transformation functions for /content/share/ search URLs.
 * Used by both the Cloudflare worker (ESM import) and migration scripts (CJS require).
 *
 * Transforms old AEM Asset Share search URLs to the new ContentAI search format:
 *   /content/share/us/en/search-assets.html?fulltext=sunset
 *   → /en/search/assets?query=sunset
 */

function extractFacetName(property) {
  if (!property) return '';
  const match = property.match(/metadata\/([^/]+)$/);
  if (match) return match[1].replace(/:/g, '-');
  return '';
}

function mapDatePropertyToFieldName(property) {
  const mappings = {
    './jcr:created': 'repo-createDate',
    './jcr:content/jcr:lastModified': 'repo-modifyDate',
    './jcr:content/metadata/dc:modified': 'repo-modifyDate',
  };
  return mappings[property] || null;
}

function dateStringToEpoch(dateStr, isEndOfDay = false) {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const date = new Date(Date.UTC(year, month, day));
  if (isEndOfDay) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return Math.floor(date.getTime() / 1000);
}

function extractDateRangeFilters(searchParams) {
  const numericFilters = [];
  const dateRangeGroups = {};

  [...searchParams.entries()].forEach(([key, value]) => {
    const groupMatch = key.match(/^(\d+)_group\.daterange\.(.+)$/);
    if (groupMatch) {
      const groupNum = groupMatch[1];
      const paramName = groupMatch[2];
      if (!dateRangeGroups[groupNum]) dateRangeGroups[groupNum] = {};
      dateRangeGroups[groupNum][paramName] = value;
    }
  });

  Object.values(dateRangeGroups).forEach((groupParams) => {
    const { property, lowerBound, upperBound } = groupParams;
    if (property) {
      const fieldName = mapDatePropertyToFieldName(property);
      if (fieldName) {
        if (lowerBound) {
          numericFilters.push(`${fieldName} >= ${dateStringToEpoch(lowerBound, false)}`);
        }
        if (upperBound) {
          numericFilters.push(`${fieldName} <= ${dateStringToEpoch(upperBound, true)}`);
        }
      }
    }
  });

  return numericFilters;
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  let decoded = str;
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  };
  Object.entries(entities).forEach(([entity, char]) => {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  });
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  return decoded;
}

function extractActiveFiltersContentAI(searchParams) {
  const filters = {};
  const groups = {};

  [...searchParams.entries()].forEach(([key, value]) => {
    const groupMatch = key.match(/^(\d+)_group\.propertyvalues\.(.+)$/);
    if (groupMatch) {
      const groupNum = groupMatch[1];
      const paramName = groupMatch[2];
      if (!groups[groupNum]) groups[groupNum] = {};
      groups[groupNum][paramName] = value;
    }
  });

  Object.values(groups).forEach((groupParams) => {
    const valueKeys = Object.keys(groupParams).filter((k) => k.includes('_values'));
    if (valueKeys.length > 0 && groupParams.property) {
      const facetName = extractFacetName(groupParams.property);
      if (facetName) {
        const values = valueKeys.map((vk) => groupParams[vk]).filter((v) => v);
        if (values.length > 0) {
          if (!filters[facetName]) filters[facetName] = [];
          filters[facetName].push(...values);
        }
      }
    }
  });

  return filters;
}

function buildFacetFiltersObjectContentAIFromRaw(rawFilters) {
  const facetFilters = {};
  Object.entries(rawFilters).forEach(([facetKey, values]) => {
    if (!facetFilters[facetKey]) facetFilters[facetKey] = {};
    values.forEach((value) => {
      facetFilters[facetKey][value] = true;
    });
  });
  return facetFilters;
}

function rawFiltersToQueryString(rawFilters) {
  if (Object.keys(rawFilters || {}).length === 0) return '';
  const jsonString = JSON.stringify(buildFacetFiltersObjectContentAIFromRaw(rawFilters));
  return `facetFilters=${encodeURIComponent(jsonString)}`;
}

function transformSearchHtmlUrlContentAI(url, searchPath) {
  try {
    const decodedUrl = decodeHtmlEntities(url);
    const urlObj = new URL(decodedUrl, 'https://dummy.com');
    const fulltext = urlObj.searchParams.get('fulltext');
    const rawFilters = extractActiveFiltersContentAI(urlObj.searchParams);
    const filterQueryString = rawFiltersToQueryString(rawFilters);
    const numericFilters = extractDateRangeFilters(urlObj.searchParams);
    const numericFiltersString = numericFilters.length > 0
      ? `numericFilters=${encodeURIComponent(JSON.stringify(numericFilters))}`
      : '';

    const params = [];
    if (fulltext) {
      params.push(`query=${encodeURIComponent(decodeURIComponent(fulltext))}`);
    } else {
      params.push('query=');
    }
    if (filterQueryString) params.push(filterQueryString);
    if (numericFiltersString) params.push(numericFiltersString);

    if (params.length > 1 || (params.length === 1 && params[0] !== 'query=')) {
      return `${searchPath}?${params.join('&')}`;
    }

    return searchPath;
  } catch (error) {
    return null;
  }
}

function transformSearchUrlContentAI(url) {
  if (!url) return url;

  const localeMatch = url.match(/\/content\/share\/(us\/en|jp\/ja)\//);
  const lang = localeMatch ? localeMatch[1].split('/')[1] : null;

  if (localeMatch && url.includes(`/content/share/${localeMatch[1]}/search-assets/details`)) {
    return url;
  }

  if (localeMatch && url.includes('/local-customization/template-search.html')) {
    const transformed = transformSearchHtmlUrlContentAI(url, `/${lang}/search/templates`);
    if (transformed) return transformed;
  }
  if (localeMatch && url.includes('/products/search-product-assets.html')) {
    const transformed = transformSearchHtmlUrlContentAI(url, `/${lang}/search/products`);
    if (transformed) return transformed;
  }
  if (localeMatch && url.includes('/search-digital-twins.html')) {
    const transformed = transformSearchHtmlUrlContentAI(url, `/${lang}/search/digital-twin`);
    if (transformed) return transformed;
  }
  if (localeMatch && url.includes('/search-assets-pacs.html')) {
    const transformed = transformSearchHtmlUrlContentAI(url, `/${lang}/search/search-assets-pacs`);
    if (transformed) return transformed;
  }
  if (localeMatch && url.includes('/search-assets.html')) {
    const transformed = transformSearchHtmlUrlContentAI(url, `/${lang}/search/assets`);
    if (transformed) return transformed;
  }

  return url;
}

module.exports = {
  extractFacetName,
  mapDatePropertyToFieldName,
  dateStringToEpoch,
  extractDateRangeFilters,
  decodeHtmlEntities,
  extractActiveFiltersContentAI,
  buildFacetFiltersObjectContentAIFromRaw,
  transformSearchHtmlUrlContentAI,
  transformSearchUrlContentAI,
};
