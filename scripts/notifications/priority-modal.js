/**
 * Priority Message Modal - Auto-show on page load
 * Checks for important unread messages and displays a modal
 */

import { createMessagesClient } from './notifications-client.js';
import {
  getPriorityMessages,
  filterByType,
  cleanupSystemNotificationsRead,
  cleanupSystemNotificationsDeleted,
  getSystemNotificationsDeleted,
  getUnreadCount,
  filterExpiredMessages,
  SYSTEM_MESSAGE_OWNER,
} from './notifications-helpers.js';
import {
  showGlobalModal,
  MODAL_CONTENT_TYPES,
  MODAL_BUTTON_ACTIONS,
  MODAL_BUTTON_VARIANTS,
} from '../global-modal.js';
import { localizePath } from '../locale-utils.js';
import showGenericAlertModal, {
  isGenericAlertModalDismissed,
  markGenericAlertModalDismissed,
} from './priority-modal-utils.js';

const ALERT_TYPE = 'Alert';
const NOTIFICATIONS_PAGE_PATH = '/my-dam/my-notifications';
const PRIORITY_MODAL_HEIGHT = '80vh';
const ALERT_SUMMARY_MODAL_HEIGHT = '420px';
const PRIORITY_MODAL_ID = 'priority-message-modal-global';

/**
 * Build modal content node for a priority message.
 * @param {Object} message - Priority message object
 * @returns {Object} Content node and CTA button label
 */
function buildPriorityModalContent(message) {
  const contentNode = document.createElement('div');

  const fromNode = document.createElement('div');
  fromNode.className = 'global-modal-meta';
  fromNode.textContent = `From: ${message.from}`;
  contentNode.appendChild(fromNode);

  const messageNode = document.createElement('div');
  messageNode.className = 'global-modal-rich-text';
  messageNode.innerHTML = message.message || '';
  contentNode.appendChild(messageNode);

  const ctaSpan = messageNode.querySelector('#important-cta-text');
  const ctaLabel = (ctaSpan?.textContent?.trim()) || 'Ok';

  return { contentNode, ctaLabel };
}

/**
 * Show single priority message modal.
 * @param {Object} message - Priority message object
 * @param {Function} onAcknowledge - Callback when acknowledged
 */
function showPriorityMessageModal(message, onAcknowledge) {
  const { contentNode, ctaLabel } = buildPriorityModalContent(message);

  showGlobalModal({
    id: PRIORITY_MODAL_ID,
    type: 'priority',
    title: message.subject,
    height: PRIORITY_MODAL_HEIGHT,
    showCloseButton: false,
    closeOnOverlay: false,
    closeOnEscape: false,
    content: {
      type: MODAL_CONTENT_TYPES.NODE,
      node: contentNode,
      scrollable: true,
    },
    buttons: [
      {
        key: 'acknowledge',
        label: ctaLabel,
        variant: MODAL_BUTTON_VARIANTS.PRIMARY,
        action: MODAL_BUTTON_ACTIONS.CUSTOM,
        closeOnClick: true,
        onClick: onAcknowledge,
      },
    ],
  });
}

/**
 * Update header message badge count.
 * @param {Array} messages - Messages list
 */
function updatePriorityBadge(messages) {
  if (!window.updateMessageBadge) {
    return;
  }

  const activeMessages = filterExpiredMessages(messages);
  const unreadCount = getUnreadCount(activeMessages);
  window.updateMessageBadge(unreadCount);
}

/**
 * Show the next priority message modal from the list.
 * @param {Array} priorityMessages - Full list of priority messages to show
 * @param {number} index - Current index to show
 * @param {Array} messages - Full messages list (for badge count)
 * @param {MessagesClient} client - Messages client
 */
function showNextPriorityModal(priorityMessages, index, messages, client) {
  if (index >= priorityMessages.length) {
    return;
  }

  const message = priorityMessages[index];

  showPriorityMessageModal(message, async () => {
    try {
      await client.markAsRead(message);
      if (message.owner !== SYSTEM_MESSAGE_OWNER) {
        message.status = 'read';
      }

      updatePriorityBadge(messages);
      showNextPriorityModal(priorityMessages, index + 1, messages, client);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to mark priority message as read:', error);
      showNextPriorityModal(priorityMessages, index + 1, messages, client);
    }
  });
}

/**
 * Check for priority messages and show modals one after another.
 */
export async function checkAndShowPriorityMessages() {
  const isNotificationsPage = window.location.pathname.includes('/my-dam/my-notifications');

  try {
    const client = createMessagesClient();
    const userEmail = client.getUserEmail();

    let messages = [];
    try {
      messages = await client.loadBlendedMessages();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('⚠️ [Priority Modal] Failed to load messages, skipping priority modal');
      return;
    }

    cleanupSystemNotificationsRead(messages);
    cleanupSystemNotificationsDeleted(messages);

    const deletedSystemIds = getSystemNotificationsDeleted();
    messages = messages.filter((msg) => {
      if (msg.owner !== SYSTEM_MESSAGE_OWNER) {
        return true;
      }
      return !deletedSystemIds.includes(msg.id);
    });

    updatePriorityBadge(messages);

    if (isNotificationsPage) {
      return;
    }

    const priorityMessages = getPriorityMessages(messages);
    if (priorityMessages.length === 0) {
      return;
    }

    const alertPriorityMessages = filterByType(priorityMessages, ALERT_TYPE);
    if (alertPriorityMessages.length > 1) {
      const alertIds = new Set(alertPriorityMessages.map((msg) => msg.id));
      const nonAlertPriorityMessages = priorityMessages.filter((msg) => !alertIds.has(msg.id));

      if (isGenericAlertModalDismissed(alertPriorityMessages, userEmail)) {
        if (nonAlertPriorityMessages.length > 0) {
          showNextPriorityModal(nonAlertPriorityMessages, 0, messages, client);
        }
        return;
      }

      showGenericAlertModal({
        id: PRIORITY_MODAL_ID,
        alertCount: alertPriorityMessages.length,
        onDismiss: () => {
          markGenericAlertModalDismissed(alertPriorityMessages, userEmail);
          if (nonAlertPriorityMessages.length > 0) {
            showNextPriorityModal(nonAlertPriorityMessages, 0, messages, client);
          }
        },
        redirectHref: localizePath(NOTIFICATIONS_PAGE_PATH),
        height: ALERT_SUMMARY_MODAL_HEIGHT,
      });
      return;
    }

    showNextPriorityModal(priorityMessages, 0, messages, client);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error checking priority messages:', error);
  }
}

/**
 * Initialize priority message check on page load.
 */
export function initPriorityMessages() {
  if (!window.user) {
    // eslint-disable-next-line no-console
    console.warn('⚠️ [Priority Modal] User not loaded, skipping priority message check');
  }
}
