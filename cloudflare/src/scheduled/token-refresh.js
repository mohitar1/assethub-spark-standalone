/**
 * Scheduled Token Refresh Handler
 *
 * Placeholder cron handler — email OAuth removed.
 * If SMTP OAuth token refresh is needed in future, re-implement here.
 */

/**
 * Handle scheduled token refresh
 * Called by the Cloudflare Cron Trigger
 *
 * @param {Object} _env - Cloudflare environment bindings
 * @param {ExecutionContext} _ctx - Execution context for waitUntil
 */
// eslint-disable-next-line no-unused-vars
export async function handleScheduledTokenRefresh(_env, _ctx) {
  console.log('[Scheduled] Token refresh tick — no-op (email OAuth not configured)');
}
