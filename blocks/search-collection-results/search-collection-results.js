import showToast from '../../scripts/toast/toast.js';
import { DynamicMediaCollectionsClient } from '../../scripts/collections/collections-api-client.js';
import { transformApiCollectionToInternal } from '../../scripts/collections/collections-utils.js';
import { getApiParams, applyClientFilter } from '../../scripts/collections/collection-list-filters.js';
import {
  createEditModal,
  createDeleteModal,
  createShareModal,
  scopeToAccessLevel,
} from '../../scripts/collections/collection-modals.js';
import {
  CollectionAccessLevel,
  CollectionAclField,
} from '../../scripts/collections/collection-search-constants.js';
import {
  ICON_PERSON_SM,
  ICON_EDIT_SM,
  ICON_DELETE_SM,
  ICON_PEOPLE_MD,
  ICON_GRID_SM,
  ICON_PERSON_FILTER,
  ICON_GLOBE_SM,
  ICON_LOCK_SM,
  PLACEHOLDER_SVG,
} from '../../scripts/collections/collection-icons.js';
import { SEARCH_URL_PARAMS } from '../../scripts/scripts.js';
import { getAppLabel, localizePath } from '../../scripts/locale-utils.js';

const VIEW_STORAGE_KEY = 'scr-view';

/**
 * Simple accessible picker: a button that opens a dropdown list of options.
 *
 * @param {object} cfg
 * @param {string} cfg.label  Initial visible label on the trigger button.
 * @param {string} [cfg.icon] HTML snippet shown before the label.
 * @param {Array<{ key: string, label: string, description?: string, icon?: string }>} cfg.options
 * @param {(key: string) => void} cfg.onSelect Invoked with the chosen option's key.
 * @returns {{
 *   element: HTMLElement,
 *   setSelection: (key: string) => void,
 *   setDisabled: (disabled: boolean, reason?: string) => void,
 * }}
 */
function createPicker({
  label, icon = '', options, onSelect,
}) {
  const element = document.createElement('div');
  element.className = 'scr-picker';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'scr-picker-btn';
  btn.innerHTML = `${icon}<span class="scr-picker-label">${label}</span><span class="scr-picker-chevron">⌄</span>`;
  const labelEl = btn.querySelector('.scr-picker-label');

  const menu = document.createElement('ul');
  menu.className = 'scr-picker-menu';
  menu.hidden = true;

  options.forEach(({
    key, label: optLabel, description, icon: optIcon = '',
  }) => {
    const li = document.createElement('li');
    const optBtn = document.createElement('button');
    optBtn.type = 'button';
    optBtn.dataset.key = key;
    optBtn.innerHTML = `
      <span class="scr-picker-opt-icon">${optIcon}</span>
      <span class="scr-picker-opt-text">
        <span class="scr-picker-opt-label">${optLabel}</span>
        ${description ? `<span class="scr-picker-opt-desc">${description}</span>` : ''}
      </span>`;
    optBtn.addEventListener('click', () => {
      labelEl.textContent = optLabel;
      menu.hidden = true;
      onSelect(key);
    });
    li.append(optBtn);
    menu.append(li);
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (btn.disabled) return;
    const isOpen = !menu.hidden;
    document.querySelectorAll('.scr-picker-menu').forEach((m) => { m.hidden = true; });
    menu.hidden = isOpen;
  });

  element.append(btn, menu);

  const setSelection = (key) => {
    const opt = options.find((o) => o.key === key);
    if (opt) labelEl.textContent = opt.label;
  };
  const setDisabled = (disabled, reason = '') => {
    btn.disabled = !!disabled;
    if (disabled) {
      menu.hidden = true;
      if (reason) btn.title = reason; else btn.removeAttribute('title');
    } else {
      btn.removeAttribute('title');
    }
  };

  return { element, setSelection, setDisabled };
}

// ── Create Collection Modal ───────────────────────────────────────────────────

let scrCreateModal = null;

function showScrCreateModal() {
  if (!scrCreateModal) return;
  scrCreateModal.hidden = false;
  scrCreateModal.querySelector('#scr-modal-title')?.focus();
}

function hideScrCreateModal() {
  if (!scrCreateModal) return;
  scrCreateModal.hidden = true;
  const titleInput = scrCreateModal.querySelector('#scr-modal-title');
  const descInput = scrCreateModal.querySelector('#scr-modal-desc');
  const scopeSelect = scrCreateModal.querySelector('#scr-modal-scope');
  if (titleInput) titleInput.value = '';
  if (descInput) descInput.value = '';
  if (scopeSelect) scopeSelect.value = 'private';
}

