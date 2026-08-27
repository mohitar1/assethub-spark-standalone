/**
 * UI Components for My Messages
 * Reusable components for message list, rows, and display elements
 */

import { formatMessageDate, getSystemNotificationsRead, SYSTEM_MESSAGE_OWNER } from '../../scripts/notifications/notifications-helpers.js';
import showToast from '../../scripts/toast/toast.js';

// Export showToast for backwards compatibility
export { showToast };

// UI Constants
const EMPTY_VALUE_PLACEHOLDER = '—';

/**
 * Create table header for messages list
 * @param {Function} t - Translation function
 * @returns {HTMLElement} Table header element
 */
function createMessagesTableHeader(t) {
  const header = document.createElement('div');
  header.className = 'notifications-table-header';

  const columns = [
    { label: '', className: 'header-status' }, // Status indicator
    { label: '', className: 'header-priority' }, // Priority indicator
    { label: t('date', 'DATE').toUpperCase(), className: 'header-date' },
    { label: t('subject', 'SUBJECT').toUpperCase(), className: 'header-subject' },
    { label: t('type', 'TYPE').toUpperCase(), className: 'header-type' },
    { label: t('from', 'FROM').toUpperCase(), className: 'header-from' },
    { label: t('action', 'ACTION').toUpperCase(), className: 'header-action' },
  ];

  columns.forEach((col) => {
    const headerCell = document.createElement('div');
    headerCell.className = `header-cell ${col.className}`;
    headerCell.innerHTML = col.label;
    header.appendChild(headerCell);
  });

  return header;
}

/**
 * Create the messages list container
 * @param {Array} messages - Array of message objects
 * @param {Object} handlers - Event handlers { onView, onDelete, onMarkRead }
 * @param {Function} t - Translation function
 * @returns {HTMLElement} Messages list element
 */
export function createMessagesList(messages, handlers, t) {
  const container = document.createElement('div');
  container.className = 'notifications-list-container';

  if (!messages || messages.length === 0) {
    const emptyState = createEmptyState(t);
    container.appendChild(emptyState);
    return container;
  }

  // Add table header
  container.appendChild(createMessagesTableHeader(t));

  // Create messages list
  const listContainer = document.createElement('div');
  listContainer.className = 'notifications-list';

  // Create message rows
  messages.forEach((message) => {
    const messageRow = createMessageRow(message, handlers, t);
    listContainer.appendChild(messageRow);
  });

  container.appendChild(listContainer);

  return container;
}

/**
 * Create empty state message
 * @param {Function} t - Translation function
 * @returns {HTMLElement} Empty state element
 */
function createEmptyState(t) {
  const emptyState = document.createElement('div');
  emptyState.className = 'notifications-empty-state';

  const icon = document.createElement('div');
  icon.className = 'empty-state-icon';

  const title = document.createElement('h3');
  title.textContent = t('noNotifications', 'No Notifications');

  const text = document.createElement('p');
  text.textContent = t('noNotificationsMessage', "You don't have any notifications at this time.");

  emptyState.appendChild(icon);
  emptyState.appendChild(title);
  emptyState.appendChild(text);

  return emptyState;
}

/**
 * Convert plain text URLs to clickable links
 * @param {string} text - Plain text with URLs
 * @returns {string} HTML string with clickable links
 */
