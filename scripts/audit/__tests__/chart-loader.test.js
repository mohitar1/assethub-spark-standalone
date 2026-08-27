import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';

// chart-loader caches an in-flight promise at module scope, so re-import a
// fresh copy per test to reset that state.
let loadChartJs;
let appended;
let mode; // 'load' | 'error'

beforeEach(async () => {
  appended = [];
  mode = 'load';
  vi.resetModules();
  vi.stubGlobal('window', {});
  vi.stubGlobal('document', {
    createElement: () => ({}),
    head: {
      appendChild(s) {
        appended.push(s);
        // simulate the browser firing load/error asynchronously
        Promise.resolve().then(() => {
          if (mode === 'error') s.onerror(new Error('404'));
          else s.onload();
        });
      },
    },
  });
  ({ default: loadChartJs } = await import('../chart-loader.js'));
});

afterEach(() => vi.unstubAllGlobals());

describe('loadChartJs', () => {
  it('injects both vendor scripts once and resolves', async () => {
    await loadChartJs();
    expect(appended).toHaveLength(2);
  });

  it('deduplicates concurrent callers (no double injection)', async () => {
    await Promise.all([loadChartJs(), loadChartJs(), loadChartJs()]);
    expect(appended).toHaveLength(2);
  });

  it('does nothing when window.Chart is already present', async () => {
    window.Chart = {};
    await loadChartJs();
    expect(appended).toHaveLength(0);
  });

  it('rejects on script load failure and allows a later retry', async () => {
    mode = 'error';
    await expect(loadChartJs()).rejects.toThrow();
    // failed load is not cached — a retry re-attempts injection
    mode = 'load';
    await loadChartJs();
    expect(appended.length).toBeGreaterThan(1);
  });
});
