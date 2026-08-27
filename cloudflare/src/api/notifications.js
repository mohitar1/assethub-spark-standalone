/**
 * Notifications API endpoints
 * Provides RESTful CRUD operations for the MESSAGES KV namespace
 */

import { error, json } from 'itty-router';
import { fetchHelixSheet } from '../util/helixutil.js';

// Constants
const DEFAULT_NOTIFICATION_TYPE = 'Notification';
const DEFAULT_FROM_EMAIL = 'system@spark-eds.adobe.com';
const DEFAULT_PRIORITY = 'normal';
const DEFAULT_EXPIRATION_DAYS = 30;
const DEFAULT_STATUS = 'unread';
const SYSTEM_NOTIFICATION_EXPIRATION_DAYS = 0;

// Locale for system notifications (must match EDS sheet path: /{locale}/system-notifications)
const SUPPORTED_SYSTEM_NOTIFICATION_LOCALES = ['en', 'ja'];
const DEFAULT_SYSTEM_NOTIFICATION_LOCALE = 'en';

/**
 * Main Notifications API handler - routes requests to appropriate endpoint
 */
export async function notificationsApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Extract notification ID from path if present
  // Path format: /api/messages or /api/messages/<notificationId>
  const pathParts = path.split('/').filter(Boolean);
  const notificationId = pathParts.length > 2 ? pathParts[2] : null;

  // Route based on method and presence of notificationId
  if (method === 'GET' && !notificationId) {
    return listNotifications(request, env);
  }
  if (method === 'GET' && notificationId) {
    return getNotification(request, env, notificationId);
  }
  if (method === 'POST' && !notificationId) {
    return createNotification(request, env);
  }
  if (method === 'POST' && notificationId) {
    return updateNotification(request, env, notificationId);
  }
  if (method === 'DELETE' && notificationId) {
    return deleteNotification(request, env, notificationId);
  }

  return error(404, { success: false, error: 'Notifications endpoint not found' });
}

/**
 * Get current user email from request
 * @param {Request} request - Request object
 * @returns {string} User email
 */
function getUserEmail(request) {
  // User email should be available from authentication middleware
  // Lowercase to match storage format in notifications-helpers.js
  return (request.user?.email || '').toLowerCase();
}

/**
 * Build KV key for a notification
 * @param {string} userEmail - User email
 * @param {string} notificationId - Notification ID
 * @returns {string} KV key
 */
function buildNotificationKey(userEmail, notificationId) {
  return `${userEmail}:${notificationId}`;
}

/**
 * Transform EDS notification data to lowercase format
 * @param {Object} edsNotification - Notification from EDS with capitalized fields
 * @returns {Object} Notification with lowercase fields
 */
function transformEdsNotification(edsNotification) {
  return {
    id: edsNotification.ID,
    date: edsNotification.Date,
    owner: edsNotification.Owner,
    subject: edsNotification.Subject,
    message: edsNotification.Message,
    type: edsNotification.Type,
    from: edsNotification.From,
    priority: edsNotification.Priority?.toLowerCase() || DEFAULT_PRIORITY,
    expiresInXDays: parseInt(edsNotification.ExpiresInXDays, 10) || SYSTEM_NOTIFICATION_EXPIRATION_DAYS,
    status: DEFAULT_STATUS,
  };
}

/**
 * Get locale from request query (for system notifications EDS path).
 * Validates against supported locales; defaults to en.
 * @param {Request} request - Request object
 * @returns {string} Locale code (e.g. 'en', 'ja')
 */
function getLocaleFromRequest(request) {
  const url = new URL(request.url);
  const localeParam = url.searchParams.get('locale');
  return SUPPORTED_SYSTEM_NOTIFICATION_LOCALES.includes(localeParam) ? localeParam : DEFAULT_SYSTEM_NOTIFICATION_LOCALE;
}

/**
 * Fetch system notifications from EDS for the given locale
 * @param {Request} request - Cloudflare request object
 * @param {Object} env - Environment bindings
 * @param {string} locale - Locale code (e.g. 'en', 'ja'); path becomes /{locale}/system-notifications
 * @returns {Promise<Array>} Array of system notifications
 */
async function fetchSystemNotifications(request, env, locale) {
  const safeLocale = SUPPORTED_SYSTEM_NOTIFICATION_LOCALES.includes(locale)
    ? locale
    : DEFAULT_SYSTEM_NOTIFICATION_LOCALE;
  const path = `/${safeLocale}/system-notifications`;
  try {
    const edsData = await fetchHelixSheet(request, env, path);
    if (!edsData?.data || !Array.isArray(edsData.data)) {
      console.warn('No system notifications data from EDS:', path);
      return [];
    }

    // Transform EDS data to lowercase format
    const systemNotifications = edsData.data.map(transformEdsNotification);
    return systemNotifications;
  } catch (err) {
    console.error('Error fetching system notifications from EDS:', err);
    // Graceful degradation: return empty array if EDS fetch fails
    return [];
  }
}

/**
 * List all notifications for the current user
 * GET /api/messages
 */
