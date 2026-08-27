/**
 * Message Helper Utilities
 * Functions to send notifications via the Messages API
 */

import { fetchHelixSheet } from './helixutil.js';

const PERMISSIONS = { ADMIN_SYSTEM: 'admin-system' };

/**
 * Generate a unique message ID
 * @returns {string} Unique message ID
 */
function generateMessageId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `msg-${timestamp}-${random}`;
}

/**
 * Get system admin emails from the application permissions configuration.
 * Fetches /config/access/application and returns individual email entries
 * that have the "admin-system" permission.
 *
 * Domain-level entries (e.g. "adobe.com") are excluded because we cannot
 * enumerate individual users from a domain in the scheduled context.
 *
 * @param {Object} env - Cloudflare environment bindings
 * @returns {Promise<string[]>} Array of system admin email addresses
 */
export async function getSystemAdminEmails(env) {
  try {
    const permissions = await fetchHelixSheet(null, env, '/config/access/application', {
      sheet: { key: 'email', arrays: ['permissions'] },
    });

    if (!permissions) {
      console.warn('[Notifications] Could not load /config/access/application sheet for system admin lookup');
      return [];
    }

    const adminEmails = Object.entries(permissions)
      .filter(([email, entry]) => {
        if (!email.includes('@')) return false;
        const userPermissions = entry.permissions || [];
        return userPermissions.includes(PERMISSIONS.ADMIN_SYSTEM);
      })
      .map(([email]) => email.toLowerCase());

    return adminEmails;
  } catch (error) {
    console.error('[Notifications] Error fetching system admin users:', error);
    return [];
  }
}

/**
 * Send a message to a user
 * @param {Object} env - Environment bindings
 * @param {string} recipientEmail - Email of the recipient
 * @param {Object} messageData - Message data
 * @param {string} messageData.subject - Message subject
 * @param {string} messageData.message - Message content
 * @param {string} messageData.type - Message type (Announcement, Alert, Notification)
 * @param {string} messageData.from - Sender name
 * @param {string} messageData.priority - Priority (normal, important)
 * @param {number} messageData.expiresInXDays - Days until expiration
 * @returns {Promise<boolean>} True if message was sent successfully
 */
export async function sendMessage(env, recipientEmail, messageData) {
  try {
    const messageId = generateMessageId();
    const now = new Date().toISOString();

    const message = {
      id: messageId,
      owner: recipientEmail.toLowerCase(),
      date: now,
      subject: messageData.subject,
      message: messageData.message,
      type: messageData.type || 'Notification',
      from: messageData.from || 'System',
      priority: messageData.priority || 'normal',
      expiresInXDays: messageData.expiresInXDays ?? 7,
      status: 'unread',
    };

    // Store in MESSAGES KV
    const kvKey = `${recipientEmail.toLowerCase()}:${messageId}`;
    await env.MESSAGES.put(kvKey, JSON.stringify(message), {
      metadata: {
        priority: message.priority,
        status: message.status,
        type: message.type,
      },
    });

    // eslint-disable-next-line no-console
    console.log(`[Notifications] Message sent to ${recipientEmail}: ${messageData.subject}`);
    return true;
  } catch (error) {
    console.error(`[Notifications] Failed to send message to ${recipientEmail}:`, error);
    return false;
  }
}

/**
 * Send message to multiple recipients
 * @param {Object} env - Environment bindings
 * @param {Array<string>} recipientEmails - Array of recipient emails
 * @param {Object} messageData - Message data (same as sendMessage)
 * @returns {Promise<Object>} Result with success count
 */
export async function sendMessageToMultiple(env, recipientEmails, messageData) {
  const results = await Promise.allSettled(recipientEmails.map((email) => sendMessage(env, email, messageData)));

  const successCount = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
  const failCount = results.length - successCount;

  // eslint-disable-next-line no-console
  console.log(`[Notifications] Bulk send: ${successCount}/${results.length} succeeded`);

  return {
    total: results.length,
    success: successCount,
    failed: failCount,
  };
}
