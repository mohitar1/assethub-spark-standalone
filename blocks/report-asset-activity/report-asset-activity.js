import loadChartJs from '../../scripts/audit/chart-loader.js';
import {
  ASSET_AUDIT_ACTION_LABELS,
  ASSET_AUDIT_ACTION_VALUES,
  ASSET_AUDIT_ROLE_OPTIONS,
  ASSET_AUDIT_USER_TYPES,
  defaultFrom,
} from '../../scripts/audit/asset-audit-constants.js';
import { getRoleColor, resolveRole, FALLBACK_ROLE_COLOR } from '../../scripts/analytics/analytics-constants.js';
import { buildAssetDetailsUrl } from '../../scripts/asset-id-utils.js';
import showToast from '../../scripts/toast/toast.js';
import { hasPermission, PERMISSIONS } from '../../scripts/auth/permissions.js';

// Brand-derived chart palette — built around the Fréscopa theme (teal --primary-color
// #00647D, maroon --text-color #58181D) plus harmonious supporting tones, so charts
// match the rest of the app instead of using a generic/Google default palette.
// Primary teal is reserved for `download` (the dominant action in this report).
const BRAND_SEQUENCE = [
  '#00647D', // brand teal (primary)
  '#A35E4B', // terracotta
  '#C99A3F', // warm gold
  '#58181D', // brand maroon (text-color)
  '#3D8FA3', // light teal
  '#6E7E5B', // sage
  '#8A6D3B', // bronze
  '#4F6472', // slate
];
const PALETTE = {
  download: '#00647D', // primary teal — dominant action
  view: '#3D8FA3', // light teal
  'share-link-copy': '#C99A3F', // warm gold
  'dm-url-copy': '#A35E4B', // terracotta
  'collection-add': '#58181D', // brand maroon
  internal: '#00647D',
  external: '#3D8FA3',
  unknown: '#8F8F8F', // neutral grey (matches --color-neutral-600)
};
const FALLBACK_COLORS = BRAND_SEQUENCE;

// Per-block AbortController so a re-decorate of the same block tears down the
// window-level popstate listener from the previous run (other listeners are on
// elements that are replaced each decorate and get GC'd).
const popstateControllers = new WeakMap();

function color(key, idx = 0) {
  return PALETTE[key] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

function readFiltersFromURL() {
  const p = new URL(window.location.href).searchParams;
  return {
    user: p.get('user') || '',
    country: p.get('country') || '',
    userType: p.get('userType') || '',
    role: p.get('role') || '',
    assetId: p.get('assetId') || '',
    action: p.get('action') || '',
    from: p.get('from') || defaultFrom(),
    to: p.get('to') || '',
  };
}

function readFormValues(form) {
  const d = new FormData(form);
  return Object.fromEntries([...d.entries()].map(([k, v]) => [k, v.trim()]));
}

function syncFiltersToURL(filters) {
  const url = new URL(window.location.href);
  Object.entries(filters).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
    else url.searchParams.delete(k);
  });
  window.history.pushState({}, '', url);
}

function buildSummaryURL(filters) {
  const url = new URL('/api/audit/summary', window.location.origin);
  Object.entries(filters).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
  return url.toString();
}

function buildExportURL(filters) {
  const url = new URL('/api/audit/export.csv', window.location.origin);
  Object.entries(filters).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
  return url.toString();
}