export async function listNotifications(request, env) {
  try {
    const userEmail = getUserEmail(request);
    if (!userEmail) {
      return error(401, { success: false, error: 'User not authenticated' });
    }

    const locale = getLocaleFromRequest(request);

    // Fetch user notifications from KV and system notifications from EDS in parallel
    const [kvNotifications, systemNotifications] = await Promise.all([
      (async () => {
        // List all keys with user email prefix
        const prefix = `${userEmail}:`;
        const { keys } = await env.MESSAGES.list({ prefix, limit: 1000 });

        // Fetch all notification values in parallel
        const notificationPromises = keys.map(async (key) => {
          const value = await env.MESSAGES.get(key.name, { type: 'text' });
          return safeJsonParse(value, key.name);
        });

        return (await Promise.all(notificationPromises)).filter((msg) => msg !== null);
      })(),
      fetchSystemNotifications(request, env, locale),
    ]);

    // Merge KV notifications with system notifications
    const allNotifications = [...kvNotifications, ...systemNotifications];

    return json({
      success: true,
      messages: allNotifications,
      count: allNotifications.length,
    });
  } catch (err) {
    console.error('Error listing notifications:', err);
    return error(500, { success: false, error: err.message });
  }
}

/**
 * Get a specific notification by ID
 * GET /api/messages/<notificationId>
 */
export async function getNotification(request, env, notificationId) {
  try {
    const userEmail = getUserEmail(request);
    if (!userEmail) {
      return error(401, { success: false, error: 'User not authenticated' });
    }

    const key = buildNotificationKey(userEmail, notificationId);
    const value = await env.MESSAGES.get(key, { type: 'text' });

    if (value === null) {
      return error(404, { success: false, error: 'Notification not found' });
    }

    const notification = safeJsonParse(value);
    if (!notification) {
      return error(500, { success: false, error: 'Failed to parse notification' });
    }

    return json({
      success: true,
      message: notification,
    });
  } catch (err) {
    console.error('Error getting notification:', err);
    return error(500, { success: false, error: err.message });
  }
}

/**
 * Create a new notification
 * POST /api/messages
 * Body: { id, subject, message, type, from, priority, expiresInXDays, status }
 */
export async function createNotification(request, env) {
  try {
    const userEmail = getUserEmail(request);
    if (!userEmail) {
      return error(401, { success: false, error: 'User not authenticated' });
    }

    const body = await request.json();
    const { id, subject, message, type, from, priority, expiresInXDays, status } = body;

    // Validate required fields
    if (!id || !subject || !message) {
      return error(400, { success: false, error: 'Missing required fields: id, subject, message' });
    }

    // Build notification object
    const notificationData = {
      id,
      owner: userEmail,
      date: new Date().toISOString(),
      subject,
      message,
      type: type || DEFAULT_NOTIFICATION_TYPE,
      from: from || DEFAULT_FROM_EMAIL,
      priority: priority || DEFAULT_PRIORITY,
      expiresInXDays: expiresInXDays !== undefined ? expiresInXDays : DEFAULT_EXPIRATION_DAYS,
      status: status || DEFAULT_STATUS,
    };

    const key = buildNotificationKey(userEmail, id);
    const value = JSON.stringify(notificationData);

    // Store in KV with metadata
    await env.MESSAGES.put(key, value, {
      metadata: {
        priority: notificationData.priority,
        status: notificationData.status,
        type: notificationData.type,
      },
    });

    return json({
      success: true,
      message: notificationData,
    });
  } catch (err) {
    console.error('Error creating notification:', err);
    return error(500, { success: false, error: err.message });
  }
}

/**
 * Update an existing notification
 * POST /api/messages/<notificationId>
 * Body: { status?, subject?, message?, priority?, ... }
 */
export async function updateNotification(request, env, notificationId) {
  try {
    const userEmail = getUserEmail(request);
    if (!userEmail) {
      return error(401, { success: false, error: 'User not authenticated' });
    }

    const key = buildNotificationKey(userEmail, notificationId);

    // Get existing notification
    const existingValue = await env.MESSAGES.get(key, { type: 'text' });
    if (existingValue === null) {
      return error(404, { success: false, error: 'Notification not found' });
    }

    const existingNotification = safeJsonParse(existingValue);
    if (!existingNotification) {
      return error(500, { success: false, error: 'Failed to parse existing notification' });
    }

    // Get updates from request body
    const updates = await request.json();

    // Merge updates with existing notification
    const updatedNotification = {
      ...existingNotification,
      ...updates,
      // Ensure these fields cannot be changed via update
      id: existingNotification.id,
      owner: existingNotification.owner,
      date: existingNotification.date,
    };

    const value = JSON.stringify(updatedNotification);

    // Update in KV with new metadata
    await env.MESSAGES.put(key, value, {
      metadata: {
        priority: updatedNotification.priority,
        status: updatedNotification.status,
        type: updatedNotification.type,
      },
    });

    return json({
      success: true,
      message: updatedNotification,
    });
  } catch (err) {
    console.error('Error updating notification:', err);
    return error(500, { success: false, error: err.message });
  }
}

/**
 * Delete a notification
 * DELETE /api/messages/<notificationId>
 */
export async function deleteNotification(request, env, notificationId) {
  try {
    const userEmail = getUserEmail(request);
    if (!userEmail) {
      return error(401, { success: false, error: 'User not authenticated' });
    }

    const key = buildNotificationKey(userEmail, notificationId);

    // Check if notification exists before deleting
    const existing = await env.MESSAGES.get(key);
    if (existing === null) {
      return error(404, { success: false, error: 'Notification not found' });
    }

    await env.MESSAGES.delete(key);

    return json({
      success: true,
      message: 'Notification deleted successfully',
      notificationId,
    });
  } catch (err) {
    console.error('Error deleting notification:', err);
    return error(500, { success: false, error: err.message });
  }
}

/**
 * Safely parse JSON string
 * @param {string} value - JSON string to parse
 * @param {string} context - Optional context for error logging (e.g., key name)
 * @returns {Object|null} Parsed object or null on error
 */
function safeJsonParse(value, context = '') {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (e) {
    console.error(`Failed to parse JSON${context ? ` for ${context}` : ''}:`, e);
    return null;
  }
}
