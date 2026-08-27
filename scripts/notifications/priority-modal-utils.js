import {
  showGlobalModal,
  MODAL_CONTENT_TYPES,
  MODAL_BUTTON_ACTIONS,
  MODAL_BUTTON_VARIANTS,
} from '../global-modal.js';

const DEFAULT_SUMMARY_MODAL_HEIGHT = '420px';
const GENERIC_ALERT_DISMISS_KEY = 'spark-priority-generic-alert-dismissed';

function getGenericAlertDismissStorageKey(userEmail = '') {
  const normalizedEmail = String(userEmail || '').trim().toLowerCase();
  if (!normalizedEmail) {
    return GENERIC_ALERT_DISMISS_KEY;
  }
  return `${GENERIC_ALERT_DISMISS_KEY}:${normalizedEmail}`;
}

function buildAlertSignature(alertMessages = []) {
  return alertMessages
    .map((message) => message?.id)
    .filter(Boolean)
    .sort()
    .join('|');
}

/**
 * Check if generic alert summary modal was dismissed for the same alert set.
 * @param {Array} alertMessages - Current unread alert messages
 * @param {string} [userEmail] - Optional user email for key scoping
 * @returns {boolean} True when current alert set was dismissed before
 */
export function isGenericAlertModalDismissed(alertMessages, userEmail = '') {
  const signature = buildAlertSignature(alertMessages);
  if (!signature) {
    return false;
  }

  try {
    const key = getGenericAlertDismissStorageKey(userEmail);
    const storedSignature = localStorage.getItem(key);
    return storedSignature === signature;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to read generic alert modal dismissal state:', error);
    return false;
  }
}

/**
 * Persist dismissal state for current generic alert summary modal.
 * @param {Array} alertMessages - Current unread alert messages
 * @param {string} [userEmail] - Optional user email for key scoping
 */
export function markGenericAlertModalDismissed(alertMessages, userEmail = '') {
  const signature = buildAlertSignature(alertMessages);
  if (!signature) {
    return;
  }

  try {
    const key = getGenericAlertDismissStorageKey(userEmail);
    localStorage.setItem(key, signature);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to persist generic alert modal dismissal state:', error);
  }
}

/**
 * Show generic alert summary modal for multiple unread alerts.
 * @param {Object} options - Modal options
 * @param {string} options.id - Modal instance ID
 * @param {number} options.alertCount - Number of unread alert messages
 * @param {Function} options.onDismiss - Callback for dismiss action
 * @param {string} [options.title] - Modal title
 * @param {string} [options.bodyText] - Modal body text
 * @param {string} [options.dismissLabel] - Dismiss button label
 * @param {string} [options.redirectHref] - Optional redirect URL for CTA
 * @param {string} [options.redirectLabel] - Redirect button label
 * @param {string} [options.height] - Modal height
 * @returns {Object} Modal controls
 */
export default function showGenericAlertModal(options) {
  const {
    id,
    alertCount,
    onDismiss,
    title = 'You have multiple unread alerts',
    bodyText,
    dismissLabel = 'Dismiss',
    redirectHref,
    redirectLabel = 'View Notifications',
    height = DEFAULT_SUMMARY_MODAL_HEIGHT,
  } = options;

  const contentText = bodyText
    || `${alertCount} alert notifications need your attention. `
      + 'Open Notifications to review all alerts and messages.';

  const buttons = [
    {
      key: 'dismiss',
      label: dismissLabel,
      variant: MODAL_BUTTON_VARIANTS.SECONDARY,
      action: MODAL_BUTTON_ACTIONS.CUSTOM,
      closeOnClick: true,
      onClick: async () => {
        if (typeof onDismiss === 'function') {
          await onDismiss();
        }
      },
    },
  ];

  if (redirectHref) {
    buttons.push({
      key: 'viewNotifications',
      label: redirectLabel,
      variant: MODAL_BUTTON_VARIANTS.PRIMARY,
      action: MODAL_BUTTON_ACTIONS.REDIRECT,
      href: redirectHref,
    });
  }

  return showGlobalModal({
    id,
    type: 'priority-summary',
    title,
    height,
    showCloseButton: false,
    closeOnOverlay: false,
    closeOnEscape: false,
    content: {
      type: MODAL_CONTENT_TYPES.SCROLLABLE_TEXT,
      value: contentText,
    },
    buttons,
  });
}