function scaffold(actions, userTypes, roleOptions) {
  const actionOptions = ['', ...actions].map((a) => `<option value="${a}">${a || 'All'}</option>`).join('');
  const userTypeOptions = ['', ...userTypes].map((t) => `<option value="${t}">${t || 'All'}</option>`).join('');
  const roleOptionsHtml = roleOptions.map(({ value, label }) => `<option value="${value}">${label}</option>`).join('');

  return `
    <div class="aar-title-row">
      <h1 class="aar-title">Asset Use Audit</h1>
      <a class="aar-export-btn" href="#">Export CSV</a>
    </div>
    <div class="aar-filters">
      <form class="aar-form" novalidate>
        <div class="aar-filter-bar">
          <label class="aar-label">From<input class="aar-input" name="from" type="date"></label>
          <label class="aar-label">To<input class="aar-input" name="to" type="date"></label>
          <div class="aar-filter-actions">
            <button class="aar-btn aar-btn-primary" type="submit">Apply</button>
          </div>
          <button class="aar-filter-toggle" type="button" aria-expanded="false" aria-controls="aar-extra-filters">
            Additional Filters
          </button>
        </div>
        <div class="aar-filter-extra" id="aar-extra-filters" hidden>
          <div class="aar-filter-group">
            <span class="aar-filter-group-label">User</span>
            <div class="aar-filter-group-body">
              <span class="aar-filter-item"><span class="aar-filter-item-label">Email:</span><input class="aar-input" name="user" type="text" placeholder="user@example.com"></span>
              <span class="aar-filter-item"><span class="aar-filter-item-label">Country:</span><input class="aar-input" name="country" type="text" placeholder="GB, unknown…"></span>
              <span class="aar-filter-item"><span class="aar-filter-item-label">User Type:</span><select class="aar-select" name="userType">${userTypeOptions}</select></span>
              <span class="aar-filter-item"><span class="aar-filter-item-label">Role:</span><select class="aar-select" name="role">${roleOptionsHtml}</select></span>
            </div>
          </div>
          <div class="aar-filter-group">
            <span class="aar-filter-group-label">Usage</span>
            <div class="aar-filter-group-body">
              <span class="aar-filter-item"><span class="aar-filter-item-label">Asset ID:</span><input class="aar-input" name="assetId" type="text"></span>
              <span class="aar-filter-item"><span class="aar-filter-item-label">Action:</span><select class="aar-select" name="action">${actionOptions}</select></span>
            </div>
          </div>
          <div class="aar-filter-extra-footer">
            <button class="aar-btn" type="reset">Reset Filters</button>
          </div>
        </div>
      </form>
    </div>
    <div class="aar-stats-row">
      <div class="aar-stat-card">
        <span class="aar-stat-value" id="aar-stat-total">—</span>
        <span class="aar-stat-label">Total Events</span>
      </div>
      <div class="aar-stat-card">
        <span class="aar-stat-value" id="aar-stat-users">—</span>
        <span class="aar-stat-label">Unique Users</span>
      </div>
      <div class="aar-stat-card">
        <span class="aar-stat-value" id="aar-stat-assets">—</span>
        <span class="aar-stat-label">Unique Assets</span>
      </div>
    </div>
    <div class="aar-charts" aria-busy="false">
      <div class="aar-chart-grid">
        <div class="aar-chart-cell aar-chart-cell-timeline">
          <h3 class="aar-chart-title">Activity over time</h3>
          <canvas class="aar-canvas" id="aar-canvas-timeline"></canvas>
        </div>
        <div class="aar-chart-cell">
          <h3 class="aar-chart-title">By Action</h3>
          <canvas class="aar-canvas" id="aar-canvas-action"></canvas>
        </div>
        <div class="aar-chart-cell">
          <h3 class="aar-chart-title">By User Type</h3>
          <canvas class="aar-canvas" id="aar-canvas-usertype"></canvas>
        </div>
        <div class="aar-chart-cell">
          <h3 class="aar-chart-title">By Role</h3>
          <canvas class="aar-canvas" id="aar-canvas-role"></canvas>
        </div>
        <div class="aar-chart-cell">
          <h3 class="aar-chart-title">By Country</h3>
          <canvas class="aar-canvas" id="aar-canvas-country"></canvas>
        </div>
        <div class="aar-chart-cell aar-chart-cell-wide">
          <h3 class="aar-chart-title">Top Assets (by events)</h3>
          <canvas class="aar-canvas" id="aar-canvas-asset"></canvas>
        </div>
      </div>
      <div class="aar-table-section">
        <h3 class="aar-table-title">Top Used Assets</h3>
        <div class="aar-table-wrap">
          <table class="aar-table">
            <thead>
              <tr>
                <th class="aar-th-rank">#</th>
                <th class="aar-th-thumb">Thumbnail</th>
                <th class="aar-th-id">Asset ID</th>
                ${actions.map((a) => `<th class="aar-th-num">${ASSET_AUDIT_ACTION_LABELS[a] ?? a}</th>`).join('')}
                <th class="aar-th-num">Total</th>
              </tr>
            </thead>
            <tbody id="aar-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>`;
}

function applyFormValues(form, filters) {
  Object.entries(filters).forEach(([k, v]) => {
    const el = form.elements[k];
    if (el) el.value = v;
  });
}

function aggregateRoleData(byRole) {
  const out = {};
  Object.entries(byRole ?? {}).forEach(([raw, count]) => {
    const label = raw === 'unknown' ? 'Unknown' : (resolveRole(raw) || 'Other');
    out[label] = (out[label] || 0) + count;
  });
  return out;
}

