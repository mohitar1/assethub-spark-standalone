/**
 * Messages API Client
 * Provides a client SDK for interacting with the messages API
 */

import { getCurrentLocale } from '../locale-utils.js';
import { SYSTEM_MESSAGE_OWNER } from './notifications-helpers.js';

// Constants
const DEFAULT_BASE_URL = '/api/messages';
const DEFAULT_NOTIFICATION_TYPE = 'Notification';
const DEFAULT_FROM = 'System';
const DEFAULT_PRIORITY = 'normal';
const DEFAULT_EXPIRATION_DAYS = 30;
const DEFAULT_STATUS = 'unread';

/**
 * Messages API Client class
 */
export class MessagesClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.user = options.user || window.user;
  }

  /**
   * Get current user email
   * @returns {string} User email or empty string
   */
  getUserEmail() {
    return this.user?.email || '';
  }

  /**
   * Fetch all messages for the current user.
   * Passes current page locale so system notifications are loaded from the matching EDS path
   * (e.g. /en/system-notifications or /ja/system-notifications).
   * @returns {Promise<Array>} Array of message objects
   */
  async listMessages() {
    try {
      const locale = getCurrentLocale();
      const url = new URL(this.baseUrl, window.location.origin);
      url.searchParams.set('locale', locale);

      const response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list messages: ${response.statusText}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error listing messages:', error);
      throw error;
    }
  }

  /**
   * Get a specific message by ID
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Message object
   */
  async getMessage(messageId) {
    try {
      const response = await fetch(`${this.baseUrl}/${messageId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get message: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error getting message:', error);
      throw error;
    }
  }

  /**
   * Create a new message
   * @param {Object} messageData - Message data object
   * @returns {Promise<Object>} Created message object
   */
  async createMessage(messageData) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create message: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error creating message:', error);
      throw error;
    }
  }

  /**
   * Update an existing message
   * @param {string} messageId - Message ID
   * @param {Object} updates - Object with fields to update
   * @returns {Promise<Object>} Updated message object
   */
  async updateMessage(messageId, updates) {
    try {
      const response = await fetch(`${this.baseUrl}/${messageId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update message: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating message:', error);
      throw error;
    }
  }

  /**
   * Mark a message as read
   * For system messages, uses localStorage; for user messages, updates via API
   * @param {Object|string} messageOrId - Message object or message ID
   * @returns {Promise<Object|null>} Updated message object (null for system messages)
   */
  async markAsRead(messageOrId) {
    // Import helpers dynamically to avoid circular dependency
    const { markSystemNotificationAsRead } = await import('./notifications-helpers.js');

    // Handle if passed as message object
    if (typeof messageOrId === 'object' && messageOrId !== null) {
      const message = messageOrId;

      // For system messages, use localStorage only
      if (message.owner === SYSTEM_MESSAGE_OWNER) {
        markSystemNotificationAsRead(message.id);
        return null; // No API call needed
      }

      // For user messages, use API
      return this.updateMessage(message.id, { status: 'read' });
    }

    // If just messageId passed (backwards compatibility), assume user message
    return this.updateMessage(messageOrId, { status: 'read' });
  }

  /**
   * Mark a message as unread
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Updated message object
   */
  async markAsUnread(messageId) {
    return this.updateMessage(messageId, { status: 'unread' });
  }

  /**
   * Delete a message
   * For system messages, uses localStorage; for user messages, deletes via API
   * @param {Object|string} messageOrId - Message object or message ID
   * @returns {Promise<Object|null>} Response object (null for system messages)
   */
  async deleteMessage(messageOrId) {
    // Import helpers dynamically to avoid circular dependency
    const { markSystemNotificationAsDeleted } = await import('./notifications-helpers.js');

    // Handle if passed as message object
    if (typeof messageOrId === 'object' && messageOrId !== null) {
      const message = messageOrId;

      // For system messages, use localStorage only
      if (message.owner === SYSTEM_MESSAGE_OWNER) {
        markSystemNotificationAsDeleted(message.id);
        return null; // No API call needed
      }

      // For user messages, use API
      return this.deleteMessageById(message.id);
    }

    // If just messageId passed (backwards compatibility), assume user message
    return this.deleteMessageById(messageOrId);
  }

  /**
   * Delete a message by ID via API
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Response object
   * @private
   */
  async deleteMessageById(messageId) {
    try {
      const response = await fetch(`${this.baseUrl}/${messageId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete message: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Delete multiple messages
   * @param {Array<string|Object>} messagesOrIds - Array of message objects or message IDs
   * @returns {Promise<Array>} Array of delete results
   */
  async deleteMessages(messagesOrIds) {
    const deletePromises = messagesOrIds.map((msgOrId) => this.deleteMessage(msgOrId));
    return Promise.allSettled(deletePromises);
  }

  /**
   * Send a message to a specific user
   * Creates a new message in the recipient's inbox
   * @param {string} recipientEmail - Email of the recipient
   * @param {Object} messageData - Message data
   * @param {string} messageData.subject - Message subject
   * @param {string} messageData.message - Message content
   * @param {string} [messageData.type='Notification'] - Message type
   * @param {string} [messageData.from='System'] - Sender name
   * @param {string} [messageData.priority='normal'] - Priority level
   * @param {number} [messageData.expiresInXDays=30] - Days until expiration
   * @returns {Promise<Object>} Created message
   */
  async sendMessageToUser(recipientEmail, messageData) {
    const messageId = `msg-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

    const message = {
      id: messageId,
      owner: recipientEmail.toLowerCase(),
      date: new Date().toISOString(),
      subject: messageData.subject,
      message: messageData.message,
      type: messageData.type || DEFAULT_NOTIFICATION_TYPE,
      from: messageData.from || DEFAULT_FROM,
      priority: messageData.priority || DEFAULT_PRIORITY,
      expiresInXDays: messageData.expiresInXDays !== undefined
        ? messageData.expiresInXDays
        : DEFAULT_EXPIRATION_DAYS,
      status: DEFAULT_STATUS,
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error sending message to ${recipientEmail}:`, error);
      throw error;
    }
  }

  /**
   * Load blended messages (alias for listMessages for backward compatibility)
   * Now fetches from API which includes both KV user messages and EDS system notifications
   * @returns {Promise<Array>} Array of messages
   */
  async loadBlendedMessages() {
    return this.listMessages();
  }
}

/**
 * Create a default messages client instance
 * @returns {MessagesClient} Messages client instance
 */
export function createMessagesClient() {
  return new MessagesClient({
    user: window.user,
  });
}
