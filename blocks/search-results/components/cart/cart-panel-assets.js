/**
 * Cart panel assets tab content.
 */

import { renderWorkflowProgress } from './workflow-progress.js';
import { renderEmptyCartContent } from './empty-cart-content.js';
import { renderCartAssetItemRow } from './cart-asset-item-row.js';
import { renderCartActionsFooter } from './cart-actions-footer.js';
import { WorkflowStep } from './workflow-types.js';

export function renderCartPanelAssets(options) {
  const {
    cartAssetItems = [],
    activeStep = WorkflowStep.CART,
    stepStatus = {},
    t = (key, fallback) => fallback,
  } = options;

  if (cartAssetItems.length === 0
    && (activeStep === WorkflowStep.CART || activeStep === WorkflowStep.CLOSE_DOWNLOAD)) {
    return renderEmptyCartContent({
      message: t('yourCartIsEmpty', 'Your cart is empty'),
      subHeaderMessage: t('youHaveNoItemsInYourCart', 'You have no items in your cart'),
      homepageButtonText: t('goToHomepage', 'Go to Homepage'),
    });
  }

  const itemLabel = cartAssetItems.length !== 1 ? t('items', 'Items') : t('item', 'Item');
  const itemsCountText = `${cartAssetItems.length} ${itemLabel}`;

  return `
    <div class="cart-panel-assets-wrapper">
      ${renderWorkflowProgress({ activeStep, stepStatus, t })}

      <div class="cart-content spark-custom-scrollbar">
        <div class="cart-items-count">
          <span class="red-text">${itemsCountText}</span> ${t('inYourCart', 'in your cart')}
        </div>

        <div class="cart-table-header">
          <div class="col-thumbnail">${t('thumbnail', 'THUMBNAIL')}</div>
          <div class="col-title">${t('title', 'TITLE')}</div>
          <div class="col-rights">${t('format', 'FORMAT')}</div>
          <div class="col-action">${t('action', 'ACTION')}</div>
        </div>

        <div class="cart-items-table">
          ${cartAssetItems.map((item, index) => renderCartAssetItemRow({ item, index, t })).join('')}
        </div>
      </div>

      ${renderCartActionsFooter({
    activeStep,
    cartItemsCount: cartAssetItems.length,
    t,
  })}
    </div>
  `;
}

export default renderCartPanelAssets;
