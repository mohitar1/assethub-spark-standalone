/* eslint-disable import/no-cycle, no-use-before-define */
/**
 * Cart panel — assets-only workflow (Cart → Download renditions).
 */

import { getState, setState, subscribe } from '../../../../scripts/cart-state.js';
import { getAppLabel } from '../../../../scripts/locale-utils.js';
import cart from '../../../../scripts/utils/cart-service.js';
import { createDownloadRenditionsContent } from '../download-renditions/download-renditions-content.js';
import {
  WorkflowStep,
  StepStatus,
  createDefaultStepStatuses,
} from './workflow-types.js';
import { renderCartPanelAssets } from './cart-panel-assets.js';

let panelOverlay = null;
let panelElement = null;
let unsubscribe = null;
let ph = null;

let activeStep = WorkflowStep.CART;
let stepStatus = createDefaultStepStatuses();
let executedSteps = [WorkflowStep.CART];
let showDownloadContent = false;
let downloadAssets = [];

function resetWorkflowState() {
  activeStep = WorkflowStep.CART;
  stepStatus = createDefaultStepStatuses();
  executedSteps = [WorkflowStep.CART];
  showDownloadContent = false;
  downloadAssets = [];
}

function getStepTitle(step) {
  const titleMap = {
    [WorkflowStep.CART]: ph('cartWorkflowCart', 'Cart'),
    [WorkflowStep.DOWNLOAD]: ph('cartWorkflowDownload', 'Download'),
    [WorkflowStep.CLOSE_DOWNLOAD]: ph('cartWorkflowDownload', 'Download'),
  };
  return titleMap[step] || ph('cartWorkflowCart', 'Cart');
}

function cleanupCartPanel() {
  document.body.classList.remove('cart-panel-open');

  if (panelElement?.escapeHandler) {
    document.removeEventListener('keydown', panelElement.escapeHandler);
  }

  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  if (panelOverlay) {
    panelOverlay.remove();
    panelOverlay = null;
  }
  panelElement = null;
  resetWorkflowState();
}

function handleDownloadCompleted(success, successfulAssets, options) {
  if (!success) {
    stepStatus[WorkflowStep.DOWNLOAD] = StepStatus.FAILURE;
    render(options);
    return;
  }

  stepStatus[WorkflowStep.DOWNLOAD] = StepStatus.SUCCESS;
  activeStep = WorkflowStep.CLOSE_DOWNLOAD;

  if (successfulAssets?.length > 0) {
    const successfulAssetIds = successfulAssets.map((asset) => asset.assetId);
    cart.remove(successfulAssetIds);

    const state = getState();
    if (state.cartAssetItems.length > 0) {
      executedSteps = executedSteps.filter((step) => step !== WorkflowStep.DOWNLOAD);
      activeStep = WorkflowStep.CART;
      stepStatus[WorkflowStep.CART] = StepStatus.CURRENT;
      stepStatus[WorkflowStep.DOWNLOAD] = StepStatus.INIT;
    } else {
      closeCartPanel();
      return;
    }
  }

  showDownloadContent = false;
  render(options);
}

function renderContent(state) {
  const { cartAssetItems = [] } = state;

  if (activeStep === WorkflowStep.DOWNLOAD && showDownloadContent && downloadAssets.length > 0) {
    return `
      <div class="cart-panel-assets-wrapper">
        <div class="download-renditions-container"></div>
      </div>
    `;
  }

  return renderCartPanelAssets({
    cartAssetItems,
    activeStep,
    stepStatus,
    t: ph,
  });
}