function buildCreateModal(client, t, onCreated) {
  const overlay = document.createElement('div');
  overlay.className = 'scr-modal-overlay';
  overlay.hidden = true;

  const dialog = document.createElement('div');
  dialog.className = 'scr-modal';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'scr-modal-heading');

  // Header
  const header = document.createElement('div');
  header.className = 'scr-modal-header';

  const heading = document.createElement('h2');
  heading.id = 'scr-modal-heading';
  heading.className = 'scr-modal-heading';
  heading.textContent = t('newCollection', 'New collection');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'scr-modal-close';
  closeBtn.setAttribute('aria-label', t('close', 'Close'));
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', hideScrCreateModal);

  header.append(heading, closeBtn);

  // Body
  const body = document.createElement('div');
  body.className = 'scr-modal-body';

  // Title field
  const titleLabel = document.createElement('label');
  titleLabel.className = 'scr-form-label';
  titleLabel.setAttribute('for', 'scr-modal-title');
  titleLabel.textContent = t('labelTitle', 'Title');
  const reqMark = document.createElement('span');
  reqMark.className = 'scr-form-required';
  reqMark.setAttribute('aria-hidden', 'true');
  reqMark.textContent = ' *';
  titleLabel.append(reqMark);

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.id = 'scr-modal-title';
  titleInput.className = 'scr-form-input';
  titleInput.autocomplete = 'off';

  // Description field
  const descLabel = document.createElement('label');
  descLabel.className = 'scr-form-label';
  descLabel.setAttribute('for', 'scr-modal-desc');
  descLabel.textContent = t('description', 'Description');

  const descInput = document.createElement('textarea');
  descInput.id = 'scr-modal-desc';
  descInput.className = 'scr-form-textarea';
  descInput.rows = 3;

  // Who has access
  const accessSection = document.createElement('div');
  accessSection.className = 'scr-modal-access';

  const accessHeading = document.createElement('div');
  accessHeading.className = 'scr-modal-access-heading';
  accessHeading.textContent = t('whoHasAccess', 'Who has access');

  const ownerRow = document.createElement('div');
  ownerRow.className = 'scr-modal-owner-row';

  const ownerAvatar = document.createElement('span');
  ownerAvatar.className = 'scr-modal-owner-avatar';
  ownerAvatar.innerHTML = ICON_PERSON_SM;

  const ownerName = document.createElement('span');
  ownerName.className = 'scr-modal-owner-name';
  ownerName.textContent = window.user?.name || window.user?.email || '';

  const ownerBadge = document.createElement('span');
  ownerBadge.className = 'scr-modal-owner-badge';
  ownerBadge.textContent = t('owner', 'Owner');

  ownerRow.append(ownerAvatar, ownerName, ownerBadge);

  const scopeSelect = document.createElement('select');
  scopeSelect.id = 'scr-modal-scope';
  scopeSelect.className = 'scr-form-select';

  [
    { value: 'private', label: t('accessScopePrivate', 'Only you and admins can view and edit') },
    { value: 'public-view', label: t('accessScopePublicView', 'Anyone can view') },
    { value: 'public-edit', label: t('accessScopePublicEdit', 'Anyone can view and edit') },
  ].forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    scopeSelect.append(opt);
  });

  accessSection.append(accessHeading, ownerRow, scopeSelect);
  body.append(titleLabel, titleInput, descLabel, descInput, accessSection);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'scr-modal-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'scr-modal-btn scr-modal-btn-cancel';
  cancelBtn.textContent = t('cancel', 'Cancel');
  cancelBtn.addEventListener('click', hideScrCreateModal);

  const createBtn = document.createElement('button');
  createBtn.type = 'button';
  createBtn.className = 'scr-modal-btn scr-modal-btn-create';
  createBtn.textContent = t('create', 'Create');
  createBtn.addEventListener('click', async () => {
    const name = titleInput.value.trim();
    if (!name) {
      titleInput.focus();
      showToast(t('collectionNameRequired', 'Collection name is required'), 'info');
      return;
    }

    createBtn.disabled = true;
    const orig = createBtn.textContent;
    createBtn.textContent = t('creating', 'Creating…');

    try {
      const userEmail = window.user?.email || '';
      const scope = scopeSelect.value;
      const accessLevel = scopeToAccessLevel(scope);
      const collectionData = {
        title: name,
        accessLevel,
        items: [],
        'custom:metadata': {
          'custom:acl': {
            [CollectionAclField.OWNER]: userEmail,
            [CollectionAclField.VIEWER]: [],
            ...(scope === 'public-edit' ? { [CollectionAclField.EDITOR]: [] } : {}),
          },
        },
      };
      const desc = descInput.value.trim();
      if (desc) collectionData.description = desc;

      await client.createCollection(collectionData);
      hideScrCreateModal();
      showToast(t('collectionCreatedSuccessfully', 'Collection created successfully'), 'success');
      onCreated();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[search-collection-results] create collection failed', err);
      showToast(t('collectionCreateFailed', 'Failed to create collection. Please try again.'), 'error');
    } finally {
      createBtn.disabled = false;
      createBtn.textContent = orig;
    }
  });

  footer.append(cancelBtn, createBtn);
  dialog.append(header, body, footer);
  overlay.append(dialog);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hideScrCreateModal();
  });

  return overlay;
}

