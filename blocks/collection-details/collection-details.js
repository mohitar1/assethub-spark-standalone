/**
 * Collection Details block
 * Renders assets in a collection using the full search-results UI (gallery + facets panel).
 * Delegates all rendering to search-results by setting collectionId in externalParams so
 * performSearchImages scopes every query to this collection.
 */

import showToast from '../../scripts/toast/toast.js';
import { DynamicMediaCollectionsClient } from '../../scripts/collections/collections-api-client.js';
import { transformApiCollectionToInternal } from '../../scripts/collections/collections-utils.js';
import {
  CollectionAccessLevel,
  CollectionAclField,
} from '../../scripts/collections/collection-search-constants.js';
import {
  createEditModal,
  createDeleteModal,
  createShareModal,
} from '../../scripts/collections/collection-modals.js';
import { loadCSS } from '../../scripts/aem.js';
import {
  setState,
  subscribe,
  search,
  handleLoadMoreResults,
  handleFacetCheckbox,
  handleClearAllFacets,
  fetchAssetRenditions,
} from '../search-results/search-results.js';
import { createImageGallery } from '../search-results/components/image-gallery.js';
import { createFacetsPanel } from '../search-results/components/facets/index.js';
import { getDynamicMediaClient } from '../search-results/clients/dynamicmedia-client.js';
import { getFacetsConfig } from '../search-results/constants/facets.js';
import { getHitsPerPage } from '../search-results/utils/config.js';
import { loadSearchExpandAllDetailsState } from '../search-results/utils/toggle-state-storage.js';
import { localizePath, getAppLabel } from '../../scripts/locale-utils.js';
import { getBlockKeyValues, stripHtmlAndNewlines } from '../../scripts/scripts.js';
import {
  ICON_PEOPLE_MD,
  ICON_EDIT_MD,
  ICON_DELETE_MD,
} from '../../scripts/collections/collection-icons.js';

function makeActionBtn(label, html, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'scr-action-btn';
  btn.setAttribute('aria-label', label);
  btn.title = label;
  btn.innerHTML = html;
  btn.addEventListener('click', onClick);
  return btn;
}

