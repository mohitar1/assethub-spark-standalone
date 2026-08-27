/**
 * Reusable assertion helpers for integration tests.
 *
 * These work with the response shape returned by makeRequest():
 *   { status, headers, body, raw }
 */

import { expect } from 'vitest';
import { getCurrentEnv } from './env.js';

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Assert the response status matches an expected value or array of values.
 */
export function expectStatus(response, expected) {
  if (Array.isArray(expected)) {
    expect(expected).toContain(response.status);
  } else {
    expect(response.status).toBe(expected);
  }
}

/* ------------------------------------------------------------------ */
/*  Field helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Resolve a dot-path like "hits[0].assetId" against an object.
 * Returns undefined when any segment is missing.
 */
function resolvePath(obj, path) {
  return path
    .replace(/\[(\d+)]/g, '.$1') // hits[0] → hits.0
    .split('.')
    .reduce((cur, key) => (cur != null ? cur[key] : undefined), obj);
}

/**
 * Assert that every path in `fields` exists (is not undefined) on `obj`.
 */
export function expectFields(obj, fields) {
  fields.forEach((field) => {
    const value = resolvePath(obj, field);
    expect(value, `Expected field "${field}" to exist`).not.toBeUndefined();
  });
}

/**
 * Assert that a nested field at `path` within `obj` has at least `min` items.
 */
export function expectMinLength(obj, field, min) {
  const arr = resolvePath(obj, field);
  expect(Array.isArray(arr), `Expected "${field}" to be an array`).toBe(true);
  expect(arr.length, `Expected "${field}" to have >= ${min} items`).toBeGreaterThanOrEqual(min);
}

/**
 * Assert nested field types.
 * `typeMap` is e.g. { 'metrics.totalUsers': 'number', 'charts': 'object' }
 */
export function expectNestedTypes(obj, typeMap) {
  Object.entries(typeMap).forEach(([path, expectedType]) => {
    const value = resolvePath(obj, path);
    expect(value, `Expected field "${path}" to exist`).not.toBeUndefined();
    // eslint-disable-next-line valid-typeof
    expect(typeof value, `Expected "${path}" to be ${expectedType}`).toBe(expectedType);
  });
}

/* ------------------------------------------------------------------ */
/*  Page helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Assert a page response loaded successfully.
 */
export function expectPageLoads(response) {
  expect(response.status).toBe(200);
  const ct = response.headers.get('content-type') || '';
  expect(ct).toContain('text/html');
}

/**
 * Assert the HTML body contains each of the given strings.
 */
export function expectHtmlContains(html, strings) {
  strings.forEach((s) => {
    expect(html, `Expected page to contain "${s}"`).toContain(s);
  });
}

/* ------------------------------------------------------------------ */
/*  Config-driven assertion runner                                     */
/* ------------------------------------------------------------------ */

/**
 * Given a test spec's `expect` + optional `expectByEnv`, return the merged
 * expectations for the current environment.
 */
export function getExpectations(spec) {
  const env = getCurrentEnv();
  const base = { ...spec.expect };
  const override = spec.expectByEnv?.[env];
  return override ? { ...base, ...override } : base;
}

/**
 * Run all assertions described by an expectation object against a response.
 */
export function assertExpectations(response, expectations) {
  // Status
  if (expectations.status != null) {
    expectStatus(response, expectations.status);
  }

  // Content-type
  if (expectations.contentType) {
    const ct = response.headers.get('content-type') || '';
    expect(ct).toContain(expectations.contentType);
  }

  // Field existence (JSON body)
  if (expectations.hasFields) {
    expectFields(response.body, expectations.hasFields);
  }

  // Min-length (JSON body)
  if (expectations.minLength) {
    const { field, min } = expectations.minLength;
    expectMinLength(response.body, field, min);
  }

  // Nested type checks
  if (expectations.nested) {
    expectNestedTypes(response.body, expectations.nested);
  }

  // HTML contains (string body)
  if (expectations.contains) {
    expect(typeof response.body).toBe('string');
    expectHtmlContains(response.body, expectations.contains);
  }
}
