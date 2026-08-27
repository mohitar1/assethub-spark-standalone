/**
 * Shared collection modal factories: Edit, Delete, Share Access.
 *
 * Each factory returns { overlay, show, hide }. Callers append `overlay` to
 * their block (or document.body) and invoke `show(collection)` / `hide()`.
 * State is closure-scoped per factory instance — no module-level globals.
 *
 * CSS lives in blocks/search-collection-results/search-collection-results.css
 * (class prefix `scr-modal-*` / `scr-share-*`) and is loaded by both consumers.
 */

import showToast from '../toast/toast.js';
import { CollectionAccessLevel, CollectionAclField } from './collection-search-constants.js';
import { ICON_PERSON_SM } from './collection-icons.js';

// Re-export so search-collection-results can keep importing this from collection-modals.
// (Convenience for the create-collection modal's owner-row icon.)
export { ICON_PERSON_SM };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getScopeFromCollection(collection) {
  if (collection.accessLevel === CollectionAccessLevel.READ_ONLY) return 'public-view';
  if (collection.accessLevel === CollectionAccessLevel.PUBLIC) return 'public-edit';
  return 'private';
}

/**
 * Map a UI "scope" radio value to a DM `accessLevel` string.
 * @param {'private'|'public-view'|'public-edit'} scope
 * @returns {'private'|'read_only'|'public'}
 */
export function scopeToAccessLevel(scope) {
  if (scope === 'public-view') return CollectionAccessLevel.READ_ONLY;
  if (scope === 'public-edit') return CollectionAccessLevel.PUBLIC;
  return CollectionAccessLevel.PRIVATE;
}

// ── Edit Collection Modal ────────────────────────────────────────────────────

/**
 * Build an "Edit Collection" modal. Caller appends `overlay` to a parent DOM node,
 * then opens via `show(collection)` and closes via `hide()`. State is closure-scoped.
 *
 * @param {object} opts
 * @param {import('./collections-api-client.js').DynamicMediaCollectionsClient} opts.client
 * @param {(key: string, fallback: string) => string} opts.t  Translation function.
 * @param {(info: {
 *   id: string, title: string, description: string, accessLevel: string,
 * }) => void} [opts.onUpdated]
 *   Invoked after a successful save with the updated metadata. Callers can patch
 *   local state in place instead of re-fetching.
 * @returns {{ overlay: HTMLElement, show: (collection: object) => void, hide: () => void }}
 */