export default async function decorate(block) {
  const t = await getAppLabel();

  loadCSS('/blocks/search-results/search-results.css');
  // Modal styles (.scr-modal-*, .scr-share-*) live alongside search-collection-results
  loadCSS('/blocks/search-collection-results/search-collection-results.css');

  const urlParams = new URLSearchParams(window.location.search);
  const collectionId = urlParams.get('id');

  if (!collectionId) {
    block.textContent = '';
    const err = document.createElement('div');
    err.className = 'cd-error';
    err.textContent = t('noCollectionId', 'No collection ID provided');
    block.append(err);
    return;
  }

  const client = new DynamicMediaCollectionsClient({ user: window.user });

  // Fetch the full collection (name, ACL, accessLevel) for breadcrumb + actions.
  // Retry once on transient errors (5xx / network) so a flaky upstream doesn't
  // silently hide Edit / Delete / Share-access until a hard refresh.
  // Falls through to id-only behaviour if both attempts fail.
  let collection = null;
  // eslint-disable-next-line no-restricted-syntax
  for (const attempt of [1, 2]) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const metadata = await client.getCollectionMetadata(collectionId);
      collection = transformApiCollectionToInternal({
        ...metadata,
        collectionId,
      });
      break;
    } catch (err) {
      // 401 / 403 → definitive access denied; show a clear message and bail out.
      if (err?.status === 401 || err?.status === 403) {
        block.textContent = '';
        const denied = document.createElement('div');
        denied.className = 'cd-error';
        denied.innerHTML = `<p>${t('collectionNotFound', 'We couldn\'t load this collection. It may no longer exist, or the link may be incorrect.')}</p>
          <p>${t('collectionNotFoundHelp', 'Still need help? Reach out to our Asset Management Team.')}</p>
          <p><a href="${localizePath('/search-collections')}">${t('backToCollections', 'Back to Collections')}</a></p>`;
        block.append(denied);
        return;
      }
      // Only retry on transient errors. The client wraps fetch failures in an
      // Error whose message includes the HTTP status — check for 5xx or generic
      // network failure.
      const transient = !err?.message
        || /(\b5\d\d\b|network|fetch failed|TypeError)/i.test(err.message);
      if (attempt === 1 && transient) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => { setTimeout(r, 500); });
        // eslint-disable-next-line no-continue
        continue;
      }
      // eslint-disable-next-line no-console
      console.warn('[collection-details] failed to load full metadata; owner-only actions hidden', err);
      break;
    }
  }

  const collectionName = collection?.name || '';

  block.textContent = '';

  // Wrap in .search-results so all scoped CSS applies
  const wrapper = document.createElement('div');
  wrapper.className = 'collection-details-inner search-results';

  // Header row: breadcrumb on the left, action bar on the right
  const headerRow = document.createElement('div');
  headerRow.className = 'cd-header-row';

  const breadcrumb = document.createElement('div');
  breadcrumb.className = 'cd-breadcrumb';
  const breadcrumbLink = document.createElement('a');
  breadcrumbLink.href = localizePath('/search-collections');
  breadcrumbLink.textContent = t('collections', 'Collections');
  const breadcrumbSep = document.createElement('span');
  breadcrumbSep.className = 'cd-breadcrumb-sep';
  breadcrumbSep.textContent = '›';
  const breadcrumbName = document.createElement('span');
  breadcrumbName.className = 'cd-breadcrumb-name';
  breadcrumbName.textContent = collectionName;
  breadcrumb.append(breadcrumbLink, breadcrumbSep, breadcrumbName);

  // Action bar — only renders when the collection actually loaded
  const actionBar = document.createElement('div');
  actionBar.className = 'cd-actions';

  headerRow.append(breadcrumb, actionBar);

  // Share Link is always available; does not require ACL info.
  const onShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      showToast(t('linkCopied', 'Link copied to clipboard'), 'success');
    }).catch(() => {
      showToast(t('copyFailed', 'Could not copy link'), 'error');
    });
  };

  actionBar.append(
    makeActionBtn(
      t('shareLink', 'Share link'),
      '<img src="/icons/share.svg" alt="" width="18" height="18" />',
      onShareLink,
    ),
  );

  // Owner-gated actions require the collection metadata to be loaded
  if (collection) {
    const editModal = createEditModal({
      client,
      t,
      onUpdated: ({ title, description, accessLevel } = {}) => {
        if (title) {
          collection.name = title;
          breadcrumbName.textContent = title;
          document.title = title;
        }
        if (description !== undefined) collection.description = description;
        if (accessLevel) collection.accessLevel = accessLevel;
      },
    });
    const deleteModal = createDeleteModal({
      client,
      t,
      onDeleted: () => { window.location.href = localizePath('/search-collections'); },
    });
    const shareModal = createShareModal({
      client,
      t,
      onUpdated: ({ viewers } = {}) => {
        if (collection.acl) {
          collection.acl[CollectionAclField.VIEWER] = viewers || [];
        }
      },
    });

    const canShareAccess = collection.accessLevel === CollectionAccessLevel.PRIVATE
      && collection.isOwner;

    if (canShareAccess) {
      actionBar.append(
        makeActionBtn(t('shareAccess', 'Share access'), ICON_PEOPLE_MD, () => shareModal.show(collection)),
      );
    }
    if (collection.isOwner) {
      actionBar.append(
        makeActionBtn(t('editCollection', 'Edit collection'), ICON_EDIT_MD, () => editModal.show(collection)),
        makeActionBtn(t('deleteCollection', 'Delete collection'), ICON_DELETE_MD, () => deleteModal.show(collection)),
      );
    }

    wrapper.append(editModal.overlay, deleteModal.overlay, shareModal.overlay);
  }

  // Main layout mirrors createMainApp but inserted directly
  const mainContent = document.createElement('div');
  mainContent.className = 'main-content';

  const galleryEl = document.createElement('div');
  galleryEl.className = 'image-gallery';
  galleryEl.id = 'image-gallery';

  const facetsEl = document.createElement('div');
  facetsEl.className = 'facet-filter-panel';
  facetsEl.id = 'facet-filter-panel';

  const imagesMain = document.createElement('div');
  imagesMain.className = 'images-main';
  imagesMain.append(galleryEl);

  const imagesRow = document.createElement('div');
  imagesRow.className = 'images-content-row';
  imagesRow.append(facetsEl, imagesMain);

  const imagesWrapper = document.createElement('div');
  imagesWrapper.className = 'images-content-wrapper';
  imagesWrapper.append(imagesRow);

  const imagesContainer = document.createElement('div');
  imagesContainer.className = 'images-container';
  imagesContainer.append(imagesWrapper);

  mainContent.append(imagesContainer);

  wrapper.append(headerRow, mainContent);
  block.appendChild(wrapper);

  // Read excFacets: from block content, or cached from a prior search page visit
  let excFacets = {};
  const blockConfig = getBlockKeyValues(block);
  if (blockConfig.excFacets) {
    try {
      excFacets = JSON.parse(stripHtmlAndNewlines(blockConfig.excFacets));
    } catch (_) { /* ignore */ }
  }
  if (!Object.keys(excFacets).length) {
    try {
      const cached = localStorage.getItem('sr-excFacets');
      if (cached) excFacets = JSON.parse(cached);
    } catch (_) { /* ignore */ }
  }

  // Point search-results state at this collection
  window.SearchResultsConfig = window.SearchResultsConfig || {};
  window.SearchResultsConfig.externalParams = {
    isBlockIntegration: true,
    collectionId,
    hitsPerPage: String(getHitsPerPage()),
    sortType: '',
    sortDirection: '',
    searchMode: '',
    excFacets,
    mimeTypeMappings: {},
    presetFilters: [],
  };

  setState({
    externalParams: window.SearchResultsConfig.externalParams,
    authenticated: true,
    dynamicMediaClient: getDynamicMediaClient(),
    excFacets: getFacetsConfig(),
    presetFilters: [],
    expandAllDetails: loadSearchExpandAllDetailsState(true),
  });

  // Set global open/close for asset details (image-gallery wires these up itself,
  // but collection-details needs them set before gallery renders)
  window.openDetailsView = window.openDetailsView || (() => {});
  window.closeDetailsView = window.closeDetailsView || (() => {});

  // Render gallery + facets panel
  const galleryContainer = wrapper.querySelector('#image-gallery');
  const facetsContainer = wrapper.querySelector('#facet-filter-panel');

  createImageGallery(galleryContainer, {
    onLoadMoreResults: handleLoadMoreResults,
    onFacetCheckbox: handleFacetCheckbox,
    onClearAllFacets: handleClearAllFacets,
    fetchAssetRenditions,
  });

  createFacetsPanel(facetsContainer, {
    search,
    onFacetCheckbox: handleFacetCheckbox,
    onClearAllFacets: handleClearAllFacets,
  });

  // Mobile filter panel toggle
  subscribe((currentState, _prev, updates) => {
    if (updates.isMobileFilterOpen !== undefined) {
      const panel = wrapper.querySelector('.facet-filter-panel');
      if (panel) panel.classList.toggle('mobile-open', currentState.isMobileFilterOpen);
    }
  });

  // Read query from URL and kick off first search
  const queryParam = urlParams.get('query') || urlParams.get('fulltext') || '';
  if (queryParam) setState({ query: queryParam });

  search(queryParam);
}
