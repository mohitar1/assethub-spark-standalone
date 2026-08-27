/**
 * Report Hub Block
 * Centralized hub for accessing system reports
 * Only accessible to users with admin-reports permission
 */

/**
 * Inline, monochrome SVG icons rendered with `fill="currentColor"` so they inherit
 * the brand colour from CSS (var(--primary-color)). Replaces the previous multicolour
 * emoji placeholders (🔐/🔍/🖼️) so the hub stays on-brand and consistent.
 */
const ICONS = {
  search: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M5 21V10h3v11H5Zm5.5 0V3h3v18h-3ZM16 21v-7h3v7h-3Z"/></svg>',
};

const REPORT_CATEGORIES = [
  {
    id: 'activity',
    title: 'Activity Reports',
    description: 'Report on user interactions and engagement',
    reports: [
      {
        id: 'searches',
        title: 'Search Analytics',
        description: 'Search activity report',
        url: '/en/reports/searches',
        icon: 'search',
        status: 'available',
      },
      {
        id: 'asset-activity',
        title: 'Asset Activity',
        description: 'Asset views, downloads, and usage audit',
        url: '/en/reports/asset-activity',
        icon: 'chart',
        status: 'available',
      },
    ],
  },
];

/**
 * Create a report card element
 * @param {Object} report - Report configuration
 * @returns {HTMLElement} - Report card element
 */
function createReportCard(report) {
  const card = document.createElement('a');
  card.className = `report-card ${report.status}`;
  card.href = report.status === 'available' ? report.url : '#';

  if (report.status === 'coming-soon') {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      // Optional: Add toast notification here
      // showToast('This report is coming soon', 'info');
    });
  }

  const contentDiv = document.createElement('div');
  contentDiv.className = 'report-card-content';

  const headerRow = document.createElement('div');
  headerRow.className = 'report-card-header';

  const iconDiv = document.createElement('div');
  iconDiv.className = 'report-card-icon';
  iconDiv.innerHTML = ICONS[report.icon] ?? ICONS.chart;

  const title = document.createElement('div');
  title.className = 'report-card-title';
  title.textContent = report.title;

  headerRow.appendChild(iconDiv);
  headerRow.appendChild(title);

  const description = document.createElement('p');
  description.className = 'report-card-description';
  description.textContent = report.description;

  contentDiv.appendChild(headerRow);
  contentDiv.appendChild(description);

  if (report.status === 'coming-soon') {
    const badge = document.createElement('span');
    badge.className = 'report-badge';
    badge.textContent = 'Coming Soon';
    contentDiv.appendChild(badge);
  }

  const arrowDiv = document.createElement('div');
  arrowDiv.className = 'report-card-arrow';
  arrowDiv.innerHTML = '<span class="icon icon-arrow-right"></span>';

  card.appendChild(contentDiv);
  card.appendChild(arrowDiv);

  return card;
}

/**
 * Create a report section with category title and report grid
 * @param {Object} category - Category configuration
 * @returns {HTMLElement} - Section element
 */
function createReportSection(category) {
  const section = document.createElement('div');
  section.className = 'reports-section';

  const header = document.createElement('div');
  header.className = 'reports-section-header';

  const title = document.createElement('h2');
  title.className = 'reports-section-title';
  title.textContent = category.title;

  const descriptionP = document.createElement('p');
  descriptionP.className = 'reports-section-description';
  descriptionP.textContent = category.description;

  header.appendChild(title);
  header.appendChild(descriptionP);
  section.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'reports-grid';

  category.reports.forEach((report) => {
    const card = createReportCard(report);
    grid.appendChild(card);
  });

  section.appendChild(grid);
  return section;
}

/**
 * Create access denied message
 * @returns {HTMLElement} - Access denied container
 */
function createAccessDenied() {
  const container = document.createElement('div');
  container.className = 'reports-hub-denied';

  container.innerHTML = `
    <div class="denied-icon">
      <span class="icon icon-lock"></span>
    </div>
    <h2>Access Denied</h2>
    <p>You do not have permission to access reports.</p>
    <p>Please contact your administrator if you need access to system reports.</p>
  `;

  return container;
}

/**
 * Main block decorator function
 * @param {HTMLElement} block - The block element
 */
export default function decorate(block) {
  // Clear any existing content
  block.innerHTML = '';

  // Check if user has admin role or admin-reports permission
  const hasReportAccess = window.user?.roles?.includes('admin')
    || window.user?.permissions?.includes('admin-reports');
  if (!hasReportAccess) {
    block.appendChild(createAccessDenied());
    return;
  }

  // Create main container
  const container = document.createElement('div');
  container.className = 'reports-hub-container';

  // Page header
  const header = document.createElement('div');
  header.className = 'reports-hub-header';

  const h1 = document.createElement('h1');
  h1.textContent = 'Reports';

  header.appendChild(h1);
  container.appendChild(header);

  // Render each category section
  REPORT_CATEGORIES.forEach((category) => {
    const section = createReportSection(category);
    container.appendChild(section);
  });

  block.appendChild(container);
}