function linkifyText(text) {
  if (!text) return '';

  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Replace URLs with anchor tags
  return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

/**
 * Create a message row
 * @param {Object} message - Message object
 * @param {Object} handlers - Event handlers
 * @param {Function} t - Translation function
 * @returns {HTMLElement} Message row element
 */
function createMessageRow(message, handlers, t) {
  const row = document.createElement('div');
  row.className = 'notification-row';
  row.setAttribute('data-notification-id', message.id);

  // Determine if message is unread
  // For system messages, check localStorage; for user messages, check status
  let isUnread = false;
  if (message.owner === SYSTEM_MESSAGE_OWNER) {
    const systemReadIds = getSystemNotificationsRead();
    isUnread = !systemReadIds.includes(message.id);
  } else {
    isUnread = message.status === 'unread';
  }

  // Add unread class if message is unread
  if (isUnread) {
    row.classList.add('notification-row-unread');
  }

  // Create message header (always visible)
  const header = document.createElement('div');
  header.className = 'notification-header';

  // Status indicator
  const statusIndicator = document.createElement('div');
  statusIndicator.className = 'notification-status-indicator';
  if (isUnread) {
    statusIndicator.innerHTML = '<span class="unread-dot"></span>';
  }

  // Priority indicator (!)
  const priorityIndicator = document.createElement('div');
  priorityIndicator.className = 'notification-priority-indicator';
  if (message.priority === 'important') {
    priorityIndicator.innerHTML = '<span class="priority-exclamation">!</span>';
  }

  // Date
  const date = document.createElement('div');
  date.className = 'notification-date';
  date.textContent = formatMessageDate(message.date);

  // Subject (second column)
  const subject = document.createElement('div');
  subject.className = 'notification-subject';
  subject.textContent = message.subject || t('noSubject', '(No subject)');

  // Type (third column)
  const type = document.createElement('div');
  type.className = 'notification-type';
  const typeBadge = document.createElement('span');
  const messageType = message.type || 'notification';
  typeBadge.className = `notification-type-badge notification-type-${messageType.toLowerCase()}`;
  typeBadge.textContent = messageType;
  type.appendChild(typeBadge);

  // From (fourth column)
  const from = document.createElement('div');
  from.className = 'notification-from';
  from.textContent = message.from || EMPTY_VALUE_PLACEHOLDER;

  // Actions container (last column)
  const actions = document.createElement('div');
  actions.className = 'notification-actions';

  // Expand button (styled via CSS with ::before pseudo-element)
  const expandBtn = document.createElement('button');
  expandBtn.className = 'notification-expand-btn';
  expandBtn.setAttribute('aria-label', t('expandMessage', 'Expand message'));
  expandBtn.onclick = (e) => {
    e.stopPropagation();
    toggleMessageExpansion(row, t);
  };

  actions.appendChild(expandBtn);

  // Delete button (shown for all messages)
  const wrapper = document.createElement('span');
  wrapper.className = 'notification-delete-wrapper';
  wrapper.setAttribute('data-tooltip', t('deleteMessage', 'Delete message'));
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'notification-delete-btn';
  deleteBtn.setAttribute('aria-label', t('deleteMessage', 'Delete message'));
  wrapper.appendChild(deleteBtn);
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    if (handlers.onDelete) {
      handlers.onDelete(message);
    }
  };
  actions.appendChild(wrapper);

  // Assemble header as grid cells: status, priority, date, subject, type, from, actions
  header.appendChild(statusIndicator);
  header.appendChild(priorityIndicator);
  header.appendChild(date);
  header.appendChild(subject);
  header.appendChild(type);
  header.appendChild(from);
  header.appendChild(actions);

  // Create message body (expandable)
  const body = document.createElement('div');
  body.className = 'notification-body';
  body.style.display = 'none';

  const messageContent = document.createElement('div');
  messageContent.className = 'notification-content';

  // Convert plain text with URLs to HTML with clickable links
  const linkedText = linkifyText(message.message);
  // Preserve line breaks and convert to <br> tags
  const htmlContent = linkedText.replace(/\n/g, '<br>');
  messageContent.innerHTML = htmlContent;

  body.appendChild(messageContent);

  // Assemble row
  row.appendChild(header);
  row.appendChild(body);

  // Click on header to expand/collapse
  header.addEventListener('click', () => {
    toggleMessageExpansion(row, t);
    // Mark as read when expanded
    if (row.classList.contains('notification-expanded') && message.status === 'unread') {
      if (handlers.onMarkRead) {
        handlers.onMarkRead(message);
      }
    }
  });

  return row;
}

/**
 * Toggle message expansion
 * @param {HTMLElement} row - Message row element
 * @param {Function} t - Translation function
 */
function toggleMessageExpansion(row, t) {
  const body = row.querySelector('.notification-body');
  const expandBtn = row.querySelector('.notification-expand-btn');
  const isExpanded = row.classList.contains('notification-expanded');

  if (isExpanded) {
    // Collapse
    row.classList.remove('notification-expanded');
    body.style.display = 'none';
    expandBtn.classList.remove('expanded');
    expandBtn.setAttribute('aria-label', t('expandMessage', 'Expand message'));
  } else {
    // Expand
    row.classList.add('notification-expanded');
    body.style.display = 'block';
    expandBtn.classList.add('expanded');
    expandBtn.setAttribute('aria-label', t('collapseMessage', 'Collapse message'));
  }
}

/**
 * Create filter controls
 * @param {Object|Function} currentFiltersOrGetter - Current filter state or getter that returns it
 * @param {Function} onFilterChange - Filter change callback
 * @param {Function} t - Translation function
 * @returns {HTMLElement} Filter controls element
 */