function bindEvents(options) {
  const { onRemoveItem } = options;
  const state = getState();
  const { cartAssetItems = [] } = state;

  panelElement.querySelector('.close-button')
    ?.addEventListener('click', closeCartPanel);

  panelElement.querySelectorAll('[data-action="remove-item"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const { assetId } = btn.dataset;
      const item = cartAssetItems.find((i) => i.assetId === assetId);
      if (item) onRemoveItem?.(item);
    });
  });

  panelElement.querySelector('[data-action="close-panel"]')
    ?.addEventListener('click', closeCartPanel);

  panelElement.querySelector('[data-action="clear-cart"]')
    ?.addEventListener('click', () => cart.clear({ type: 'asset' }));

  panelElement.querySelector('[data-action="share-cart"]')
    ?.addEventListener('click', () => {
      if (cartAssetItems.length > 0) {
        window.dispatchEvent(new CustomEvent('openShareModal', {
          detail: { assets: cartAssetItems },
        }));
      }
    });

  panelElement.querySelector('[data-action="add-to-collection"]')
    ?.addEventListener('click', () => {
      if (cartAssetItems.length > 0) {
        window.dispatchEvent(new CustomEvent('openCollectionModal', {
          detail: { assets: cartAssetItems },
        }));
      }
    });

  panelElement.querySelector('[data-action="open-download"]')
    ?.addEventListener('click', () => {
      downloadAssets = [...cartAssetItems];
      stepStatus[WorkflowStep.CART] = StepStatus.SUCCESS;
      stepStatus[WorkflowStep.DOWNLOAD] = StepStatus.CURRENT;
      activeStep = WorkflowStep.DOWNLOAD;
      showDownloadContent = true;
      if (!executedSteps.includes(WorkflowStep.DOWNLOAD)) {
        executedSteps.push(WorkflowStep.DOWNLOAD);
      }
      render(options);
    });

  panelElement.querySelector('[data-action="complete-download"]')
    ?.addEventListener('click', () => {
      resetWorkflowState();
      closeCartPanel();
    });
}

function render(options) {
  const state = getState();
  const { cartAssetItems = [] } = state;

  downloadAssets = cartAssetItems;

  panelElement.innerHTML = `
    <div class="base-panel-header">
      <h2>${getStepTitle(activeStep)}</h2>
      <button class="close-button" aria-label="${ph('close', 'Close')}">✕</button>
    </div>
    <div class="base-panel-content">
      ${renderContent(state)}
    </div>
  `;

  bindEvents(options);

  if (activeStep === WorkflowStep.DOWNLOAD && showDownloadContent && downloadAssets.length > 0) {
    const container = panelElement.querySelector('.download-renditions-container');
    if (container) {
      const downloadAssetsData = downloadAssets.map((asset) => ({
        asset,
        renditionsLoading: false,
        renditionsError: null,
      }));

      createDownloadRenditionsContent(container, {
        assets: downloadAssetsData,
        onClose: () => {
          showDownloadContent = false;
          activeStep = WorkflowStep.CART;
          stepStatus[WorkflowStep.DOWNLOAD] = StepStatus.INIT;
          stepStatus[WorkflowStep.CART] = StepStatus.CURRENT;
          executedSteps = executedSteps.filter((step) => step !== WorkflowStep.DOWNLOAD);
          render(options);
        },
        onCloseCartPanel: closeCartPanel,
        onDownloadCompleted: (success, successfulAssets) => {
          handleDownloadCompleted(success, successfulAssets, options);
        },
        showCancel: true,
      });
    }
  }
}

export async function createCartPanel(options = {}) {
  if (!ph) {
    ph = await getAppLabel();
  }

  cleanupCartPanel();
  document.body.classList.add('cart-panel-open');

  panelOverlay = document.createElement('div');
  panelOverlay.className = 'base-panel-overlay portal-modal';
  panelOverlay.addEventListener('click', (e) => {
    if (e.target === panelOverlay) closeCartPanel();
  });

  panelElement = document.createElement('div');
  panelElement.className = 'base-panel cart-panel';
  panelOverlay.appendChild(panelElement);
  document.body.appendChild(panelOverlay);

  render(options);

  unsubscribe = subscribe((state, prevState, updates) => {
    if (updates.cartAssetItems !== undefined) {
      render(options);
    }
    if (updates.isCartPanelOpen !== undefined && !state.isCartPanelOpen) {
      closeCartPanel();
    }
  });

  const handleEscape = (e) => {
    if (e.key === 'Escape') closeCartPanel();
  };
  document.addEventListener('keydown', handleEscape);
  panelElement.escapeHandler = handleEscape;
}

export function closeCartPanel() {
  cleanupCartPanel();
  setState({ isCartPanelOpen: false });
}

export default {
  createCartPanel,
  closeCartPanel,
};
