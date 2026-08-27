/* eslint-disable import/no-cycle, no-await-in-loop, no-plusplus, no-use-before-define */
/**
 * Download panel — pending asset archive downloads.
 */

import { setState, subscribe } from '../../../../scripts/cart-state.js';
import { getDynamicMediaClient, ARCHIVE_STATUS } from '../../clients/dynamicmedia-client.js';
import { renderWorkflowProgress } from './workflow-progress.js';
import { renderEmptyCartContent } from './empty-cart-content.js';
import { WorkflowStep, StepStatus } from './workflow-types.js';
import { getAppLabel } from '../../../../scripts/locale-utils.js';

let ph = null;
let panelOverlay = null;
let panelElement = null;
let unsubscribe = null;

let downloadAssetItems = [];
let archivePollingResults = new Map();
const pollingControllers = new Map();
let statusFilters = {
  [ARCHIVE_STATUS.PROCESSING]: true,
  [ARCHIVE_STATUS.COMPLETED]: true,
  [ARCHIVE_STATUS.FAILED]: true,
};
let expandedItems = new Set();

function resetDownloadState() {
  downloadAssetItems = [];
  archivePollingResults = new Map();
  statusFilters = {
    [ARCHIVE_STATUS.PROCESSING]: true,
    [ARCHIVE_STATUS.COMPLETED]: true,
    [ARCHIVE_STATUS.FAILED]: true,
  };
  expandedItems = new Set();
}

function loadDownloadAssetItems() {
  try {
    const stored = localStorage.getItem('downloadArchives');
    const parsed = stored ? JSON.parse(stored) : [];

    // Dedupe by archiveId (last-write-wins) to avoid duplicate rows.
    const byArchiveId = new Map();
    parsed.forEach((item) => {
      if (!item || !item.archiveId) return;
      byArchiveId.set(item.archiveId, item);
    });
    downloadAssetItems = Array.from(byArchiveId.values());

    if (downloadAssetItems.length !== parsed.length) {
      saveDownloadAssetItems();
    }
  } catch (error) {
    console.warn('Failed to load download archives from localStorage:', error);
    downloadAssetItems = [];
  }
}

function saveDownloadAssetItems() {
  localStorage.setItem('downloadArchives', JSON.stringify(downloadAssetItems));
  if (window.updateDownloadBadge) {
    window.updateDownloadBadge(downloadAssetItems.length);
  }
}

function getItemStatus(item) {
  const hasPollingStarted = archivePollingResults.has(item.archiveId);
  const pollingResult = archivePollingResults.get(item.archiveId);

  if (!hasPollingStarted) return ARCHIVE_STATUS.PROCESSING;
  if (pollingResult === null) return ARCHIVE_STATUS.FAILED;
  if (!pollingResult || pollingResult.length === 0) return ARCHIVE_STATUS.PROCESSING;
  return ARCHIVE_STATUS.COMPLETED;
}

async function pollArchiveStatus(archiveId) {
  const existingResult = archivePollingResults.get(archiveId);
  if (existingResult !== undefined && existingResult.length > 0) {
    return existingResult;
  }
  if (pollingControllers.has(archiveId)) return undefined;

  const client = getDynamicMediaClient();
  if (!client) return undefined;

  const controller = new AbortController();
  pollingControllers.set(archiveId, controller);

  try {
    const maxRetries = 60;
    let retryCount = 0;
    let result;

    do {
      if (controller.signal.aborted) return [];

      const archiveStatus = await client.getAssetsArchiveStatus(archiveId);
      // eslint-disable-next-line no-console
      console.warn(`[pollArchiveStatus] archiveId=${archiveId} retry=${retryCount}`, JSON.stringify(archiveStatus));
      const status = archiveStatus?.data?.status;

      if (status === ARCHIVE_STATUS.FAILED) {
        result = null;
        break;
      }
      if (status === ARCHIVE_STATUS.COMPLETED) {
        const files = archiveStatus?.data?.files;
        if (files?.length > 0) {
          result = files.map((f) => (typeof f === 'string' ? f : f.href || f.url)).filter(Boolean);
          break;
        }
      }

      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(resolve, 5000);
        controller.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new Error('Polling cancelled'));
        });
      });
      retryCount += 1;
    } while (retryCount < maxRetries);

    if (!result || (Array.isArray(result) && result.length === 0)) {
      return null;
    }
    return result;
  } catch (error) {
    if (error.message === 'Polling cancelled') return [];
    return null;
  } finally {
    pollingControllers.delete(archiveId);
  }
}

