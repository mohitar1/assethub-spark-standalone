// add delayed functionality here

// Import and initialize priority messages check
import { initPriorityMessages } from './notifications/priority-modal.js';

// Initialize priority message check on page load
initPriorityMessages();

// Note: Cart background jobs are automatically initialized in cart-service.js (singleton pattern)
// No need to initialize here to avoid circular dependency
