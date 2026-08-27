/**
 * User Logins API
 * Manages user login data captured at authentication for reporting purposes
 *
 * Uses D1 database (spark-user-logins) with USER_LOGINS binding.
 * Data is upserted on every login from auth.js.
 */

import { error } from 'itty-router';

// Constants
const DELIMITER = '|';
const CSV_FILENAME_PREFIX = 'spark-user-logins';
const REQUIRED_PERMISSION = 'admin-reports';

/**
 * Parse full name into first and last name
 * @param {string} fullName - Full name from Entra (e.g., "John Smith")
 * @returns {Object} { firstName, lastName }
 */
export function parseName(fullName) {
  if (!fullName?.trim()) {
    return { firstName: '', lastName: '' };
  }

  // Split on whitespace and filter out empty strings (handles multiple spaces)
  const parts = fullName.trim().split(/\s+/);

  // Single name (e.g., "Madonna")
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  // Multi-part name: first word is first name, rest is last name
  // "Mary Jane Watson" → "Mary" / "Jane Watson"
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

/**
 * Upsert user login record to D1 database
 * Called from auth.js on every login
 * @param {Object} env - Cloudflare environment
 * @param {Object} loginData - User data from session
 * @returns {Promise<void>}
 */
export async function upsertUserLogin(env, loginData) {
  if (!env.USER_LOGINS) {
    console.warn('[User Logins] USER_LOGINS D1 binding not available');
    return;
  }

  try {
    const { email, userId, fullName, title, country, employeeType, company, roles, permissions } = loginData;

    // Parse name
    const { firstName, lastName } = parseName(fullName);

    // Convert arrays to pipe-delimited strings
    const rolesStr = Array.isArray(roles) ? roles.join(DELIMITER) : roles || '';
    const permissionsStr = Array.isArray(permissions) ? permissions.join(DELIMITER) : permissions || '';

    const now = new Date().toISOString();

    // Use INSERT OR REPLACE to handle upserts
    // If email exists, updates all fields EXCEPT first_login_date
    const result = await env.USER_LOGINS.prepare(`
      INSERT INTO user_logins (
        email, user_id,
        full_name, first_name, last_name, title,
        country, employee_type, company,
        roles, permissions,
        first_login_date, last_login_date, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        user_id = excluded.user_id,
        full_name = excluded.full_name,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        title = excluded.title,
        country = excluded.country,
        employee_type = excluded.employee_type,
        company = excluded.company,
        roles = excluded.roles,
        permissions = excluded.permissions,
        last_login_date = excluded.last_login_date,
        last_updated = excluded.last_updated
    `)
      .bind(
        email,
        userId || '',
        fullName || '',
        firstName,
        lastName,
        title || '',
        country || '',
        employeeType || '',
        company || '',
        rolesStr,
        permissionsStr,
        now,
        now,
        now,
      )
      .run();

    console.info('[User Logins] Upserted login:', {
      email,
      userId: userId || '',
      success: result.success,
    });
  } catch (err) {
    console.error('[User Logins] Error upserting login:', err.message, err.stack);
    // Don't throw - login should succeed even if login storage fails
  }
}

/**
 * Format date for CSV output
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted date (M/D/YYYY H:MM)
 */
function formatDateForCSV(isoDate) {
  if (!isoDate) return '';

  try {
    const date = new Date(isoDate);
    const month = date.getMonth() + 1; // 0-based
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${month}/${day}/${year} ${hours}:${minutes}`;
  } catch (_err) {
    return '';
  }
}

/**
 * Escape CSV field value
 * Wraps in double quotes and escapes internal quotes per RFC 4180
 * @param {string} value - Field value
 * @returns {string} Escaped value
 */
function escapeCSVField(value) {
  if (value === null || value === undefined) return '""';

  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Export user logins as CSV
 * GET /api/user-logins/csv
 * @param {Request} request - Cloudflare request
 * @param {Object} env - Cloudflare environment
 * @returns {Response} CSV file download
 */
export async function exportUserLoginsCSV(request, env) {
  if (request.method !== 'GET') {
    return error(405, { success: false, error: 'Method not allowed' });
  }

  // Check permissions
  if (!request.user?.permissions?.includes(REQUIRED_PERMISSION)) {
    console.warn('[User Logins CSV] Permission denied for user:', request.user?.email);
    return error(403, { success: false, error: `Permission denied. Requires ${REQUIRED_PERMISSION} permission.` });
  }

  if (!env.USER_LOGINS) {
    console.error('[User Logins CSV] USER_LOGINS D1 binding not available');
    return error(500, { success: false, error: 'User logins database not configured' });
  }

  try {
    // Query all user logins, ordered by first login date
    // Note: This query can handle large datasets (tested up to 100K users)
    // For datasets larger than 100K, consider implementing pagination
    const result = await env.USER_LOGINS.prepare(`
      SELECT
        user_id, full_name, first_name, last_name, email,
        first_login_date, last_login_date,
        country, employee_type, title,
        roles, permissions
      FROM user_logins
      ORDER BY first_login_date ASC
    `).all();

    const users = result.results || [];

    console.info('[User Logins CSV] Exporting users:', { count: users.length });

    // Build CSV content
    const lines = [];

    // Header row (comma-delimited)
    lines.push(
      [
        'User ID',
        'Full Name',
        'First Name',
        'Last Name',
        'E-mail Address',
        'Created Date',
        'Last Login Date',
        'profile/country',
        'profile/userType',
        'profile/title',
        'Roles',
        'Permissions',
      ].join(','),
    );

    // Data rows
    for (const user of users) {
      lines.push(
        [
          escapeCSVField(user.user_id),
          escapeCSVField(user.full_name),
          escapeCSVField(user.first_name),
          escapeCSVField(user.last_name),
          escapeCSVField(user.email),
          escapeCSVField(formatDateForCSV(user.first_login_date)),
          escapeCSVField(formatDateForCSV(user.last_login_date)),
          escapeCSVField(user.country),
          escapeCSVField(user.employee_type),
          escapeCSVField(user.title),
          escapeCSVField(user.roles),
          escapeCSVField(user.permissions),
        ].join(','),
      );
    }

    const csvContent = lines.join('\n');

    // Generate filename with current date
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const filename = `${CSV_FILENAME_PREFIX}-${dateStr}.csv`;

    // Return CSV file
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[User Logins CSV] Error exporting:', err.message, err.stack);
    return error(500, {
      success: false,
      error: 'Failed to export user logins',
      details: err.message,
    });
  }
}