function startPollingForAllItems() {
  downloadAssetItems.forEach((item) => {
    if (!archivePollingResults.has(item.archiveId)) {
      archivePollingResults.set(item.archiveId, []);
      pollArchiveStatus(item.archiveId)
        .then((result) => {
          archivePollingResults.set(item.archiveId, result);
          render();
        })
        .catch(() => {
          archivePollingResults.set(item.archiveId, null);
          render();
        });
    }
  });
}

function cancelAllPolling() {
  pollingControllers.forEach((controller) => controller.abort());
  pollingControllers.clear();
  archivePollingResults = new Map();
}

function clearAllDownloads() {
  cancelAllPolling();
  downloadAssetItems = [];
  saveDownloadAssetItems();
  render();
}

function removeArchiveItem(item) {
  const { archiveId } = item;
  const controller = pollingControllers.get(archiveId);
  if (controller) {
    controller.abort();
    pollingControllers.delete(archiveId);
  }
  archivePollingResults.delete(archiveId);
  downloadAssetItems = downloadAssetItems.filter((entry) => entry.archiveId !== archiveId);
  saveDownloadAssetItems();
  render();
}

async function handleDownload(archiveId) {
  const pollingResult = archivePollingResults.get(archiveId);
  const client = getDynamicMediaClient();
  if (!pollingResult || !client) return;

  const downloadPromises = pollingResult.map((url) => client.downloadFromUrl(url, 'Assets.zip'));
  await Promise.allSettled(downloadPromises);
}

function processRenditions(item) {
  if (!item.assetsRenditions?.length) return [];

  const processedRenditions = [];
  item.assetsRenditions.forEach((assetRendition) => {
    if (!assetRendition.assetName || !assetRendition.renditions) return;
    const nameWithoutExtension = assetRendition.assetName.replace(/\.[^/.]+$/, '');
    assetRendition.renditions.forEach((rendition) => {
      if (rendition.startsWith('preset_')) {
        processedRenditions.push(`${nameWithoutExtension}_${rendition.replace('preset_', '')}`);
      } else if (rendition === 'original') {
        processedRenditions.push(assetRendition.assetName);
      } else {
        processedRenditions.push(`${nameWithoutExtension}_${rendition}`);
      }
    });
  });
  return processedRenditions;
}

function cleanupDownloadPanel() {
  document.body.classList.remove('download-panel-open');

  if (panelElement?.escapeHandler) {
    document.removeEventListener('keydown', panelElement.escapeHandler);
  }
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  cancelAllPolling();
  if (panelOverlay) {
    panelOverlay.remove();
    panelOverlay = null;
  }
  panelElement = null;
  resetDownloadState();
}

