/**
 * Cart panel action buttons.
 */

import { WorkflowStep } from './workflow-types.js';

export function renderCartActionsFooter(options) {
  const {
    activeStep = WorkflowStep.CART,
    cartItemsCount = 0,
    t = (key, fallback) => fallback,
  } = options;

  const hasItems = cartItemsCount > 0;

  return `
    <div class="cart-actions-footer">
      <button class="cart-panel-action-btn secondary-button" data-action="close-panel">
        ${t('close', 'Close')}
      </button>
      <button
        class="cart-panel-action-btn secondary-button"
        data-action="clear-cart"
        ${!hasItems ? 'disabled' : ''}
      >
        ${t('clearCart', 'Clear Cart')}
      </button>
      <button
        class="cart-panel-action-btn secondary-button"
        data-action="share-cart"
        ${!hasItems ? 'disabled' : ''}
      >
        ${t('shareCart', 'Share Cart')}
      </button>
      <button
        class="cart-panel-action-btn secondary-button"
        data-action="add-to-collection"
        ${!hasItems ? 'disabled' : ''}
      >
        ${t('addToCollection', 'Add To Collection')}
      </button>
      ${activeStep === WorkflowStep.CART ? `
        <button
          class="cart-panel-action-btn primary-button"
          data-action="open-download"
          ${!hasItems ? 'disabled' : ''}
        >
          ${t('download', 'Download')}
        </button>
      ` : ''}
      ${activeStep === WorkflowStep.CLOSE_DOWNLOAD ? `
        <button class="cart-panel-action-btn primary-button" data-action="complete-download">
          ${t('completeDownload', 'Complete Download')}
        </button>
      ` : ''}
    </div>
  `;
}

export default renderCartActionsFooter;
