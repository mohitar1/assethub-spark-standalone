/**
 * Message helper utilities
 * Provides expiration checking, filtering, sorting, and formatting functions
 */

// Constants
const LOCALSTORAGE_KEYS = {
  SYSTEM_NOTIFICATIONS_READ: 'spark-system-notifications-read',
  SYSTEM_NOTIFICATIONS_DELETED: 'spark-system-notifications-deleted',
};

export const SYSTEM_MESSAGE_OWNER = 'SYSTEM';

// Priority sorting constants
const PRIORITY_ORDER = { important: 0, normal: 1 };
const UNKNOWN_PRIORITY_VALUE = 999;

// UI display constants
const EMPTY_VALUE_PLACEHOLDER = '—';

/**
 * Check if a message is expired based on its date and expiresInXDays
 * @param {Object} message - Message object with date and expiresInXDays properties
 * @returns {boolean} True if message is expired
 */
export function isMessageExpired(message) {
  if (!message || !message.date || message.expiresInXDays === undefined) {
    return false;
  }

  const messageDate = new Date(message.date);
  const expirationDate = new Date(messageDate);
  expirationDate.setDate(expirationDate.getDate() + message.expiresInXDays);

  const now = new Date();
  return now > expirationDate;
}

/**
 * Get list of read system notification IDs from localStorage
 * @returns {Array} Array of system message IDs that have been read
 */
export function getSystemNotificationsRead() {
  try {
    const stored = localStorage.getItem(LOCALSTORAGE_KEYS.SYSTEM_NOTIFICATIONS_READ);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error reading system notifications from localStorage:', error);
    return [];
  }
}

/**
 * Mark a system notification as read in localStorage
 * @param {string} messageId - System message ID to mark as read
 */
export function markSystemNotificationAsRead(messageId) {
  try {
    const readIds = getSystemNotificationsRead();
    if (!readIds.includes(messageId)) {
      readIds.push(messageId);
      localStorage.setItem(LOCALSTORAGE_KEYS.SYSTEM_NOTIFICATIONS_READ, JSON.stringify(readIds));
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error marking system notification as read:', error);
  }
}

/**
 * Clean up non-existent system notification IDs from localStorage
 * Called on every page load before displaying messages.
 * Note: We keep tracking read IDs even for expired messages, since expired messages
 * may still exist in the data source until auto-cleanup runs
 * @param {Array} currentSystemMessages - Array of current system message objects
 */
export function cleanupSystemNotificationsRead(currentSystemMessages) {
  try {
    const readIds = getSystemNotificationsRead();
    const systemMessages = currentSystemMessages.filter(
      (msg) => msg.owner === SYSTEM_MESSAGE_OWNER,
    );

    // Get ALL system message IDs (including expired ones)
    const validIds = systemMessages.map((msg) => msg.id);

    // Only filter out IDs that no longer exist in the data source at all
    const cleanedIds = readIds.filter((id) => validIds.includes(id));

    // Only update if changed
    if (cleanedIds.length !== readIds.length) {
      localStorage.setItem(
        LOCALSTORAGE_KEYS.SYSTEM_NOTIFICATIONS_READ,
        JSON.stringify(cleanedIds),
      );
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error cleaning up system notifications:', error);
  }
}

/**
 * Get list of deleted system notification IDs from localStorage
 * @returns {Array} Array of system message IDs that have been deleted
 */
export function getSystemNotificationsDeleted() {
  try {
    const stored = localStorage.getItem(LOCALSTORAGE_KEYS.SYSTEM_NOTIFICATIONS_DELETED);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error reading deleted system notifications from localStorage:', error);
    return [];
  }
}

/**
 * Mark a system notification as deleted in localStorage
 * @param {string} messageId - System message ID to mark as deleted
 */
export function markSystemNotificationAsDeleted(messageId) {
  try {
    const deletedIds = getSystemNotificationsDeleted();
    if (!deletedIds.includes(messageId)) {
      deletedIds.push(messageId);
      localStorage.setItem(
        LOCALSTORAGE_KEYS.SYSTEM_NOTIFICATIONS_DELETED,
        JSON.stringify(deletedIds),
      );
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error marking system notification as deleted:', error);
  }
}

/**
 * Clean up non-existent system notification IDs from deleted list in localStorage
 * Called on every page load before displaying messages.
 * Note: We keep tracking deleted IDs even for expired messages, since expired messages
 * may still exist in the data source until auto-cleanup runs
 * @param {Array} currentSystemMessages - Array of current system message objects
 */
export function cleanupSystemNotificationsDeleted(currentSystemMessages) {
  try {
    const deletedIds = getSystemNotificationsDeleted();
    const systemMessages = currentSystemMessages.filter(
      (msg) => msg.owner === SYSTEM_MESSAGE_OWNER,
    );

    // Get ALL system message IDs (including expired ones)
    const validIds = systemMessages.map((msg) => msg.id);

    // Only filter out IDs that no longer exist in the data source at all
    const cleanedIds = deletedIds.filter((id) => validIds.includes(id));

    // Only update if changed
    if (cleanedIds.length !== deletedIds.length) {
      localStorage.setItem(
        LOCALSTORAGE_KEYS.SYSTEM_NOTIFICATIONS_DELETED,
        JSON.stringify(cleanedIds),
      );
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error cleaning up deleted system notifications:', error);
  }
}

/**
 * Filter out expired messages from an array
 * @param {Array} messages - Array of message objects
 * @returns {Array} Array of non-expired messages
 */
export function filterExpiredMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }
  return messages.filter((msg) => !isMessageExpired(msg));
}

/**
 * Get expired messages from an array
 * @param {Array} messages - Array of message objects
 * @returns {Array} Array of expired messages
 */
export function getExpiredMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }
  return messages.filter((msg) => isMessageExpired(msg));
}