function pieConfig(labels, values, colorFn = color) {
  return {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map((l, i) => colorFn(l, i)),
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        datalabels: {
          color: '#fff',
          font: { weight: 'bold', size: 12 },
          formatter: (value, ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            if (!total) return '';
            const pct = Math.round((value / total) * 100);
            return pct >= 5 ? `${pct}%` : '';
          },
        },
      },
    },
  };
}

function timelineConfig(timelineData) {
  const { bucket, series, data } = timelineData;
  const labels = data.map((d) => d.bucket);
  const bucketLabel = { day: 'Day', week: 'Week', month: 'Month' }[bucket] ?? bucket;

  return {
    type: 'bar',
    data: {
      labels,
      datasets: series.map((s, i) => ({
        label: s,
        data: data.map((d) => d[s] ?? 0),
        backgroundColor: color(s, i),
        stack: 'events',
      })),
    },
    options: {
      responsive: true,
      scales: {
        x: { stacked: true, title: { display: true, text: bucketLabel } },
        y: {
          stacked: true, beginAtZero: true, ticks: { precision: 0, stepSize: 1 }, title: { display: true, text: 'Events' },
        },
      },
      plugins: {
        legend: { position: 'bottom' },
        datalabels: { display: false },
      },
    },
  };
}

export default async function decorate(block) {
  // Tear down any listener from a previous decorate of this same block.
  popstateControllers.get(block)?.abort();
  const abortController = new AbortController();
  popstateControllers.set(block, abortController);

  if (!hasPermission(window.user, PERMISSIONS.VIEW_AUDIT)) {
    block.innerHTML = '<p class="aar-denied">Access denied. You need the <strong>view-audit</strong> permission to view this report.</p>';
    return;
  }

  await loadChartJs();
  // eslint-disable-next-line no-undef
  window.Chart.register(window.ChartDataLabels);

  const state = { filters: readFiltersFromURL() };
  const chartInstances = {};

  block.innerHTML = scaffold(
    ASSET_AUDIT_ACTION_VALUES,
    ASSET_AUDIT_USER_TYPES,
    ASSET_AUDIT_ROLE_OPTIONS,
  );

  const form = block.querySelector('.aar-form');
  const statTotal = block.querySelector('#aar-stat-total');
  const statUsers = block.querySelector('#aar-stat-users');
  const statAssets = block.querySelector('#aar-stat-assets');
  const exportBtn = block.querySelector('.aar-export-btn');
  const chartsEl = block.querySelector('.aar-charts');
  const tableBody = block.querySelector('#aar-table-body');
  const toggleBtn = block.querySelector('.aar-filter-toggle');
  const extraFilters = block.querySelector('.aar-filter-extra');

  const EXTRA_FILTER_KEYS = ['user', 'country', 'userType', 'role', 'assetId', 'action'];

  function setExtraFiltersOpen(open) {
    extraFilters.hidden = !open;
    toggleBtn.setAttribute('aria-expanded', String(open));
  }

  toggleBtn.addEventListener('click', () => {
    setExtraFiltersOpen(extraFilters.hidden);
  });

  applyFormValues(form, state.filters);

  // Auto-expand if any extra filter is active from URL
  if (EXTRA_FILTER_KEYS.some((k) => state.filters[k])) setExtraFiltersOpen(true);

  function renderPie(id, dataObj, colorFn) {
    const canvas = block.querySelector(`#${id}`);
    if (!canvas) return;
    chartInstances[id]?.destroy();
    const entries = Object.entries(dataObj);
    if (!entries.length) return;
    const labels = entries.map(([k]) => k);
    const values = entries.map(([, v]) => v);
    chartInstances[id] = new window.Chart(canvas, pieConfig(labels, values, colorFn));
  }

  function roleColor(label) {
    return getRoleColor(label) || FALLBACK_ROLE_COLOR;
  }

  function renderTimeline(timelineData) {
    const canvas = block.querySelector('#aar-canvas-timeline');
    if (!canvas) return;
    chartInstances.timeline?.destroy();
    if (!timelineData?.data?.length) return;
    chartInstances.timeline = new window.Chart(canvas, timelineConfig(timelineData));
  }

  // Build cells with the DOM API (never innerHTML) — asset IDs come from the API.
  function renderTopAssets(rows = []) {
    if (!tableBody) return;
    tableBody.replaceChildren();
    if (!rows.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = ASSET_AUDIT_ACTION_VALUES.length + 4;
      td.className = 'aar-table-empty';
      td.textContent = 'No asset activity for the selected filters.';
      tr.appendChild(td);
      tableBody.appendChild(tr);
      return;
    }

    rows.forEach((row, i) => {
      const tr = document.createElement('tr');

      const rankTd = document.createElement('td');
      rankTd.className = 'aar-td-rank';
      rankTd.textContent = String(i + 1);
      tr.appendChild(rankTd);

      const thumbTd = document.createElement('td');
      thumbTd.className = 'aar-td-thumb';
      const img = document.createElement('img');
      img.className = 'aar-thumb';
      img.loading = 'lazy';
      img.alt = '';
      img.src = `/api/adobe/assets/${encodeURIComponent(row.encodedId)}/as/thumbnail.webp?width=80&preferwebp=true`;
      img.addEventListener('error', () => { img.style.visibility = 'hidden'; });
      thumbTd.appendChild(img);
      tr.appendChild(thumbTd);

      const idTd = document.createElement('td');
      const link = document.createElement('a');
      link.className = 'aar-asset-link';
      link.href = buildAssetDetailsUrl(row.assetId);
      link.textContent = `${row.displayId.slice(0, 8)}…`;
      link.title = row.displayId;
      idTd.appendChild(link);
      tr.appendChild(idTd);

      ASSET_AUDIT_ACTION_VALUES.forEach((action) => {
        const td = document.createElement('td');
        td.className = 'aar-td-num';
        td.textContent = (row.actions[action] ?? 0).toLocaleString();
        tr.appendChild(td);
      });

      const totalTd = document.createElement('td');
      totalTd.className = 'aar-td-num aar-td-total';
      totalTd.textContent = (row.total ?? 0).toLocaleString();
      tr.appendChild(totalTd);

      tableBody.appendChild(tr);
    });
  }

  async function loadSummary() {
    chartsEl?.setAttribute('aria-busy', 'true');
    try {
      const resp = await fetch(buildSummaryURL(state.filters), { credentials: 'include' });
      if (!resp.ok) {
        let msg = `HTTP ${resp.status}`;
        try { msg = (await resp.json()).error || msg; } catch { /* non-JSON */ }
        throw new Error(msg);
      }
      const data = await resp.json();

      if (statTotal) statTotal.textContent = (data.total ?? 0).toLocaleString();
      if (statUsers) statUsers.textContent = (data.uniqueUsers ?? 0).toLocaleString();
      if (statAssets) statAssets.textContent = (data.uniqueAssets ?? 0).toLocaleString();
      exportBtn?.setAttribute('href', buildExportURL(state.filters));

      renderTimeline(data.timeline);
      renderPie('aar-canvas-action', data.byAction);
      renderPie('aar-canvas-usertype', data.byUserType);
      renderPie('aar-canvas-role', aggregateRoleData(data.byRole), roleColor);
      renderPie('aar-canvas-country', data.byCountry);
      const byAssetShort = Object.fromEntries(
        Object.entries(data.byAsset ?? {}).map(([k, v]) => [`${k.slice(0, 8)}…`, v]),
      );
      renderPie('aar-canvas-asset', byAssetShort);
      renderTopAssets(data.topAssets);
    } finally {
      chartsEl?.setAttribute('aria-busy', 'false');
    }
  }

  async function applyFilters(changes = {}) {
    Object.assign(state.filters, changes);
    syncFiltersToURL(state.filters);
    await loadSummary();
  }

  // Filter form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await applyFilters(readFormValues(form));
    } catch (err) {
      showToast('Failed to load results — please try again.', 'error');
      console.error('[report-asset-activity] filter apply failed:', err);
    }
  });

  // Reset — restore defaults then reload
  form.addEventListener('reset', async () => {
    // Allow the native reset to fire first
    await new Promise((r) => { setTimeout(r, 0); });
    try {
      const defaults = { ...readFormValues(form), from: defaultFrom(), to: '' };
      await applyFilters(defaults);
      applyFormValues(form, state.filters);
    } catch (err) {
      showToast('Failed to reset filters.', 'error');
      console.error('[report-asset-activity] filter reset failed:', err);
    }
  });

  // Browser back / forward
  window.addEventListener('popstate', async () => {
    state.filters = readFiltersFromURL();
    applyFormValues(form, state.filters);
    try {
      await loadSummary();
    } catch (err) {
      showToast('Failed to reload report.', 'error');
      console.error('[report-asset-activity] popstate reload failed:', err);
    }
  }, { signal: abortController.signal });

  // Initial load
  try {
    await loadSummary();
  } catch (err) {
    showToast('Failed to load activity report.', 'error');
    console.error('[report-asset-activity] initial load failed:', err);
  }
}
