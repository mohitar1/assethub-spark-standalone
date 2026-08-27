// vitest.dom.setup.js - Setup file specifically for DOM tests
/* eslint-env node */
/* global globalThis */

// Use global instead of globalThis for better compatibility
const globalObj = typeof globalThis !== 'undefined' ? globalThis : global;

globalObj.window = globalObj.window || {
  hlx: {},
  location: { hostname: 'localhost', pathname: '/' },
  navigator: { userAgent: 'test' },
  addEventListener: () => {},
};

const mockElement = {
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {},
  appendChild: () => {},
  removeChild: () => {},
  classList: { add: () => {}, remove: () => {}, contains: () => false },
};

globalObj.document = globalObj.document || {
  ...mockElement,
  createElement: () => mockElement,
  head: mockElement,
  body: mockElement,
  documentElement: mockElement,
};

// Suppress unhandled promise rejections from AEM script initialization
if (typeof process !== 'undefined' && process.on) {
  process.on('unhandledRejection', (reason) => {
    // Suppress only errors from AEM scripts during module loading
    const errorMessage = String(reason);
    if (errorMessage.includes('querySelectorAll') || errorMessage.includes('loadSections')) {
      // Silently ignore AEM script initialization errors
      return;
    }
    // Re-throw other unhandled rejections
    throw reason;
  });
}