const NOT_IMPLEMENTED = 'Not implemented yet';

function notImplemented(e) {
  e.stopPropagation();
  showToast(NOT_IMPLEMENTED, 'info');
}

const MENU_ACTIONS_OWNER = [
  { key: 'edit', label: 'Edit collection', icon: ICON_EDIT_SM },
  { key: 'delete', label: 'Delete collection', icon: ICON_DELETE_SM },
];

function createActionBar({
  isOwner = false,
  canShareAccess = false,
  onEdit = null,
  onDelete = null,
  onShareLink = null,
  onShareAccess = null,
} = {}) {
  const bar = document.createElement('div');
  bar.className = 'scr-card-actions';

  // Share — single button (copy link), or two buttons (access + link) for private owner
  const shareNodes = [];
  if (canShareAccess) {
    const accessBtn = document.createElement('button');
    accessBtn.type = 'button';
    accessBtn.className = 'scr-action-btn';
    accessBtn.setAttribute('aria-label', 'Share access');
    accessBtn.title = 'Share access';
    accessBtn.innerHTML = ICON_PEOPLE_MD;
    accessBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onShareAccess) onShareAccess();
    });

    const linkBtn = document.createElement('button');
    linkBtn.type = 'button';
    linkBtn.className = 'scr-action-btn';
    linkBtn.setAttribute('aria-label', 'Share link');
    linkBtn.title = 'Share link';
    linkBtn.innerHTML = '<img src="/icons/share.svg" alt="Share link" width="18" height="18" />';
    linkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onShareLink) onShareLink();
    });

    shareNodes.push(linkBtn, accessBtn);
  } else {
    const shareBtn = document.createElement('button');
    shareBtn.type = 'button';
    shareBtn.className = 'scr-action-btn';
    shareBtn.setAttribute('aria-label', 'Share');
    shareBtn.innerHTML = '<img src="/icons/share.svg" alt="Share" width="18" height="18" />';
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onShareLink) onShareLink();
      else notImplemented(e);
    });
    shareNodes.push(shareBtn);
  }

  // More (...)
  const moreWrapper = document.createElement('div');
  moreWrapper.className = 'scr-more-wrapper';

  const moreBtn = document.createElement('button');
  moreBtn.type = 'button';
  moreBtn.className = 'scr-action-btn scr-more-btn';
  moreBtn.setAttribute('aria-label', 'More actions');
  moreBtn.textContent = '•••';

  const menu = document.createElement('ul');
  menu.className = 'scr-more-menu';
  menu.hidden = true;

  const shareIconImg = '<img src="/icons/share.svg" alt="" width="16" height="16" />';
  const shareMenuItems = canShareAccess
    ? [
      { key: 'shareLink', label: 'Share link', icon: shareIconImg },
      { key: 'shareAccess', label: 'Share access', icon: ICON_PEOPLE_MD },
    ]
    : [
      { key: 'shareLink', label: 'Share', icon: shareIconImg },
    ];

  const menuActions = isOwner
    ? [...shareMenuItems, ...MENU_ACTIONS_OWNER]
    : [...shareMenuItems];

  const menuHandlers = {
    edit: onEdit, delete: onDelete, shareLink: onShareLink, shareAccess: onShareAccess,
  };

  menuActions.forEach(({ key, label, icon }) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = `<span class="scr-menu-icon">${icon}</span>${label}`;
    const handler = menuHandlers[key];
    if (handler) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.hidden = true;
        handler();
      });
    } else {
      btn.addEventListener('click', notImplemented);
    }
    li.append(btn);
    menu.append(li);
  });

  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !menu.hidden;
    document.querySelectorAll('.scr-more-menu').forEach((m) => { m.hidden = true; });
    menu.hidden = isOpen;
  });

  moreWrapper.append(moreBtn, menu);
  bar.append(...shareNodes, moreWrapper);
  return bar;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildPreview(thumbnailUrl, name, className, collectionId) {
  const el = document.createElement('div');
  el.className = className;
  if (collectionId) el.dataset.collectionId = collectionId;
  if (thumbnailUrl) {
    const img = document.createElement('img');
    img.src = thumbnailUrl;
    img.alt = name;
    img.onerror = () => { el.innerHTML = PLACEHOLDER_SVG; };
    el.append(img);
  } else {
    el.innerHTML = PLACEHOLDER_SVG;
  }
  return el;
}