/**
 * Get messages that should be auto-deleted
 * SYSTEM messages: only delete if read AND expired (checks localStorage)
 * User messages: delete if expired (regardless of read status)
 * @param {Array} messages - Array of message objects
 * @returns {Array} Array of messages to auto-delete
 */
export function getMessagesToAutoDelete(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  const systemReadIds = getSystemNotificationsRead();

  return messages.filter((msg) => {
    if (!isMessageExpired(msg)) {
      return false; // Not expired, don't delete
    }
    // SYSTEM messages: only delete if read AND expired (check localStorage)
    if (msg.owner === SYSTEM_MESSAGE_OWNER) {
      return systemReadIds.includes(msg.id);
    }
    // Regular user messages: delete if expired
    return true;
  });
}

/**
 * Filter messages by status
 * For system messages, checks localStorage; for user messages, checks message.status
 * @param {Array} messages - Array of message objects
 * @param {string} status - Status to filter by ('read', 'unread', or 'all')
 * @returns {Array} Filtered array of messages
 */
export function filterByStatus(messages, status) {
  if (!Array.isArray(messages) || !status || status === 'all') {
    return messages || [];
  }

  const systemReadIds = getSystemNotificationsRead();

  return messages.filter((msg) => {
    // For system messages, check localStorage
    if (msg.owner === SYSTEM_MESSAGE_OWNER) {
      const isRead = systemReadIds.includes(msg.id);
      if (status === 'read') {
        return isRead;
      }
      if (status === 'unread') {
        return !isRead;
      }
    }

    // For user messages, check status field
    return msg.status === status;
  });
}

/**
 * Filter messages by priority
 * @param {Array} messages - Array of message objects
 * @param {string} priority - Priority to filter by ('important', 'normal', or 'all')
 * @returns {Array} Filtered array of messages
 */
export function filterByPriority(messages, priority) {
  if (!Array.isArray(messages) || !priority || priority === 'all') {
    return messages || [];
  }
  return messages.filter((msg) => msg.priority === priority);
}

/**
 * Filter messages by type
 * @param {Array} messages - Array of message objects
 * @param {string} type - Type to filter by ('Announcement', 'Alert', 'Notification', or 'all')
 * @returns {Array} Filtered array of messages
 */
export function filterByType(messages, type) {
  if (!Array.isArray(messages) || !type || type === 'all') {
    return messages || [];
  }
  return messages.filter((msg) => msg.type === type);
}

/**
 * Get count of unread messages
 * For system messages, checks localStorage; for user messages, checks message.status
 * @param {Array} messages - Array of message objects
 * @returns {number} Count of unread messages
 */
