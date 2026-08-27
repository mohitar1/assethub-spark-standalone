/**
 * Modal components for My Messages
 * Handles delete confirmation modal
 */

// Translation function - passed from main module via createDeleteModal
let t = null;

// Modal state management
let deleteModalState = {
  messageId: null,
  subject: '',
};

/**
 * Create delete confirmation modal
 * @param {Function} onConfirm - Callback when delete is confirmed
 * @param {Function} onCancel - Callback when delete is cancelled
 * @param {Function} translate - Translation function
 * @returns {HTMLElement} Delete modal element
 */
export function createDeleteModal(onConfirm, onCancel, translate) {
  t = translate;
  const modal = document.createElement('div');
  modal.className = 'delete-notification-modal';
  modal.style.display = 'none';

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.onclick = onCancel;

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';

  // Modal header
  const modalHeader = document.createElement('div');
  modalHeader.className = 'modal-header';

  const modalTitle = document.createElement('h2');
  modalTitle.className = 'modal-title';
  modalTitle.textContent = t('deleteNotification', 'Delete Notification');

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = onCancel;

  modalHeader.appendChild(modalTitle);
  modalHeader.appendChild(closeBtn);

  // Modal body
  const modalBody = document.createElement('div');
  modalBody.className = 'modal-body';
  modalBody.style.textAlign = 'center';
  modalBody.style.padding = '2rem';

  const warningText = document.createElement('p');
  warningText.style.fontSize = '1.1rem';
  warningText.style.marginBottom = '1rem';
  warningText.textContent = t('deleteNotificationConfirm', 'Are you sure you want to delete this notification?');

  const subjectText = document.createElement('p');
  subjectText.style.fontWeight = 'bold';
  subjectText.style.color = 'var(--primary-color)';
  subjectText.id = 'delete-notification-subject';

  const cautionText = document.createElement('p');
  cautionText.style.fontSize = '0.9rem';
  cautionText.style.color = '#666';
  cautionText.style.marginTop = '1rem';
  cautionText.textContent = t('actionCannotBeUndone', 'This action cannot be undone.');

  modalBody.appendChild(warningText);
  modalBody.appendChild(subjectText);
  modalBody.appendChild(cautionText);

  // Modal footer
  const modalFooter = document.createElement('div');
  modalFooter.className = 'modal-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-cancel';
  cancelBtn.textContent = t('cancel', 'Cancel');
  cancelBtn.onclick = onCancel;

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn-delete';
  confirmBtn.textContent = t('delete', 'Delete');
  confirmBtn.onclick = onConfirm;

  modalFooter.appendChild(cancelBtn);
  modalFooter.appendChild(confirmBtn);

  // Assemble modal
  modalContent.appendChild(modalHeader);
  modalContent.appendChild(modalBody);
  modalContent.appendChild(modalFooter);

  modal.appendChild(modalOverlay);
  modal.appendChild(modalContent);

  return modal;
}

/**
 * Show delete confirmation modal
 * @param {string} messageId - Message ID to delete
 * @param {string} subject - Message subject
 */
export function showDeleteModal(messageId, subject) {
  deleteModalState = { messageId, subject };

  const modal = document.querySelector('.delete-notification-modal');
  if (modal) {
    const subjectElement = modal.querySelector('#delete-notification-subject');
    if (subjectElement) {
      subjectElement.textContent = subject;
    }
    modal.style.display = 'flex';
  }
}

/**
 * Hide delete confirmation modal
 */
export function hideDeleteModal() {
  const modal = document.querySelector('.delete-notification-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  deleteModalState = { messageId: null, subject: '' };
}

/**
 * Get current delete state
 * @returns {Object} Delete state with messageId and subject
 */
export function getDeleteState() {
  return deleteModalState;
}
