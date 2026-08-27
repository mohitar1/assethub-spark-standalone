import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import initAssetAuditTracking, { dispatchAssetAction } from '../asset-audit.js';
import { ASSET_AUDIT_ACTIONS, ASSET_ACTION_EVENT } from '../asset-audit-constants.js';

describe('dispatchAssetAction', () => {
  let dispatched;

  beforeEach(() => {
    dispatched = [];
    vi.stubGlobal('document', { dispatchEvent: (e) => { dispatched.push(e); return true; } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('dispatches an asset:action event with the action and assetId', () => {
    const result = dispatchAssetAction(ASSET_AUDIT_ACTIONS.VIEW, 'asset-1');
    expect(result).toBe(true);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe(ASSET_ACTION_EVENT);
    expect(dispatched[0].detail).toEqual({ action: 'view', assetId: 'asset-1' });
  });

  it('merges extra detail', () => {
    dispatchAssetAction(ASSET_AUDIT_ACTIONS.DOWNLOAD, 'asset-2', { source: 'grid' });
    expect(dispatched[0].detail).toEqual({ action: 'download', assetId: 'asset-2', source: 'grid' });
  });

  it('does not dispatch when assetId is missing', () => {
    expect(dispatchAssetAction(ASSET_AUDIT_ACTIONS.VIEW, '')).toBe(false);
    expect(dispatchAssetAction(ASSET_AUDIT_ACTIONS.VIEW, undefined)).toBe(false);
    expect(dispatchAssetAction(ASSET_AUDIT_ACTIONS.VIEW, null)).toBe(false);
    expect(dispatched).toHaveLength(0);
  });
});

describe('initAssetAuditTracking', () => {
  let handler;
  let fetchMock;

  beforeEach(() => {
    handler = null;
    fetchMock = vi.fn(() => Promise.resolve());
    vi.stubGlobal('document', {
      addEventListener: (name, fn) => { if (name === ASSET_ACTION_EVENT) handler = fn; },
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    initAssetAuditTracking();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('POSTs a valid event to /api/audit/event', () => {
    handler({ detail: { action: ASSET_AUDIT_ACTIONS.VIEW, assetId: 'a1' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/audit/event');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toMatchObject({ action: 'view', assetId: 'a1' });
  });

  it('forwards extra detail in the POST body', () => {
    handler({ detail: { action: ASSET_AUDIT_ACTIONS.DOWNLOAD, assetId: 'a2', source: 'grid' } });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ action: 'download', assetId: 'a2', source: 'grid' });
  });

  it('ignores events with an unknown action', () => {
    handler({ detail: { action: 'bogus', assetId: 'a1' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignores events missing action or assetId', () => {
    handler({ detail: { action: ASSET_AUDIT_ACTIONS.VIEW } });
    handler({ detail: { assetId: 'a1' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