function injectPreviewUrl(previewUrl, collection, block) {
  block.querySelectorAll(`[data-collection-id="${collection.id}"]`).forEach((el) => {
    el.innerHTML = '';
    const img = document.createElement('img');
    img.src = previewUrl;
    img.alt = collection.name;
    img.onerror = () => { el.innerHTML = PLACEHOLDER_SVG; };
    el.append(img);
  });
}

async function fetchAndInjectPreview(client, collection, block) {
  const cacheKey = `scr-thumb-${collection.id}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { injectPreviewUrl(cached, collection, block); return; }
  } catch { /* ignore */ }

  try {
    const { items } = await client.getCollectionItems(collection.id, { limit: 1 });
    if (!items || items.length === 0) return;
    const assetId = items[0].id;
    if (!assetId) return;
    const previewUrl = `/api/adobe/assets/${assetId}/as/thumbnail.jpg?width=400`;
    try { sessionStorage.setItem(cacheKey, previewUrl); } catch { /* ignore */ }
    injectPreviewUrl(previewUrl, collection, block);
  } catch {
    // non-critical, placeholder stays
  }
}

function createCard(collection, onView, onEdit, onDelete, onShareLink, onShareAccess) {
  const card = document.createElement('div');
  card.className = 'scr-card';

  const preview = buildPreview(collection.thumbnailUrl, collection.name, 'scr-card-preview', collection.id);
  preview.addEventListener('click', () => onView(collection));

  const info = document.createElement('div');
  info.className = 'scr-card-info';
  info.addEventListener('click', () => onView(collection));

  const name = document.createElement('div');
  name.className = 'scr-card-name';
  name.textContent = collection.name;

  const meta = document.createElement('div');
  meta.className = 'scr-card-meta';
  meta.textContent = '';

  const canShareAccess = collection.accessLevel === CollectionAccessLevel.PRIVATE
    && collection.isOwner;

  info.append(name, meta);
  card.append(preview, info, createActionBar({
    isOwner: collection.isOwner,
    canShareAccess,
    onEdit: collection.isOwner ? () => onEdit(collection) : null,
    onDelete: collection.isOwner ? () => onDelete(collection) : null,
    onShareLink: () => onShareLink(collection),
    onShareAccess: canShareAccess ? () => onShareAccess(collection) : null,
  }));
  return card;
}

function createRow(collection, onView, onEdit, onDelete, onShareLink, onShareAccess) {
  const row = document.createElement('div');
  row.className = 'scr-row';
  row.addEventListener('click', () => onView(collection));

  const preview = buildPreview(collection.thumbnailUrl, collection.name, 'scr-row-preview', collection.id);

  const info = document.createElement('div');
  info.className = 'scr-row-info';

  const name = document.createElement('div');
  name.className = 'scr-row-name';
  name.textContent = collection.name;

  if (collection.description) {
    const desc = document.createElement('div');
    desc.className = 'scr-row-desc';
    desc.textContent = collection.description;
    info.append(name, desc);
  } else {
    info.append(name);
  }

  const date = document.createElement('div');
  date.className = 'scr-row-date';
  date.textContent = formatDate(collection.lastUpdated);
  info.append(date);

  const canShareAccess = collection.accessLevel === CollectionAccessLevel.PRIVATE
    && collection.isOwner;

  const actions = createActionBar({
    isOwner: collection.isOwner,
    canShareAccess,
    onEdit: collection.isOwner ? () => onEdit(collection) : null,
    onDelete: collection.isOwner ? () => onDelete(collection) : null,
    onShareLink: () => onShareLink(collection),
    onShareAccess: canShareAccess ? () => onShareAccess(collection) : null,
  });
  actions.classList.add('scr-row-actions');
  actions.addEventListener('click', (e) => e.stopPropagation());

  row.append(preview, info, actions);
  return row;
}

export default async function decorate(block) {
  const t = await getAppLabel();
  block.textContent = '';

  // Close any open menus/pickers when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.scr-more-menu, .scr-picker-menu').forEach((m) => { m.hidden = true; });
  });

  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get(SEARCH_URL_PARAMS.QUERY) || urlParams.get(SEARCH_URL_PARAMS.FULLTEXT) || '';

  const client = new DynamicMediaCollectionsClient({ user: window.user });

  // Filter state
  let accessFilter = 'all'; // all | onlyMe | viewOnly | edit
  let creatorFilter = 'anyone'; // anyone | me

  let collections = [];
  let total = 0;
  let cursor;

  // Monotonic request token so a slower in-flight refetch can't overwrite a newer one.
  // Bumped on each refetch / load-more / initial-load entry; awaited responses
  // check the token and bail if a newer request has started.
  let requestToken = 0;

  const onView = (collection) => {
    window.location.href = localizePath(`/collection-details?id=${collection.id}`);
  };

  // ── Toolbar ──────────────────────────────────────────────────────────────
  const toolbar = document.createElement('div');
  toolbar.className = 'scr-toolbar';

  const filtersRow = document.createElement('div');
  filtersRow.className = 'scr-filters';

  const accessPicker = createPicker({
    label: t('allCollections', 'All Collections'),
    icon: `<span class="scr-picker-icon">${ICON_GRID_SM}</span>`,
    options: [
      {
        key: 'all', label: t('allCollections', 'All Collections'), description: t('privateAndPublic', 'Private and Public'), icon: ICON_GRID_SM,
      },
      {
        key: 'onlyMe', label: t('onlyMe', 'Only Me'), description: t('privateContentOnly', 'Private content only'), icon: ICON_LOCK_SM,
      },
      {
        key: 'viewOnly', label: t('anyOneCanView', 'Any One Can View'), description: t('publicOnlyCreatorCanEdit', 'Public, only creator can edit'), icon: ICON_GLOBE_SM,
      },
      {
        key: 'edit', label: t('anyOneCanEdit', 'Any One Can Edit'), description: t('publicAnyoneCanEdit', 'Public, anyone can edit'), icon: ICON_GLOBE_SM,
      },
      {
        key: 'sharedByMe', label: t('sharedByMe', 'Shared by me'), description: t('privateCollectionsIShared', 'Private collections you shared with others'), icon: ICON_PERSON_FILTER,
      },
      {
        key: 'sharedWithMe', label: t('sharedWithMe', 'Shared with me'), description: t('privateSharedWithYou', 'Private collections shared with you'), icon: ICON_PERSON_FILTER,
      },
    ],
    // applyCreatorPickerForAccess and refetch are function declarations defined
    // below — safe via hoisting at call time.
    /* eslint-disable no-use-before-define */
    onSelect: (key) => {
      accessFilter = key;
      applyCreatorPickerForAccess(key);
      refetch();
    },
    /* eslint-enable no-use-before-define */
  });

  const creatorPicker = createPicker({
    label: t('createdByAnyone', 'Created by anyone'),
    icon: `<span class="scr-picker-icon">${ICON_PERSON_FILTER}</span>`,
    options: [
      { key: 'anyone', label: t('createdByAnyone', 'Created by anyone'), icon: ICON_PERSON_FILTER },
      { key: 'me', label: t('createdByMe', 'Created by me'), icon: ICON_PERSON_FILTER },
    ],
    // eslint-disable-next-line no-use-before-define
    onSelect: (key) => { creatorFilter = key; refetch(); },
  });

  // Some access filters override the creator filter (the creator dropdown becomes
  // a no-op). Force-set the creator value where it's needed for the query to
  // produce results, then visually disable the picker with a tooltip explaining why.
  function applyCreatorPickerForAccess(accessKey) {
    const overrides = {
      sharedByMe: { creator: 'me', reason: t('creatorLockedSharedByMe', 'Only collections you created can be shared by you') },
      sharedWithMe: { creator: 'anyone', reason: t('creatorLockedSharedWithMe', 'You can\'t be the owner of a collection shared with you') },
      onlyMe: { creator: null, reason: t('creatorLockedOnlyMe', 'Private collections are visible only to their owner') },
    };
    const o = overrides[accessKey];
    if (o) {
      if (o.creator && creatorFilter !== o.creator) {
        creatorFilter = o.creator;
        creatorPicker.setSelection(o.creator);
      }
      creatorPicker.setDisabled(true, o.reason);
    } else {
      creatorPicker.setDisabled(false);
    }
  }

  const newCollectionBtn = document.createElement('button');
  newCollectionBtn.type = 'button';
  newCollectionBtn.className = 'scr-new-btn';
  newCollectionBtn.innerHTML = `<span class="scr-new-btn-icon">+</span>${t('createCollection', 'Create collection')}`;

  filtersRow.append(accessPicker.element, creatorPicker.element, newCollectionBtn);

  // Reflect the current access filter in the creator picker state at startup
  // (no-op for the default 'all', but keeps the UI consistent if the default ever changes).
  applyCreatorPickerForAccess(accessFilter);

  const countRow = document.createElement('div');
  countRow.className = 'scr-count-row';

  const countEl = document.createElement('span');
  countEl.className = 'scr-total';

  const viewToggle = document.createElement('div');
  viewToggle.className = 'scr-view-toggle';

  const gridBtn = document.createElement('button');
  gridBtn.type = 'button';
  gridBtn.className = 'view-toggle-btn scr-view-btn';
  gridBtn.setAttribute('aria-label', t('gridView', 'Grid view'));
  gridBtn.setAttribute('aria-pressed', 'false');

  const listBtn = document.createElement('button');
  listBtn.type = 'button';
  listBtn.className = 'view-toggle-btn scr-view-btn';
  listBtn.setAttribute('aria-label', t('listView', 'List view'));
  listBtn.setAttribute('aria-pressed', 'false');

  viewToggle.append(gridBtn, listBtn);
  countRow.append(countEl, viewToggle);
  toolbar.append(filtersRow, countRow);

  // ── Results ───────────────────────────────────────────────────────────────
  const results = document.createElement('div');
  const getView = () => localStorage.getItem(VIEW_STORAGE_KEY) || 'grid';

  // `refetch` is the function declaration below; resolved at click time, hence safe.
  /* eslint-disable no-use-before-define */
  const editModal = createEditModal({ client, t, onUpdated: () => refetch() });
  const deleteModal = createDeleteModal({ client, t, onDeleted: () => refetch() });
  const shareModal = createShareModal({ client, t, onUpdated: () => refetch() });
  /* eslint-enable no-use-before-define */

  const onEdit = (collection) => editModal.show(collection);
  const onDelete = (collection) => deleteModal.show(collection);
  const onShareLink = (collection) => {
    const path = localizePath(`/collection-details?id=${collection.id}`);
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast(t('linkCopied', 'Link copied to clipboard'), 'success');
    }).catch(() => {
      showToast(t('copyFailed', 'Could not copy link'), 'error');
    });
  };
  const onShareAccess = (collection) => shareModal.show(collection);

  const appendCollectionItems = (items) => {
    const view = getView();
    items.forEach((c) => {
      const el = view === 'grid'
        ? createCard(c, onView, onEdit, onDelete, onShareLink, onShareAccess)
        : createRow(c, onView, onEdit, onDelete, onShareLink, onShareAccess);
      results.append(el);
    });
    items.forEach((c) => {
      if (!c.thumbnailUrl) fetchAndInjectPreview(client, c, block);
    });
  };

  const render = (view) => {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
    gridBtn.classList.toggle('active', view === 'grid');
    gridBtn.setAttribute('aria-pressed', view === 'grid' ? 'true' : 'false');
    listBtn.classList.toggle('active', view === 'list');
    listBtn.setAttribute('aria-pressed', view === 'list' ? 'true' : 'false');
    if (!gridBtn.querySelector('.icon-mask')) {
      gridBtn.innerHTML = '<span class="icon-mask icon-mask-gridview" aria-hidden="true"></span>';
      listBtn.innerHTML = '<span class="icon-mask icon-mask-listview" aria-hidden="true"></span>';
    }
    results.textContent = '';
    results.className = `scr-results scr-${view}`;

    if (collections.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'scr-empty';
      empty.textContent = query
        ? `${t('noCollectionsFoundFor', 'No collections found for')} "${query}"`
        : t('noCollections', 'No collections found.');
      results.append(empty);
      return;
    }
    appendCollectionItems(collections);
  };

  // Whether the server has more pages. Cursor is the source of truth — under a
  // client-side filter, `total` reflects the displayed count (always == collections.length),
  // so the previous `collections.length < total` check was tautological and hid Load more.
  const hasMore = () => !!cursor;

  // ── Load More ─────────────────────────────────────────────────────────────
  const loadMoreBtn = document.createElement('button');
  loadMoreBtn.type = 'button';
  loadMoreBtn.className = 'scr-load-more';
  loadMoreBtn.textContent = t('loadMore', 'Load more');

  loadMoreBtn.addEventListener('click', async () => {
    requestToken += 1;
    const myToken = requestToken;
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = t('loading', 'Loading...');
    try {
      const { empty, _clientFilter, ...searchParams } = getApiParams(accessFilter, creatorFilter);
      if (empty) {
        loadMoreBtn.hidden = true;
        return;
      }
      const more = await client.searchCollections({ query, cursor, ...searchParams });
      if (myToken !== requestToken) return; // a newer request has started — discard
      const newItems = applyClientFilter(
        more.items.map(transformApiCollectionToInternal),
        _clientFilter,
      );
      cursor = more.cursor;
      collections.push(...newItems);
      appendCollectionItems(newItems);
      if (_clientFilter) {
        // Under a client filter, `total` is the displayed count — keep it in sync.
        total = collections.length;
        countEl.textContent = `${total} ${t('total', 'Total')}`;
      }
      loadMoreBtn.hidden = !hasMore();
    } catch (err) {
      if (myToken !== requestToken) return;
      // eslint-disable-next-line no-console
      console.error('[search-collection-results] load more failed', err);
    } finally {
      if (myToken === requestToken) {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = t('loadMore', 'Load more');
      }
    }
  });

  // ── Fetch & render ────────────────────────────────────────────────────────
  const loadingEl = document.createElement('div');
  loadingEl.className = 'scr-loading';
  loadingEl.textContent = t('loading', 'Loading...');

  async function refetch() {
    requestToken += 1;
    const myToken = requestToken;
    results.textContent = '';
    results.append(loadingEl);
    loadMoreBtn.hidden = true;
    const { empty, _clientFilter, ...searchParams } = getApiParams(accessFilter, creatorFilter);
    if (empty) {
      collections = [];
      total = 0;
      cursor = undefined;
      countEl.textContent = `${total} ${t('total', 'Total')}`;
      render(getView());
      return;
    }
    try {
      const result = await client.searchCollections({ query, ...searchParams });
      if (myToken !== requestToken) return; // a newer refetch has started — discard
      const items = applyClientFilter(
        result.items.map(transformApiCollectionToInternal),
        _clientFilter,
      );
      collections = items;
      total = _clientFilter ? items.length : result.total;
      cursor = result.cursor;
    } catch (err) {
      if (myToken !== requestToken) return;
      // eslint-disable-next-line no-console
      console.error('[search-collection-results]', err);
      results.textContent = '';
      const error = document.createElement('div');
      error.className = 'scr-error';
      error.textContent = t('errorLoadingCollections', 'Failed to load collections. Please try again.');
      results.append(error);
      return;
    }
    countEl.textContent = `${total} ${t('total', 'Total')}`;
    loadMoreBtn.hidden = !hasMore();
    render(getView());
  }

  gridBtn.addEventListener('click', () => render('grid'));
  listBtn.addEventListener('click', () => render('list'));

  scrCreateModal = buildCreateModal(client, t, () => refetch());
  newCollectionBtn.addEventListener('click', showScrCreateModal);

  block.append(
    toolbar,
    results,
    loadMoreBtn,
    scrCreateModal,
    editModal.overlay,
    deleteModal.overlay,
    shareModal.overlay,
  );

  // Initial render uses the same path as filter changes — refetch handles
  // loading state, error rendering, the empty-combination short-circuit,
  // and client-side filtering for us.
  await refetch();
}