export function getUnreadCount(messages) {
  if (!Array.isArray(messages)) {
    return 0;
  }

  const systemReadIds = getSystemNotificationsRead();

  return messages.filter((msg) => {
    // For system messages, check localStorage
    if (msg.owner === SYSTEM_MESSAGE_OWNER) {
      return !systemReadIds.includes(msg.id);
    }
    // For user messages, check status field
    return msg.status === 'unread';
  }).length;
}

/**
 * Sort messages by date (newest first by default)
 * @param {Array} messages - Array of message objects
 * @param {boolean} ascending - Sort ascending (oldest first) if true
 * @returns {Array} Sorted array of messages
 */
export function sortByDate(messages, ascending = false) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return [...messages].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return ascending ? dateA - dateB : dateB - dateA;
  });
}

/**
 * Sort messages by priority (important first)
 * @param {Array} messages - Array of message objects
 * @returns {Array} Sorted array of messages
 */
export function sortByPriority(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return [...messages].sort((a, b) => {
    const priorityA = PRIORITY_ORDER[a.priority] ?? UNKNOWN_PRIORITY_VALUE;
    const priorityB = PRIORITY_ORDER[b.priority] ?? UNKNOWN_PRIORITY_VALUE;
    return priorityA - priorityB;
  });
}

/**
 * Format a date for display
 * Format: "5 Sep 2025 14:45:47"
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
export function formatMessageDate(dateString) {
  if (!dateString) {
    return EMPTY_VALUE_PLACEHOLDER;
  }

  const date = new Date(dateString);

  // Check if date is valid
  if (Number.isNaN(date.getTime())) {
    return EMPTY_VALUE_PLACEHOLDER;
  }

  // Get date components
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();

  // Get time components (24-hour format)
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${day} ${month} ${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Truncate message content to a specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text with ellipsis if needed
 */
export function truncateMessage(text, maxLength = 100) {
  if (!text || text.length <= maxLength) {
    return text || '';
  }
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Get priority messages (important, unread)
 * For system messages, checks localStorage; for user messages, checks message.status
 * @param {Array} messages - Array of message objects
 * @returns {Array} Array of priority messages sorted by date
 */
export function getPriorityMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  const systemReadIds = getSystemNotificationsRead();

  const priorityMessages = messages.filter((msg) => {
    if (msg.priority !== 'important') {
      return false;
    }

    // For system messages, check localStorage
    if (msg.owner === SYSTEM_MESSAGE_OWNER) {
      return !systemReadIds.includes(msg.id);
    }

    // For user messages, check status field
    return msg.status === 'unread';
  });

  return sortByDate(priorityMessages);
}

/**
 * Generate a unique message ID
 * @param {string} userEmail - User's email address
 * @returns {string} Unique message ID
 */
export function generateMessageId(userEmail) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const userPrefix = userEmail ? userEmail.split('@')[0].substring(0, 4) : 'user';
  return `msg-${userPrefix}-${timestamp}-${random}`;
}

/**
 * Build KV key for a message
 * @param {string} userEmail - User's email address
 * @param {string} messageId - Message ID
 * @returns {string} KV key
 */
export function buildMessageKey(userEmail, messageId) {
  return `${userEmail}:${messageId}`;
}

/**
 * Parse KV key to extract user email and message ID
 * @param {string} key - KV key
 * @returns {Object} Object with userEmail and messageId properties
 */
export function parseMessageKey(key) {
  const parts = key.split(':');
  if (parts.length < 2) {
    return { userEmail: '', messageId: key };
  }
  return {
    userEmail: parts[0],
    messageId: parts.slice(1).join(':'),
  };
}

/**
 * Calculate days until message expiration
 * @param {Object} message - Message object
 * @returns {number} Days until expiration (negative if expired)
 */
export function getDaysUntilExpiration(message) {
  if (!message || !message.date || message.expiresInXDays === undefined) {
    return Infinity;
  }

  const messageDate = new Date(message.date);
  const expirationDate = new Date(messageDate);
  expirationDate.setDate(expirationDate.getDate() + message.expiresInXDays);

  const now = new Date();
  const diffMs = expirationDate - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}