function renderDownloadItemRow(item, t) {
  const fileCount = item.assetsRenditions.reduce(
    (acc, assetRendition) => acc + assetRendition.renditions.length,
    0,
  );
  const isExpanded = expandedItems.has(item.archiveId);
  const processedRenditions = processRenditions(item);
  const itemStatus = getItemStatus(item);
  const isLoading = itemStatus === ARCHIVE_STATUS.PROCESSING;
  const isReady = itemStatus === ARCHIVE_STATUS.COMPLETED;
  const isFailed = itemStatus === ARCHIVE_STATUS.FAILED;

  return `
    <div class="download-item-container" data-archive-id="${item.archiveId}">
      <div class="download-item-row">
        <div class="col-zip-files" data-action="toggle-expand">
          <div class="zip-file-info">
            <span class="expand-icon ${isExpanded ? 'expanded' : 'collapsed'}">
              ${isExpanded ? '&#9660;' : '&#9654;'}
            </span>
            <span class="zip-filename">Assets.zip</span>
          </div>
        </div>
        <div class="col-file-count" data-action="toggle-expand">${fileCount}</div>
        <div class="col-status">
          ${isLoading ? `
            <div class="status-badge processing-status"
                 data-tooltip="${t('processingTooltip', 'Please wait while your download is prepared')}"
                 data-tooltip-position="top">
              <span>PROCESSING</span>
              <span class="fa-spinner"></span>
            </div>
          ` : ''}
          ${isFailed ? '<span class="status-badge status-failed">Failed</span>' : ''}
          ${isReady ? `
            <button class="download-btn primary-button" data-action="download">Download</button>
          ` : ''}
        </div>
        <div class="col-action">
          <button class="delete-button" data-action="remove"
            aria-label="${t('removeItem', 'Remove item')}"
            data-tooltip="${t('removeItem', 'Remove item')}" data-tooltip-position="left">
            <img src="/icons/delete.svg" alt="${t('removeItem', 'Remove item')}">
          </button>
        </div>
      </div>
      ${isExpanded ? `
        <div class="download-renditions-expanded">
          <div class="rendition-list">
            <div class="rendition-item">FILES ADDED TO ZIP:</div>
            ${processedRenditions.map((rendition) => `
              <div class="rendition-item">${rendition}</div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderAssetsContent() {
  const t = (key, fallback) => (ph ? ph(key, fallback) : fallback);
  const filteredItems = downloadAssetItems.filter((item) => {
    const status = getItemStatus(item);
    return statusFilters[status];
  });
  const anyArchiveCompleted = downloadAssetItems.some(
    (item) => getItemStatus(item) === ARCHIVE_STATUS.COMPLETED,
  );
  const stepStatus = {
    [WorkflowStep.CART]: StepStatus.SUCCESS,
    [WorkflowStep.DOWNLOAD]: anyArchiveCompleted ? StepStatus.SUCCESS : StepStatus.CURRENT,
    [WorkflowStep.CLOSE_DOWNLOAD]: StepStatus.INIT,
  };

  if (downloadAssetItems.length === 0) {
    return renderEmptyCartContent({ message: t('noPendingDownloads', 'No pending downloads') }, true);
  }

  return `
    <div class="download-panel-assets-wrapper">
      ${renderWorkflowProgress({
    activeStep: WorkflowStep.DOWNLOAD,
    stepStatus,
    t,
  })}

      <div class="download-status-filters">
        <label class="status-filter">
          <input type="checkbox" data-status="${ARCHIVE_STATUS.PROCESSING}"
            ${statusFilters[ARCHIVE_STATUS.PROCESSING] ? 'checked' : ''} />
          <span class="checkmark"></span>
          ${t('inProgress', 'In Progress')}
        </label>
        <label class="status-filter">
          <input type="checkbox" data-status="${ARCHIVE_STATUS.COMPLETED}"
            ${statusFilters[ARCHIVE_STATUS.COMPLETED] ? 'checked' : ''} />
          <span class="checkmark"></span>
          ${t('readyToDownload', 'Ready to Download')}
        </label>
        <label class="status-filter">
          <input type="checkbox" data-status="${ARCHIVE_STATUS.FAILED}"
            ${statusFilters[ARCHIVE_STATUS.FAILED] ? 'checked' : ''} />
          <span class="checkmark"></span>
          ${t('failed', 'Failed')}
        </label>
      </div>

      ${filteredItems.length === 0
    ? renderEmptyCartContent({ message: t('noItemsMatchFilters', 'No items match the selected filters') }, true)
    : `
        <div class="download-table-container">
          <div class="download-table-header">
            <div class="col-zip-files">${t('zipFiles', 'ZIP FILES')}</div>
            <div class="col-file-count">${t('noOfFiles', 'NO OF FILES')}</div>
            <div class="col-status">${t('status', 'STATUS')}</div>
            <div class="col-action">${t('action', 'ACTION')}</div>
          </div>
          <div class="download-items-table">
            ${filteredItems.map((item) => renderDownloadItemRow(item, t)).join('')}
          </div>
        </div>
      `}

      <div class="download-panel-footer">
        <button class="close-btn secondary-button" data-action="close">${t('close', 'Close')}</button>
      </div>
    </div>
  `;
}

function bindEvents() {
  panelElement.querySelector('.close-button')?.addEventListener('click', closeDownloadPanel);

  panelElement.querySelectorAll('.status-filter input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      const { status } = checkbox.dataset;
      if (status) {
        statusFilters[status] = e.target.checked;
        render();
      }
    });
  });

  panelElement.querySelectorAll('.download-item-container').forEach((item) => {
    const { archiveId } = item.dataset;

    item.querySelectorAll('[data-action="toggle-expand"]').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        if (expandedItems.has(archiveId)) expandedItems.delete(archiveId);
        else expandedItems.add(archiveId);
        render();
      });
    });

    item.querySelector('[data-action="download"]')
      ?.addEventListener('click', () => handleDownload(archiveId));

    item.querySelector('[data-action="remove"]')
      ?.addEventListener('click', () => {
        const archiveItem = downloadAssetItems.find((i) => i.archiveId === archiveId);
        if (archiveItem) removeArchiveItem(archiveItem);
      });
  });

  panelElement.querySelector('[data-action="close"]')
    ?.addEventListener('click', closeDownloadPanel);

  panelElement.querySelector('[data-action="clear-all-downloads"]')
    ?.addEventListener('click', clearAllDownloads);
}

function render() {
  const contentEl = panelElement.querySelector('.base-panel-content');
  const scrollTop = contentEl ? contentEl.scrollTop : 0;
  const t = (key, fallback) => (ph ? ph(key, fallback) : fallback);

  panelElement.innerHTML = `
    <div class="base-panel-header">
      <h2>${t('downloads', 'Downloads')}</h2>
      <div class="header-actions">
        <button class="header-icon-btn" data-action="clear-all-downloads"
          aria-label="${t('clearAllDownloads', 'Clear all downloads')}">
          <img src="/icons/clear-cart-icon.svg" alt="${t('clearAllDownloads', 'Clear all downloads')}" />
        </button>
        <button class="close-button" aria-label="${t('close', 'Close')}">✕</button>
      </div>
    </div>
    <div class="base-panel-content">
      ${renderAssetsContent()}
    </div>
  `;

  const newContentEl = panelElement.querySelector('.base-panel-content');
  if (newContentEl) newContentEl.scrollTop = scrollTop;
  bindEvents();
}

export async function createDownloadPanel() {
  if (!ph) ph = await getAppLabel();

  cleanupDownloadPanel();
  loadDownloadAssetItems();
  document.body.classList.add('download-panel-open');

  panelOverlay = document.createElement('div');
  panelOverlay.className = 'base-panel-overlay portal-modal';
  panelOverlay.addEventListener('click', (e) => {
    if (e.target === panelOverlay) closeDownloadPanel();
  });

  panelElement = document.createElement('div');
  panelElement.className = 'base-panel download-panel';
  panelOverlay.appendChild(panelElement);
  document.body.appendChild(panelOverlay);

  render();
  startPollingForAllItems();

  unsubscribe = subscribe((state, prevState, updates) => {
    if (updates.isDownloadPanelOpen !== undefined && !state.isDownloadPanelOpen) {
      closeDownloadPanel();
    }
  });

  const handleEscape = (e) => {
    if (e.key === 'Escape') closeDownloadPanel();
  };
  document.addEventListener('keydown', handleEscape);
  panelElement.escapeHandler = handleEscape;
}

export function closeDownloadPanel() {
  cleanupDownloadPanel();
  setState({ isDownloadPanelOpen: false });
}

export default {
  createDownloadPanel,
  closeDownloadPanel,
};
