import { CHART_JS_CDN, CHART_DATALABELS_CDN } from './asset-audit-constants.js';

// Cache the in-flight (or settled) load so concurrent callers share one
// injection. Cleared on failure so a later call can retry.
let loadPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function injectChartJs() {
  // Already available on the page — nothing to inject.
  if (window.Chart && window.ChartDataLabels) return;
  if (!window.Chart) await loadScript(CHART_JS_CDN);
  if (!window.ChartDataLabels) await loadScript(CHART_DATALABELS_CDN);
}

export default function loadChartJs() {
  // window.Chart already present → full no-op (datalabels ships with it here).
  if (window.Chart) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = injectChartJs().catch((err) => {
      // Don't cache a failed load; allow a later retry.
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}
