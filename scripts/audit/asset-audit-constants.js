export const ASSET_AUDIT_ACTIONS = {
  VIEW: 'view',
  DOWNLOAD: 'download',
  SHARE_LINK_COPY: 'share-link-copy',
  DM_URL_COPY: 'dm-url-copy',
  COLLECTION_ADD: 'collection-add',
};

export const ASSET_AUDIT_ACTION_VALUES = Object.values(ASSET_AUDIT_ACTIONS);

export const ASSET_ACTION_EVENT = 'asset:action';

export const ASSET_AUDIT_ACTION_LABELS = {
  view: 'Views',
  download: 'Downloads',
  'share-link-copy': 'Share Links',
  'dm-url-copy': 'DM URLs',
  'collection-add': 'Collection Adds',
};

export const ASSET_AUDIT_USER_TYPES = ['internal', 'external', 'unknown'];

export const ASSET_AUDIT_ROLE_FILTER_VALUES = ['associate', 'agency', 'partner'];

export const ASSET_AUDIT_ROLE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'associate', label: 'Associate' },
  { value: 'agency', label: 'Agency' },
  { value: 'partner', label: 'Partner' },
];

export const ASSET_AUDIT_STACK_BY_VALUES = ['action', 'userType', 'role', 'country'];

export const CHART_JS_CDN = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
export const CHART_DATALABELS_CDN = 'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js';

/**
 * Default "from" date (YYYY-MM-DD): first day of the previous month.
 * @returns {string}
 */
export function defaultFrom() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}
