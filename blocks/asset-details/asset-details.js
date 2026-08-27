/**
 * Asset Details Block - Standalone page for viewing asset details
 * Renders asset details as a modal without requiring the search page
 */

import { ensureMimeTypeMappingsConfig } from '../../scripts/scripts.js';
import { getDynamicMediaClient } from '../search-results/clients/dynamicmedia-client.js';
import { populateAssetFromMetadata } from '../../scripts/asset-transformers.js';
import { openAssetDetails } from '../search-results/components/asset-details/index.js';
import { fetchMetadataWithDisclaimer } from '../search-results/components/asset-details/disclaimer-modal.js';
import { getState, setState } from '../search-results/search-results.js';
import { getCachedPlaceholders, getSearchPlaceholders, ph } from '../search-results/utils/placeholders.js';
import { normalizeAssetId } from '../../scripts/asset-id-utils.js';
import showToast from '../../scripts/toast/toast.js';
import { dispatchAssetAction } from '../../scripts/audit/asset-audit.js';
import { ASSET_AUDIT_ACTIONS } from '../../scripts/audit/asset-audit-constants.js';

const MAX_TITLE_LENGTH = 50;

/**
 * Update the browser tab title with the asset title
 * @param {Object} asset - The asset object with title and name properties
 */
function updatePageTitle(asset) {
  let displayName = asset.title && asset.title !== 'N/A' ? asset.title : asset.name;

  if (!displayName || displayName === 'N/A') {
    displayName = 'Asset Details';
  }

  if (displayName.length > MAX_TITLE_LENGTH) {
    displayName = `${displayName.substring(0, MAX_TITLE_LENGTH - 3)}...`;
  }

  document.title = displayName;
}

/**
 * Create a fetchAssetRenditions function for use with openAssetDetails
 * @param {Object} dmClient - DynamicMedia client instance
 * @returns {Function} Async function to fetch renditions
 */
export function createFetchAssetRenditions(dmClient) {
  return async (asset) => {
    try {
      const renditions = await dmClient.getAssetRenditions(asset);
      if (renditions?.items) {
        // eslint-disable-next-line no-param-reassign
        asset.renditions = renditions;

        const currentState = getState();
        setState({
          assetRenditionsCache: {
            ...currentState.assetRenditionsCache,
            [asset.assetId]: renditions,
          },
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[AssetDetails] Failed to fetch renditions:', err);
    }
  };
}

function showLoading(container) {
  container.innerHTML = `
    <div class="asset-details-loading">
      <div class="loading-spinner"></div>
      <p>Loading asset details...</p>
    </div>
  `;
}

function showError(container, message) {
  container.innerHTML = `
    <div class="asset-details-error">
      <p>${message}</p>
      <a href="javascript:history.back()">← Go back</a>
    </div>
  `;
}

export default async function decorate(block) {
  await getSearchPlaceholders();

  const urlParams = new URLSearchParams(window.location.search);
  const assetId = normalizeAssetId(urlParams.get('assetid'));

  if (!assetId) {
    showError(block, 'No asset ID provided. Please use ?assetid=xxx in the URL.');
    return;
  }

  showLoading(block);

  try {
    const dmClient = getDynamicMediaClient();

    if (!dmClient) {
      showError(block, 'Unable to initialize. Please ensure you are logged in.');
      return;
    }

    await ensureMimeTypeMappingsConfig('[AssetDetails]');

    const placeholders = getCachedPlaceholders();
    const declinedToastMessage = ph(
      placeholders,
      'disclaimerDeclinedToast',
      "You've declined the disclaimer for this asset.",
    );

    const metadata = await fetchMetadataWithDisclaimer({
      assetId,
      dmClient,
      onDeclined: () => {
        block.innerHTML = '';
        showToast(declinedToastMessage, 'info');
      },
      onCancelled: () => {
        // User dismissed the disclaimer without making a choice — show the
        // standalone error so they have an obvious way to retry / go back.
        showError(block, declinedToastMessage);
      },
      modalOptions: {
        title: ph(placeholders, 'sponsorshipDisclaimerTitle', 'Sponsorship Asset Disclaimer'),
        message: ph(
          placeholders,
          'sponsorshipDisclaimerMessage',
          'This asset is associated with a sponsorship and may be subject to '
            + 'usage restrictions. By accepting, you confirm that you understand '
            + 'and agree to the terms governing the use of sponsorship assets.',
        ),
        acceptLabel: ph(placeholders, 'accept', 'Accept'),
        declineLabel: ph(placeholders, 'decline', 'Decline'),
      },
    });

    if (!metadata) {
      // Disclaimer denied / cancelled — UI was handled by the callbacks above.
      return;
    }

    const asset = populateAssetFromMetadata({ ...metadata, assetId });

    updatePageTitle(asset);

    block.innerHTML = '';

    dispatchAssetAction(ASSET_AUDIT_ACTIONS.VIEW, asset.assetId);

    openAssetDetails({
      asset,
      isDeepLinkAsset: true,
      disableEscapeClose: true,
      fetchAssetRenditions: createFetchAssetRenditions(dmClient),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[AssetDetails] Failed to load asset:', err);
    showError(block, `Failed to load asset: ${err.message}`);
  }
}
