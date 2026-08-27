/**
 * Analytics Helper Module
 * Provides utilities for tracking analytics events from server-side code
 */

/**
 * Send analytics event to Analytics Engine (downloads/logins) or D1 (searches).
 * @param {Object} env - Cloudflare env
 * @param {string} eventType - 'login', 'search', or 'download'
 * @param {Object} eventData - Event data
 * @returns {Promise<void>}
 */
export async function trackAnalyticsEvent(env, eventType, eventData) {
  try {
    if (eventType === 'search') {
      if (!env.SEARCH_EVENTS) {
        console.warn('[Analytics] SEARCH_EVENTS D1 not available');
        return;
      }
      const { writeSearchEvent } = await import('../api/analytics.js');
      await writeSearchEvent(env.SEARCH_EVENTS, eventData);
      return;
    }

    if (!env.SPARK_ANALYTICS_ENGINE) {
      console.warn('[Analytics] Analytics Engine not available');
      return;
    }
    const { writeAnalyticsEvent } = await import('../api/analytics.js');
    await writeAnalyticsEvent(env.SPARK_ANALYTICS_ENGINE, eventType, eventData, env);
  } catch (err) {
    console.error(`[Analytics] Failed to track ${eventType} event:`, err);
  }
}
