/**
 * My Messages Block
 * Main block logic for displaying and managing user notifications
 */

import { createMessagesClient } from '../../scripts/notifications/notifications-client.js';
import {
  filterByStatus,
  filterByPriority,
  filterByType,
  sortByDate,
  getUnreadCount,
  getMessagesToAutoDelete,
  cleanupSystemNotificationsRead,
  cleanupSystemNotificationsDeleted,
  getSystemNotificationsDeleted,
  SYSTEM_MESSAGE_OWNER,
} from '../../scripts/notifications/notifications-helpers.js';
import {
  createMessagesList,
  createFilterControls,
  createMessageCount,
  showToast,
} from './ui-components.js';
import {
  createDeleteModal,
  showDeleteModal,
  hideDeleteModal,
  getDeleteState,
} from './modals.js';
import { getAppLabel } from '../../scripts/locale-utils.js';

// Global state
let messagesClient = null;
let allMessages = [];
let isLoading = false;
let t = null; // Translation function

// Current filter state
let currentFilters = {
  status: 'all',
  type: 'all',
  priority: 'all',
};

/**
 * Main decorate function - initializes the notifications block
 * @param {HTMLElement} block - The block element to decorate
 */
export default async function decorate(block) {
  // Clear existing content
  block.innerHTML = '';

  // Load localized labels
  t = await getAppLabel();

  // Load user if not already available
  if (!window.user) {
    // eslint-disable-next-line no-console
    console.warn('⚠️ [Messages] User not loaded, proceeding without user context');
  }

  // Initialize the Messages client
  try {
    messagesClient = createMessagesClient();
    // eslint-disable-next-line no-console
    console.log('🔧 [Messages] Client initialized');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize Notifications client:', error);
    showError(block, t('failedToInitializeNotifications', 'Failed to initialize notifications service'));
    return;
  }

  // Create main container
  const container = document.createElement('div');
  container.className = 'my-notifications-container';

  // Create header
  const header = document.createElement('div');
  header.className = 'my-notifications-header';

  const title = document.createElement('h1');
  title.className = 'my-notifications-title';
  title.textContent = t('myNotifications', 'My Notifications');

  header.appendChild(title);

  // Load messages from API
  await loadMessages();

  // Auto-cleanup expired messages
  await cleanupExpiredMessages();

  // Create filter controls (pass getter so dropdowns always merge with latest state)
  const filterControls = createFilterControls(() => currentFilters, handleFilterChange, t);

  // Create message count
  const filteredMessages = applyFilters(allMessages);
  const unreadCount = getUnreadCount(allMessages);
  const messageCount = createMessageCount(
    allMessages.length,
    unreadCount,
    filteredMessages.length,
    t,
  );

  // Create controls row
  const controlsRow = document.createElement('div');
  controlsRow.className = 'my-notifications-controls';
  controlsRow.appendChild(messageCount);
  controlsRow.appendChild(filterControls);

  // Create messages list
  const handlers = {
    onView: handleViewMessage,
    onDelete: handleDeleteMessage,
    onMarkRead: handleMarkAsRead,
  };
  const messagesList = createMessagesList(filteredMessages, handlers, t);

  // Create modals
  const deleteModal = createDeleteModal(handleConfirmDelete, hideDeleteModal, t);

  // Assemble the component
  container.appendChild(header);
  container.appendChild(controlsRow);
  container.appendChild(messagesList);
  container.appendChild(deleteModal);

  block.appendChild(container);

  // Update header badge if function exists
  if (window.updateMessageBadge) {
    window.updateMessageBadge(unreadCount);
  }
}

/**
 * Load messages - blends KV and sample data for testing
 */
async function loadMessages() {
  if (isLoading || !messagesClient) return;

  isLoading = true;
  try {
    // Load blended messages (KV + Sample)
    allMessages = await messagesClient.loadBlendedMessages();

    // Clean up stale system notification read/deleted IDs from localStorage
    cleanupSystemNotificationsRead(allMessages);
    cleanupSystemNotificationsDeleted(allMessages);

    // Filter out deleted system messages
    const deletedSystemIds = getSystemNotificationsDeleted();
    allMessages = allMessages.filter((msg) => {
      // Keep user messages (they're deleted via API)
      if (msg.owner !== SYSTEM_MESSAGE_OWNER) {
        return true;
      }
      // Filter out deleted system messages
      return !deletedSystemIds.includes(msg.id);
    });

    // Sort by date (newest first)
    allMessages = sortByDate(allMessages);

    updateMessagesDisplay();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load notifications:', error);
    showToast(t('failedToLoadNotifications', 'Failed to load notifications'), 'error');
    allMessages = [];
  } finally {
    isLoading = false;
  }
}

/**
 * Cleanup expired messages
 * SYSTEM messages: only delete if read AND expired
 * User messages: delete if expired
 */