export function createFilterControls(currentFiltersOrGetter, onFilterChange, t) {
  const getCurrentFilters = typeof currentFiltersOrGetter === 'function'
    ? currentFiltersOrGetter
    : () => currentFiltersOrGetter;

  const filterContainer = document.createElement('div');
  filterContainer.className = 'notification-filters';

  // Status filter
  const statusFilter = document.createElement('div');
  statusFilter.className = 'filter-group';

  const statusLabel = document.createElement('label');
  statusLabel.textContent = t('statusLabel', 'Status:');
  statusLabel.className = 'filter-label';

  const statusSelect = document.createElement('select');
  statusSelect.className = 'filter-select';
  statusSelect.innerHTML = `
    <option value="all">${t('allNotifications', 'All Notifications')}</option>
    <option value="unread">${t('unread', 'Unread')}</option>
    <option value="read">${t('read', 'Read')}</option>
  `;
  statusSelect.value = getCurrentFilters().status || 'all';
  statusSelect.onchange = () => {
    if (onFilterChange) {
      onFilterChange({ ...getCurrentFilters(), status: statusSelect.value });
    }
  };

  statusFilter.appendChild(statusLabel);
  statusFilter.appendChild(statusSelect);

  // Type filter
  const typeFilter = document.createElement('div');
  typeFilter.className = 'filter-group';

  const typeLabel = document.createElement('label');
  typeLabel.textContent = t('typeLabel', 'Type:');
  typeLabel.className = 'filter-label';

  const typeSelect = document.createElement('select');
  typeSelect.className = 'filter-select';
  typeSelect.innerHTML = `
    <option value="all">${t('allTypes', 'All Types')}</option>
    <option value="Announcement">${t('announcements', 'Announcements')}</option>
    <option value="Alert">${t('alerts', 'Alerts')}</option>
    <option value="Notification">${t('notificationsOption', 'Notifications')}</option>
  `;
  typeSelect.value = getCurrentFilters().type || 'all';
  typeSelect.onchange = () => {
    if (onFilterChange) {
      onFilterChange({ ...getCurrentFilters(), type: typeSelect.value });
    }
  };

  typeFilter.appendChild(typeLabel);
  typeFilter.appendChild(typeSelect);

  // Priority filter
  const priorityFilter = document.createElement('div');
  priorityFilter.className = 'filter-group';

  const priorityLabel = document.createElement('label');
  priorityLabel.textContent = t('priorityLabel', 'Priority:');
  priorityLabel.className = 'filter-label';

  const prioritySelect = document.createElement('select');
  prioritySelect.className = 'filter-select';
  prioritySelect.innerHTML = `
    <option value="all">${t('allPriorities', 'All Priorities')}</option>
    <option value="important">${t('important', 'Important')}</option>
    <option value="normal">${t('normal', 'Normal')}</option>
  `;
  prioritySelect.value = getCurrentFilters().priority || 'all';
  prioritySelect.onchange = () => {
    if (onFilterChange) {
      onFilterChange({ ...getCurrentFilters(), priority: prioritySelect.value });
    }
  };

  priorityFilter.appendChild(priorityLabel);
  priorityFilter.appendChild(prioritySelect);

  filterContainer.appendChild(statusFilter);
  filterContainer.appendChild(typeFilter);
  filterContainer.appendChild(priorityFilter);

  return filterContainer;
}

/**
 * Create message count display
 * @param {number} total - Total message count
 * @param {number} unread - Unread message count
 * @param {number} filtered - Filtered message count
 * @param {Function} t - Translation function
 * @returns {HTMLElement} Count display element
 */
export function createMessageCount(total, unread, filtered, t) {
  const countContainer = document.createElement('div');
  countContainer.className = 'notification-count';

  const totalSpan = document.createElement('span');
  totalSpan.className = 'count-total';
  totalSpan.textContent = t('xOfYNotifications', '{0} of {1} notifications')
    .replace('{0}', filtered)
    .replace('{1}', total);

  const unreadSpan = document.createElement('span');
  unreadSpan.className = 'count-unread';
  if (unread > 0) {
    unreadSpan.textContent = t('xUnread', '{0} unread').replace('{0}', unread);
  }

  countContainer.appendChild(totalSpan);
  if (unread > 0) {
    countContainer.appendChild(unreadSpan);
  }

  return countContainer;
}