export function createEditModal({ client, t, onUpdated }) {
  let editingCollection = null;

  const overlay = document.createElement('div');
  overlay.className = 'scr-modal-overlay';
  overlay.hidden = true;

  const dialog = document.createElement('div');
  dialog.className = 'scr-modal';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'scr-edit-heading');

  const header = document.createElement('div');
  header.className = 'scr-modal-header';

  const heading = document.createElement('h2');
  heading.id = 'scr-edit-heading';
  heading.className = 'scr-modal-heading';
  heading.textContent = t('editCollection', 'Edit collection');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'scr-modal-close';
  closeBtn.setAttribute('aria-label', t('close', 'Close'));
  closeBtn.textContent = '×';

  header.append(heading, closeBtn);

  const body = document.createElement('div');
  body.className = 'scr-modal-body';

  const titleLabel = document.createElement('label');
  titleLabel.className = 'scr-form-label';
  titleLabel.setAttribute('for', 'scr-edit-title');
  titleLabel.textContent = t('labelTitle', 'Title');
  const reqMark = document.createElement('span');
  reqMark.className = 'scr-form-required';
  reqMark.setAttribute('aria-hidden', 'true');
  reqMark.textContent = ' *';
  titleLabel.append(reqMark);

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.id = 'scr-edit-title';
  titleInput.className = 'scr-form-input';
  titleInput.autocomplete = 'off';

  const descLabel = document.createElement('label');
  descLabel.className = 'scr-form-label';
  descLabel.setAttribute('for', 'scr-edit-desc');
  descLabel.textContent = t('description', 'Description');

  const descInput = document.createElement('textarea');
  descInput.id = 'scr-edit-desc';
  descInput.className = 'scr-form-textarea';
  descInput.rows = 3;

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

  const ownerBadge = document.createElement('span');
  ownerBadge.className = 'scr-modal-owner-badge';
  ownerBadge.textContent = t('owner', 'Owner');

  ownerRow.append(ownerAvatar, ownerName, ownerBadge);

  const scopeSelect = document.createElement('select');
  scopeSelect.id = 'scr-edit-scope';
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

  const footer = document.createElement('div');
  footer.className = 'scr-modal-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'scr-modal-btn scr-modal-btn-cancel';
  cancelBtn.textContent = t('cancel', 'Cancel');

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'scr-modal-btn scr-modal-btn-create';
  saveBtn.textContent = t('save', 'Save');

  footer.append(cancelBtn, saveBtn);
  dialog.append(header, body, footer);
  overlay.append(dialog);

  const hide = () => {
    overlay.hidden = true;
    editingCollection = null;
  };

  const show = (collection) => {
    editingCollection = collection;
    titleInput.value = collection.name || '';
    descInput.value = collection.description || '';
    scopeSelect.value = getScopeFromCollection(collection);
    const ownerEmail = collection?.acl?.[CollectionAclField.OWNER]
      || window.user?.email || '';
    ownerName.textContent = ownerEmail || window.user?.name || '';
    overlay.hidden = false;
    titleInput.focus();
  };

  closeBtn.addEventListener('click', hide);
  cancelBtn.addEventListener('click', hide);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hide();
  });

  saveBtn.addEventListener('click', async () => {
    const name = titleInput.value.trim();
    if (!name) {
      titleInput.focus();
      showToast(t('collectionNameRequired', 'Collection name is required'), 'info');
      return;
    }
    if (!editingCollection) return;

    saveBtn.disabled = true;
    const orig = saveBtn.textContent;
    saveBtn.textContent = t('saving', 'Saving…');

    try {
      const scope = scopeSelect.value;
      const accessLevel = scopeToAccessLevel(scope);
      const existingAcl = editingCollection.acl || {};
      const updateData = {
        title: name,
        accessLevel,
        'custom:metadata': {
          'custom:acl': {
            [CollectionAclField.OWNER]:
              existingAcl[CollectionAclField.OWNER] || window.user?.email || '',
            [CollectionAclField.VIEWER]:
              existingAcl[CollectionAclField.VIEWER] || [],
            ...(scope === 'public-edit' ? {
              [CollectionAclField.EDITOR]:
                existingAcl[CollectionAclField.EDITOR] || [],
            } : {}),
          },
        },
      };
      updateData.description = descInput.value.trim();

      await client.updateCollectionMetadata(editingCollection.id, updateData);
      const updateInfo = {
        id: editingCollection.id,
        title: name,
        description: updateData.description,
        accessLevel,
      };
      hide();
      showToast(t('collectionUpdatedSuccessfully', 'Collection updated successfully'), 'success');
      if (onUpdated) onUpdated(updateInfo);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[collection-modals] update failed', err);
      showToast(t('collectionUpdateFailed', 'Failed to update collection. Please try again.'), 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = orig;
    }
  });

  return { overlay, show, hide };
}

// ── Delete Collection Modal ──────────────────────────────────────────────────

/**
 * Build a "Delete Collection" alert dialog. The dialog confirms with the user before
 * issuing the delete. Caller appends `overlay` and triggers via `show(collection)`.
 *
 * @param {object} opts
 * @param {import('./collections-api-client.js').DynamicMediaCollectionsClient} opts.client
 * @param {(key: string, fallback: string) => string} opts.t
 * @param {(deleted: object) => void} [opts.onDeleted]
 *   Invoked after a successful delete with the just-deleted collection object.
 * @returns {{ overlay: HTMLElement, show: (collection: object) => void, hide: () => void }}
 */
export function createDeleteModal({ client, t, onDeleted }) {
  let deletingCollection = null;

  const overlay = document.createElement('div');
  overlay.className = 'scr-modal-overlay';
  overlay.hidden = true;

  const dialog = document.createElement('div');
  dialog.className = 'scr-modal scr-modal-sm';
  dialog.setAttribute('role', 'alertdialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'scr-delete-heading');

  const header = document.createElement('div');
  header.className = 'scr-modal-header';

  const heading = document.createElement('h2');
  heading.id = 'scr-delete-heading';
  heading.className = 'scr-modal-heading';
  heading.textContent = t('deleteCollection', 'Delete collection');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'scr-modal-close';
  closeBtn.setAttribute('aria-label', t('close', 'Close'));
  closeBtn.textContent = '×';

  header.append(heading, closeBtn);

  const body = document.createElement('div');
  body.className = 'scr-modal-body scr-delete-body';

  const msg = document.createElement('p');
  msg.className = 'scr-delete-msg';
  const nameSpan = document.createElement('strong');
  nameSpan.className = 'scr-delete-name';
  msg.append(
    document.createTextNode(`${t('deleteCollectionConfirm', 'Are you sure you want to delete')} "`),
    nameSpan,
    document.createTextNode('"?'),
  );

  const warn = document.createElement('p');
  warn.className = 'scr-delete-warn';
  warn.textContent = t('actionCannotBeUndone', 'This action cannot be undone.');

  body.append(msg, warn);

  const footer = document.createElement('div');
  footer.className = 'scr-modal-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'scr-modal-btn scr-modal-btn-cancel';
  cancelBtn.textContent = t('cancel', 'Cancel');

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'scr-modal-btn scr-modal-btn-delete';
  deleteBtn.textContent = t('delete', 'Delete');

  footer.append(cancelBtn, deleteBtn);
  dialog.append(header, body, footer);
  overlay.append(dialog);

  const hide = () => {
    overlay.hidden = true;
    deletingCollection = null;
  };

  const show = (collection) => {
    deletingCollection = collection;
    nameSpan.textContent = collection.name || '';
    overlay.hidden = false;
    deleteBtn.focus();
  };

  closeBtn.addEventListener('click', hide);
  cancelBtn.addEventListener('click', hide);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hide();
  });

  deleteBtn.addEventListener('click', async () => {
    if (!deletingCollection) return;
    deleteBtn.disabled = true;
    const orig = deleteBtn.textContent;
    deleteBtn.textContent = t('deleting', 'Deleting…');

    try {
      await client.deleteCollection(deletingCollection.id);
      const deleted = deletingCollection;
      hide();
      showToast(t('collectionDeletedSuccessfully', 'Collection deleted'), 'success');
      if (onDeleted) onDeleted(deleted);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[collection-modals] delete failed', err);
      showToast(t('collectionDeleteFailed', 'Failed to delete collection. Please try again.'), 'error');
    } finally {
      deleteBtn.disabled = false;
      deleteBtn.textContent = orig;
    }
  });

  return { overlay, show, hide };
}

