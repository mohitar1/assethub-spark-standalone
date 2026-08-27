/**
 * Toast notification component
 * Displays temporary notification messages to users
 */

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast ('success', 'error', 'info')
 * @param {Object} options - Optional configuration
 * @param {number} options.timeout - Duration in milliseconds (default: 3000)
 */
export default function showToast(message, type = 'success', options = {}) {
  const timeout = options.timeout || 3000;

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  // Add to document
  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Remove after timeout
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, timeout);
}

/**
 * ToastQueue API - Compatible with React Spectrum ToastQueue
 * Provides positive(), negative(), info(), and neutral() methods
 */
export const ToastQueue = {
  positive: (message, options) => showToast(message, 'success', options),
  negative: (message, options) => showToast(message, 'error', options),
  info: (message, options) => showToast(message, 'info', options),
  neutral: (message, options) => showToast(message, 'info', options),
};

// Make ToastQueue available globally for compatibility
if (typeof window !== 'undefined') {
  window.ToastQueue = ToastQueue;
}