async function cleanupExpiredMessages() {
  try {
    const messagesToDelete = getMessagesToAutoDelete(allMessages);

    if (messagesToDelete.length === 0) {
      return;
    }

    // Delete messages (pass full message objects to properly handle system messages)
    await messagesClient.deleteMessages(messagesToDelete);

    // Remove from local state
    const deletedIds = new Set(messagesToDelete.map((msg) => msg.id));
    allMessages = allMessages.filter((msg) => !deletedIds.has(msg.id));

    // Update display
    updateMessagesDisplay();

    // Update header badge
    const unreadCount = getUnreadCount(allMessages);
    if (window.updateMessageBadge) {
      window.updateMessageBadge(unreadCount);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to cleanup expired notifications:', error);
  }
}

/**
 * Apply current filters to notification
 * @param {Array} messages - Notification to filter
 * @returns {Array} Filtered notifications
 */
function applyFilters(messages) {
  let filtered = [...messages];

  // Apply status filter
  filtered = filterByStatus(filtered, currentFilters.status);

  // Apply type filter
  filtered = filterByType(filtered, currentFilters.type);

  // Apply priority filter
  filtered = filterByPriority(filtered, currentFilters.priority);

  return filtered;
}

/**
 * Update messages display
 */
function updateMessagesDisplay() {
  const filteredMessages = applyFilters(allMessages);
  const unreadCount = getUnreadCount(allMessages);

  // Update message count
  const messageCount = createMessageCount(
    allMessages.length,
    unreadCount,
    filteredMessages.length,
    t,
  );
  const existingCount = document.querySelector('.notification-count');
  if (existingCount) {
    existingCount.parentNode.replaceChild(messageCount, existingCount);
  }

  // Update messages list container (includes header + list)
  const existingContainer = document.querySelector('.notifications-list-container');
  if (existingContainer) {
    const handlers = {
      onView: handleViewMessage,
      onDelete: handleDeleteMessage,
      onMarkRead: handleMarkAsRead,
    };
    const newContainer = createMessagesList(filteredMessages, handlers, t);
    existingContainer.parentNode.replaceChild(newContainer, existingContainer);
  }

  // Update header badge
  if (window.updateMessageBadge) {
    window.updateMessageBadge(unreadCount);
  }
}

/**
 * Handle filter change
 * @param {Object} newFilters - New filter state
 */
function handleFilterChange(newFilters) {
  currentFilters = newFilters;
  updateMessagesDisplay();
}

/**
 * Handle view message
 * Message expansion is handled by the UI component
 */
function handleViewMessage() {
  // No additional action needed - UI component handles the toggle
}

/**
 * Handle mark message as read
 * @param {Object} message - Message object
 */
async function handleMarkAsRead(message) {
  // For system messages, check localStorage
  if (message.owner === SYSTEM_MESSAGE_OWNER) {
    const { getSystemNotificationsRead } = await import('../../scripts/notifications/notifications-helpers.js');
    const systemReadIds = getSystemNotificationsRead();
    if (systemReadIds.includes(message.id)) {
      return; // Already read
    }
  } else if (message.status === 'read') {
    return; // Already read
  }

  try {
    // Update via API (or localStorage for system messages)
    await messagesClient.markAsRead(message);

    // Update local state
    const messageIndex = allMessages.findIndex((m) => m.id === message.id);
    if (messageIndex !== -1) {
      allMessages[messageIndex].status = 'read';
    }

    // Update UI
    const messageRow = document.querySelector(`[data-notification-id="${message.id}"]`);
    if (messageRow) {
      messageRow.classList.remove('notification-row-unread');
      const statusIndicator = messageRow.querySelector('.notification-status-indicator');
      if (statusIndicator) {
        statusIndicator.innerHTML = '';
      }
    }

    // Update counts
    const unreadCount = getUnreadCount(allMessages);
    const filteredMessages = applyFilters(allMessages);
    const messageCount = createMessageCount(
      allMessages.length,
      unreadCount,
      filteredMessages.length,
      t,
    );
    const existingCount = document.querySelector('.notification-count');
    if (existingCount) {
      existingCount.parentNode.replaceChild(messageCount, existingCount);
    }

    // Update header badge
    if (window.updateMessageBadge) {
      window.updateMessageBadge(unreadCount);
    }

    // Show success toast
    showToast(t('notificationMarkedAsRead', 'NOTIFICATION MARKED AS READ'), 'success');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to mark notification as read:', error);
    showToast(t('failedToMarkAsRead', 'Failed to mark notification as read'), 'error');
  }
}

/**
 * Handle delete message
 * @param {Object} message - Message object
 */
function handleDeleteMessage(message) {
  showDeleteModal(message.id, message.subject);
}

/**
 * Handle confirm delete
 */
async function handleConfirmDelete() {
  const { messageId } = getDeleteState();
  if (!messageId) return;

  try {
    // Find the message in our local state
    const message = allMessages.find((m) => m.id === messageId);
    if (!message) {
      throw new Error('Notification not found');
    }

    // Delete via API (or localStorage for system messages)
    await messagesClient.deleteMessage(message);

    // Remove from local state
    allMessages = allMessages.filter((m) => m.id !== messageId);

    // Hide modal
    hideDeleteModal();

    // Show success message
    showToast(t('notificationDeletedSuccessfully', 'NOTIFICATION DELETED SUCCESSFULLY'), 'success');

    // Update display
    updateMessagesDisplay();

    // Update header badge
    const unreadCount = getUnreadCount(allMessages);
    if (window.updateMessageBadge) {
      window.updateMessageBadge(unreadCount);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to delete notification:', error);

    // Hide modal
    hideDeleteModal();

    showToast(t('failedToDeleteNotification', 'Failed to delete notification'), 'error');
  }
}

/**
 * Show error state
 * @param {HTMLElement} block - Block element
 * @param {string} message - Error message
 */
function showError(block, message) {
  const errorLabel = t ? t('error', 'Error') : 'Error';
  const retryLabel = t ? t('retry', 'Retry') : 'Retry';
  block.innerHTML = `
    <div class="my-notifications-container">
      <div class="notifications-error">
        <h2>${errorLabel}</h2>
        <p>${message}</p>
        <button onclick="location.reload()" class="btn-retry">${retryLabel}</button>
      </div>
    </div>
  `;
}
