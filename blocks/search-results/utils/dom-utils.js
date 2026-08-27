/**
 * DOM utility helpers
 *
 * This file contains reusable  helper functions
 * for managing common DOM interactions and UI states.
 * These utilities are safe to use across modals, components,
 * and dynamically rendered content.
 */

/**
 * Toggles loading and disabled state for a button element.
 *
 * - Disables the button to prevent multiple submissions
 * - Adds or removes a loading class for visual feedback (spinner)
 *
 * @param {HTMLButtonElement} button - The button DOM element
 * @param {boolean} isLoading - Whether the button should be in loading state
 */
/**
 * Escape a string for safe insertion into HTML.
 * Prevents XSS when interpolating user/server data into template literals.
 * @param {string} str - The string to escape
 * @returns {string} HTML-safe string
 */
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export default function setButtonLoading(button, isLoading) {
  if (!button) return;

  button.disabled = isLoading;
  button.classList?.toggle('primary-is-loading', isLoading);
}
