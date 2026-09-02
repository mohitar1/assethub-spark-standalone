/**
 * Per-asset run report + summary. Records the outcome of each asset
 * and yields a machine-readable summary plus a process exit code (non-zero on hard
 * failures).
 */

export const OUTCOME = {
  ENRICHED: 'enriched',
  SKIPPED: 'skipped',
  FAILED: 'failed',
};

export class Report {
  constructor() {
    this.assets = [];
    this.startedAt = new Date().toISOString();
    this.context = {};
    this.representatives = null;
    this.categoryCoverage = null;
  }

  record(assetId, outcome, detail = {}) {
    this.assets.push({ assetId, outcome, ...detail });
  }

  setRepresentatives(representatives) {
    this.representatives = representatives;
  }

  setCategoryCoverage(categoryCoverage) {
    this.categoryCoverage = categoryCoverage;
  }

  setContext(context = {}) {
    this.context = { ...this.context, ...context };
  }

  counts() {
    return this.assets.reduce((acc, a) => {
      acc[a.outcome] = (acc[a.outcome] || 0) + 1;
      return acc;
    }, {});
  }

  hasFailures() {
    return this.assets.some((a) => a.outcome === OUTCOME.FAILED);
  }

  exitCode() {
    return this.hasFailures() ? 1 : 0;
  }

  toJSON() {
    const json = {
      startedAt: this.startedAt,
      finishedAt: new Date().toISOString(),
      counts: this.counts(),
      assets: this.assets,
    };
    if (Object.keys(this.context).length > 0) json.context = this.context;
    if (this.representatives) json.representatives = this.representatives;
    if (this.categoryCoverage) json.categoryCoverage = this.categoryCoverage;
    return json;
  }

  summaryLine() {
    const c = this.counts();
    const parts = Object.entries(c).map(([k, v]) => `${v} ${k}`);
    return parts.length ? parts.join(', ') : 'no assets processed';
  }
}
