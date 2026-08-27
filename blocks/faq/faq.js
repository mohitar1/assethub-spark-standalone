// eslint-disable-next-line import/no-unresolved
import { toClassName } from '../../scripts/aem.js';
import { loadFragment } from '../../scripts/scripts.js';
import { getAppLabel } from '../../scripts/locale-utils.js';

export async function decorateFragments(panel) {
  const links = panel.querySelectorAll('a');
  await Promise.all([...links].map(async (link) => {
    const up = link.parentElement;
    if (up.textContent && up.textContent.includes('((fragment))')) {
      const path = link ? link.getAttribute('href') : panel.textContent.trim();
      const fragment = await loadFragment(path);
      if (fragment) {
        const fragmentSection = fragment.querySelector(':scope .section');
        if (fragmentSection) {
          up.parentElement.append(...fragment.childNodes);
          up.remove();
        }
      }
    }
  }));
}

function decorateAccordion(accordionItems, accordionContainer) {
  accordionItems.forEach((row) => {
    // decorate accordion item label
    const label = row.children[0];
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);
    // decorate accordion item body
    const body = row.children[1];
    body.className = 'accordion-item-body';
    // decorate accordion item
    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary, body);

    // Add click handler to close other accordion items and update expand all toggle
    summary.addEventListener('click', () => {
      const isCurrentlyOpen = details.hasAttribute('open');
      if (!isCurrentlyOpen) {
        // Close all other accordion items in this container
        accordionContainer.querySelectorAll('details[open]')
          .forEach((openDetails) => {
            if (openDetails !== details) {
              openDetails.removeAttribute('open');
            }
          });
      }

      // Update expand all toggle state after accordion change
      setTimeout(() => {
        const expandAllToggle = accordionContainer.parentElement.querySelector('.toggle-switch-btn');
        const allDetails = accordionContainer.querySelectorAll('details');
        const openDetails = accordionContainer.querySelectorAll('details[open]');

        if (expandAllToggle) {
          if (openDetails.length === allDetails.length && allDetails.length > 0) {
            expandAllToggle.setAttribute('aria-checked', 'true');
          } else {
            expandAllToggle.setAttribute('aria-checked', 'false');
          }
        }
      }, 0);
    });
    row.replaceWith(details);
  });
}

export default async function decorate(block) {
  // Initialize translations
  const t = await getAppLabel();

  // Parse the structure to identify tabs and their accordion items
  const children = [...block.children];
  const tabs = [];
  let currentTab = null;

  children.forEach((child) => {
    const firstCell = child.firstElementChild;
    const secondCell = child.children[1];

    // If there's only one cell, it's a tab header
    if (!secondCell || secondCell.textContent.trim() === '') {
      if (currentTab) {
        tabs.push(currentTab);
      }
      currentTab = {
        title: firstCell,
        items: [],
      };
    } else if (currentTab) {
      // If there are two cells, it's an accordion item
      currentTab.items.push(child);
    }
  });

  // Add the last tab
  if (currentTab) {
    tabs.push(currentTab);
  }

  // Clear the block
  block.innerHTML = '';

  // Build tablist
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  // Create tabs and tabpanels
  const tabPanels = [];

  tabs.forEach((tab, i) => {
    const id = toClassName(tab.title.textContent);

    // Create tabpanel
    const tabpanel = document.createElement('div');
    tabpanel.className = 'tabs-panel';
    tabpanel.id = `tabpanel-${id}`;
    tabpanel.setAttribute('aria-hidden', !!i);
    tabpanel.setAttribute('aria-labelledby', `tab-${id}`);
    tabpanel.setAttribute('role', 'tabpanel');

    // Create accordion container within the tabpanel
    const accordionContainer = document.createElement('div');
    accordionContainer.className = 'accordion';

    // Add accordion items to the container
    tab.items.forEach((item) => {
      accordionContainer.appendChild(item);
    });

    // Decorate accordion items
    decorateAccordion([...accordionContainer.children], accordionContainer);

    // Create Expand All toggle
    const expandAllContainer = document.createElement('div');
    expandAllContainer.className = 'expand-all-container';

    const expandAllLabel = document.createElement('span');
    expandAllLabel.textContent = t('expandAll', 'Expand All');
    expandAllLabel.className = 'expand-all-label';

    const expandAllToggle = document.createElement('div');
    expandAllToggle.className = 'toggle-switch-btn';
    expandAllToggle.setAttribute('role', 'switch');
    expandAllToggle.setAttribute('aria-checked', 'false');
    expandAllToggle.setAttribute('tabindex', '0');

    const toggleSlider = document.createElement('div');
    toggleSlider.className = 'toggle-switch-btn-thumb';
    expandAllToggle.appendChild(toggleSlider);

    expandAllContainer.appendChild(expandAllLabel);
    expandAllContainer.appendChild(expandAllToggle);

    // Add click handler for Expand All toggle
    const handleExpandAll = () => {
      const isExpanded = expandAllToggle.getAttribute('aria-checked') === 'true';
      const accordionDetails = accordionContainer.querySelectorAll('details');

      if (isExpanded) {
        // Collapse all
        accordionDetails.forEach((details) => {
          details.removeAttribute('open');
        });
        expandAllToggle.setAttribute('aria-checked', 'false');
        expandAllLabel.textContent = t('expandAll', 'Expand All');
      } else {
        // Expand all
        accordionDetails.forEach((details) => {
          details.setAttribute('open', '');
        });
        expandAllToggle.setAttribute('aria-checked', 'true');
        expandAllLabel.textContent = t('expandAll', 'Expand All');
      }
    };

    expandAllToggle.addEventListener('click', handleExpandAll);
    expandAllToggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleExpandAll();
      }
    });

    tabpanel.appendChild(expandAllContainer);
    tabpanel.appendChild(accordionContainer);
    tabPanels.push(tabpanel);

    // Build tab button
    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.innerHTML = tab.title.innerHTML;
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');
    button.addEventListener('click', () => {
      block.querySelectorAll('[role=tabpanel]')
        .forEach((panel) => {
          panel.setAttribute('aria-hidden', true);
        });
      tablist.querySelectorAll('button')
        .forEach((btn) => {
          btn.setAttribute('aria-selected', false);
        });
      tabpanel.setAttribute('aria-hidden', false);
      button.setAttribute('aria-selected', true);
    });

    tablist.append(button);
    block.append(tabpanel);
  });

  // Handle fragments for all panels
  await Promise.all(tabPanels.map((panel) => decorateFragments(panel)));

  block.prepend(tablist);
}