// ── Share Access Modal ───────────────────────────────────────────────────────

/**
 * Build a "Share Collection" modal that edits the viewer ACL of a private collection.
 * Save commits the full new viewer list via updateCollectionMetadata.
 *
 * @param {object} opts
 * @param {import('./collections-api-client.js').DynamicMediaCollectionsClient} opts.client
 * @param {(key: string, fallback: string) => string} opts.t
 * @param {(info: { viewers: string[] }) => void} [opts.onUpdated]
 *   Invoked after a successful save with the new viewer list.
 * @returns {{ overlay: HTMLElement, show: (collection: object) => void, hide: () => void }}
 */
export function createShareModal({ client, t, onUpdated }) {
  let sharingCollection = null;
  let sharingViewers = [];
  let sharingDirty = false;

  const overlay = document.createElement('div');
  overlay.className = 'scr-modal-overlay';
  overlay.hidden = true;

  const dialog = document.createElement('div');
  dialog.className = 'scr-modal';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'scr-share-heading');

  const header = document.createElement('div');
  header.className = 'scr-modal-header';

  const heading = document.createElement('h2');
  heading.id = 'scr-share-heading';
  heading.className = 'scr-modal-heading';
  heading.textContent = t('shareCollection', 'Share Collection');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'scr-modal-close';
  closeBtn.setAttribute('aria-label', t('close', 'Close'));
  closeBtn.textContent = '×';

  header.append(heading, closeBtn);

  const body = document.createElement('div');
  body.className = 'scr-modal-body';

  const addLabel = document.createElement('label');
  addLabel.className = 'scr-form-label';
  addLabel.setAttribute('for', 'scr-share-input');
  addLabel.textContent = t('addViewers', 'Add Viewers');

  const addRow = document.createElement('div');
  addRow.className = 'scr-share-add';

  const addInput = document.createElement('input');
  addInput.type = 'email';
  addInput.id = 'scr-share-input';
  addInput.className = 'scr-form-input scr-share-add-input';
  addInput.autocomplete = 'off';
  addInput.placeholder = t('emailPlaceholder', 'alice@example.com, bob@example.com');

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'scr-share-add-btn';
  addBtn.textContent = t('add', 'Add');

  addRow.append(addInput, addBtn);

  const addError = document.createElement('div');
  addError.className = 'scr-share-add-error';
  addError.hidden = true;

  const listHeading = document.createElement('div');
  listHeading.className = 'scr-modal-access-heading scr-share-list-heading';

  const list = document.createElement('div');
  list.className = 'scr-share-people';

  body.append(addLabel, addRow, addError, listHeading, list);

  const footer = document.createElement('div');
  footer.className = 'scr-modal-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'scr-modal-btn scr-modal-btn-cancel';
  cancelBtn.textContent = t('cancel', 'Cancel');

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'scr-modal-btn scr-modal-btn-create';
  saveBtn.textContent = t('save', 'Save');

  footer.append(cancelBtn, saveBtn);
  dialog.append(header, body, footer);
  overlay.append(dialog);

  const renderList = () => {
    list.textContent = '';
    const ownerEmail = sharingCollection?.acl?.[CollectionAclField.OWNER] || '';
    const count = (ownerEmail ? 1 : 0) + sharingViewers.length;
    listHeading.textContent = `${t('peopleWithViewAccess', 'People with view access')} (${count})`;

    if (ownerEmail) {
      const row = document.createElement('div');
      row.className = 'scr-share-person-row';
      const av = document.createElement('span');
      av.className = 'scr-share-person-avatar';
      av.innerHTML = ICON_PERSON_SM;
      const name = document.createElement('span');
      name.className = 'scr-share-person-name';
      name.textContent = ownerEmail;
      const badge = document.createElement('span');
      badge.className = 'scr-modal-owner-badge';
      badge.textContent = t('owner', 'Owner');
      row.append(av, name, badge);
      list.append(row);
    }
    sharingViewers.forEach((email) => {
      const row = document.createElement('div');
      row.className = 'scr-share-person-row';
      const av = document.createElement('span');
      av.className = 'scr-share-person-avatar';
      av.innerHTML = ICON_PERSON_SM;
      const name = document.createElement('span');
      name.className = 'scr-share-person-name';
      name.textContent = email;
      const role = document.createElement('span');
      role.className = 'scr-share-person-role';
      role.textContent = t('canView', 'Can view');
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'scr-share-person-remove';
      remove.setAttribute('aria-label', t('remove', 'Remove'));
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        sharingViewers = sharingViewers.filter((e) => e !== email);
        sharingDirty = true;
        renderList();
      });
      row.append(av, name, role, remove);
      list.append(row);
    });
    saveBtn.disabled = !sharingDirty;
  };

  const hide = () => {
    overlay.hidden = true;
    sharingCollection = null;
    sharingViewers = [];
    sharingDirty = false;
  };

  const show = (collection) => {
    sharingCollection = collection;
    const existing = collection?.acl?.[CollectionAclField.VIEWER];
    sharingViewers = Array.isArray(existing) ? [...existing] : [];
    sharingDirty = false;
    addError.hidden = true;
    addInput.value = '';
    renderList();
    overlay.hidden = false;
    addInput.focus();
  };

  // Add handler — accepts a single email or a comma/space/newline-separated list.
  const tryAdd = () => {
    addError.hidden = true;
    const raw = addInput.value.trim();
    if (!raw) return;

    const ownerEmail = (sharingCollection?.acl?.[CollectionAclField.OWNER] || '').toLowerCase();
    const existingLower = new Set(sharingViewers.map((e) => e.toLowerCase()));

    const tokens = raw.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    const added = [];
    const invalid = [];
    const skipped = [];

    tokens.forEach((tok) => {
      if (!EMAIL_RE.test(tok)) { invalid.push(tok); return; }
      const lower = tok.toLowerCase();
      if (lower === ownerEmail) { skipped.push(tok); return; }
      if (existingLower.has(lower)) { skipped.push(tok); return; }
      existingLower.add(lower);
      added.push(tok);
    });

    if (added.length === 0 && invalid.length === 0 && skipped.length === 0) return;

    if (added.length > 0) {
      sharingViewers.push(...added);
      sharingDirty = true;
    }

    if (invalid.length > 0) {
      const head = invalid.length === 1
        ? t('invalidEmail', 'Enter a valid email address')
        : `${t('invalidEmails', 'Invalid')}: ${invalid.join(', ')}`;
      addError.textContent = head;
      addError.hidden = false;
    } else if (added.length === 0 && skipped.length > 0) {
      addError.textContent = t('emailAlreadyAdded', 'Already added');
      addError.hidden = false;
    }

    addInput.value = invalid.length > 0 ? invalid.join(', ') : '';

    renderList();
    if (added.length > 0) {
      list.scrollTop = list.scrollHeight;
    }
    addInput.focus();
  };

  addBtn.addEventListener('click', tryAdd);
  addInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      tryAdd();
    }
  });
  addInput.addEventListener('input', () => { addError.hidden = true; });

  closeBtn.addEventListener('click', hide);
  cancelBtn.addEventListener('click', hide);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hide();
  });

  saveBtn.addEventListener('click', async () => {
    if (!sharingCollection || !sharingDirty) return;
    saveBtn.disabled = true;
    const orig = saveBtn.textContent;
    saveBtn.textContent = t('saving', 'Saving…');
    try {
      const existingAcl = sharingCollection.acl || {};
      const updateData = {
        'custom:metadata': {
          'custom:acl': {
            ...existingAcl,
            [CollectionAclField.VIEWER]: [...sharingViewers],
          },
        },
      };
      await client.updateCollectionMetadata(sharingCollection.id, updateData);
      const updatedViewers = [...sharingViewers];
      hide();
      showToast(t('accessUpdated', 'Access updated'), 'success');
      if (onUpdated) onUpdated({ viewers: updatedViewers });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[collection-modals] share access save failed', err);
      showToast(t('accessUpdateFailed', 'Failed to update access. Please try again.'), 'error');
    } finally {
      saveBtn.disabled = !sharingDirty;
      saveBtn.textContent = orig;
    }
  });

  return { overlay, show, hide };
}
