// eslint-disable-next-line import/no-unresolved
import {
  toClassName,
  buildBlock,
  decorateBlock,
  loadBlock,
} from '../../scripts/aem.js';
import { loadFragment } from '../../scripts/scripts.js';

/**
 * Resolve ((fragment)) references inside a tab panel.
 * Each matching link is replaced with the loaded fragment content.
 * @param {HTMLElement} panel - Tab panel element
 */
export async function decorateFragments(panel) {
  const links = panel.querySelectorAll('a');
  await Promise.all([...links].map(async (link) => {
    const up = link.parentElement;
    if (up.textContent && up.textContent.includes('((fragment))')) {
      const path = link.getAttribute('href');
      if (!path) return;
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

/**
 * Supported inline block markers and how they map to AEM blocks.
 * Each entry describes a marker string (e.g. "((pdfviewer))") and how to
 * build the corresponding block(s) from the collected URLs.
 *
 * - pdfviewer: all URLs are grouped into ONE block with multiple rows [title, url].
 * - video:     each URL becomes its OWN block (one video per block), because the
 *              Video block expects a single <a> per instance.
 */
const INLINE_BLOCK_TYPES = ['pdfviewer', 'video', 'button-list'];

/**
 * Parse a DOM element for one or more occurrences of the given marker.
 * Returns an array of { url, title } objects found in the element.
 *
 * Handles both hyperlinked URLs (<a> tags) and plain text URLs, as well as
 * multiple markers in a single element (e.g. two entries joined by <br>).
 *
 * @param {HTMLElement} el    - The DOM element to parse
 * @param {string}      marker - The marker string, e.g. "((pdfviewer))"
 * @returns {Array<{url: string, title: string}>} Extracted items
 */
function parseMarkerItems(el, marker) {
  // Clone the element and replace <br> elements with newline text nodes
  // so that textContent includes "\n" at line boundaries. We can't use
  // innerText because it's layout-dependent and returns empty or wrong
  // results for elements that haven't been rendered yet.
  const clone = el.cloneNode(true);
  clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  const text = clone.textContent;
  const results = [];

  // Check for hyperlinked URLs first (<a> tags).
  const links = [...el.querySelectorAll('a')];
  if (links.length > 0) {
    // Match each <a> to its corresponding marker occurrence.
    // Walk through marker occurrences in order; for each one, find the
    // nearest <a> that follows it in the text.
    let searchFrom = 0;
    let linkIdx = 0;
    let prevMarkerEnd = 0;

    // Count marker occurrences so we can warn on mismatch
    let markerCount = 0;
    let countFrom = 0;
    while (countFrom < text.length) {
      const idx = text.indexOf(marker, countFrom);
      if (idx === -1) break;
      markerCount += 1;
      countFrom = idx + marker.length;
    }

    if (markerCount !== links.length) {
      // eslint-disable-next-line no-console
      console.warn(
        `[tabs] Found ${markerCount} "${marker}" marker(s) but ${links.length} link(s) — entries may be skipped.`,
      );
    }

    while (searchFrom < text.length && linkIdx < links.length) {
      const markerIdx = text.indexOf(marker, searchFrom);
      if (markerIdx === -1) break;

      const url = links[linkIdx].getAttribute('href');
      if (url) {
        const titleText = text.substring(prevMarkerEnd, markerIdx).replace(/[:\s]+$/, '').trim();
        results.push({ url, title: titleText });
      }

      prevMarkerEnd = markerIdx + marker.length;
      searchFrom = prevMarkerEnd;
      linkIdx += 1;
    }
  } else {
    // Plain text URLs — split on the marker to handle multiple entries
    // in a single element (e.g. two lines joined by <br>).
    const segments = text.split(marker);
    // segments[0] = text before first marker (possible title)
    // segments[1..n] = text after each marker (": url ...")
    // Each segment may contain ": url\nNextTitle\n" when multiple entries
    // share one <p> via <br> separators, so we take only the first line
    // as the URL.
    let pendingTitle = segments[0].replace(/[:\s]+$/, '').trim();

    for (let i = 1; i < segments.length; i += 1) {
      // Split on newline — first line is the URL, remaining lines form
      // the title for the next entry.
      const lines = segments[i].split(/\n/);
      const url = lines[0].replace(/^[:\s]+/, '').trim();
      if (url) {
        results.push({ url, title: pendingTitle });
      }
      // Remaining lines after the URL are the title for the next entry.
      pendingTitle = lines.slice(1).join(' ').replace(/[:\s]+$/, '').trim();
    }
  }

  return results;
}

/**
 * Resolve inline block references inside a tab panel.
 * Scans for list items or paragraphs containing markers like ((pdfviewer))
 * or ((video)) followed by a URL, builds the corresponding block(s),
 * and decorates them.
 *
 * Authoring patterns (same for all block types):
 *   - Plain text URL:    ((blockname)): /api/.../file
 *   - Hyperlinked URL:   ((blockname)): <a href="url">url</a>
 *   - Multiple per cell: two or more markers in a single <p> (separated by <br>)
 *   - Optional title:    My Title ((blockname)): url  (pdfviewer only)
 *
 * @param {HTMLElement} panel - Tab panel element
 */
async function decorateInlineBlocks(panel) {
  // Collect items per block type: { pdfviewer: [...], video: [...] }
  const itemsByType = {};
  const itemsToRemove = new Set();

  INLINE_BLOCK_TYPES.forEach((blockName) => {
    const marker = `((${blockName}))`;
    itemsByType[blockName] = [];

    panel.querySelectorAll('li, p').forEach((el) => {
      if (!el.textContent.includes(marker)) return;
      const parsed = parseMarkerItems(el, marker);
      if (parsed.length > 0) {
        itemsByType[blockName].push(...parsed);
        itemsToRemove.add(el);
      }
    });
  });

  const totalItems = Object.values(itemsByType).reduce((sum, arr) => sum + arr.length, 0);
  if (totalItems === 0) return;

  // Remove the original marker elements from the DOM.
  // If they were list items, also clean up empty parent <ul>/<ol>.
  itemsToRemove.forEach((el) => {
    const parent = el.parentElement;
    el.remove();
    if (parent && (parent.tagName === 'UL' || parent.tagName === 'OL') && parent.children.length === 0) {
      parent.remove();
    }
  });

  const blockPromises = [];

  // PDFViewer: all URLs go into ONE block with multiple rows [title, url]
  if (itemsByType.pdfviewer.length > 0) {
    const rows = itemsByType.pdfviewer.map(({ title, url }) => [title, url]);
    const pdfBlock = buildBlock('pdfviewer', rows);
    const wrapper = document.createElement('div');
    wrapper.classList.add('pdfviewer-wrapper');
    wrapper.appendChild(pdfBlock);
    panel.appendChild(wrapper);
    decorateBlock(pdfBlock);
    blockPromises.push(loadBlock(pdfBlock));
  }

  // Button-list: all URLs go into ONE block with multiple rows [url]
  if (itemsByType['button-list'].length > 0) {
    const rows = itemsByType['button-list'].map(({ title, url }) => {
      const a = document.createElement('a');
      a.href = url;
      a.textContent = title || url;
      return [a];
    });
    const blBlock = buildBlock('button-list', rows);
    const wrapper = document.createElement('div');
    wrapper.classList.add('button-list-wrapper');
    wrapper.appendChild(blBlock);
    panel.appendChild(wrapper);
    decorateBlock(blBlock);
    blockPromises.push(loadBlock(blBlock));
  }

  // Video: each URL gets its OWN block (Video expects one <a> per block).
  // All video blocks are placed inside a .section container so the existing
  // grid CSS (.section:has(> .video-wrapper + .video-wrapper)) activates
  // and lays them out in a responsive row instead of stacking vertically.
  if (itemsByType.video.length > 0) {
    const videoSection = document.createElement('div');
    videoSection.classList.add('section');

    itemsByType.video.forEach(({ url }) => {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.textContent = url;
      const videoBlock = buildBlock('video', [[anchor]]);
      const wrapper = document.createElement('div');
      wrapper.classList.add('video-wrapper');
      wrapper.appendChild(videoBlock);
      videoSection.appendChild(wrapper);
      decorateBlock(videoBlock);
      blockPromises.push(loadBlock(videoBlock));
    });

    panel.appendChild(videoSection);
  }

  await Promise.all(blockPromises);
}

/**
 * Decorate the Tabs block: build a tablist with buttons and convert
 * each row into an accessible tabpanel. Inline block references
 * (((fragment)), ((pdfviewer)), ((video))) are resolved before the DOM
 * is restructured.
 * @param {HTMLElement} block - The tabs block element
 */
/**
 * Activate a tab: update ARIA state on all sibling tabs/panels and show the
 * selected one. Only affects the immediate tabs container (not nested tabs).
 * @param {HTMLElement} button - The tab button to activate
 * @param {HTMLElement} tabpanel - The corresponding tab panel
 */
function activateTab(button, tabpanel) {
  const tabsContainer = button.closest('.tabs');

  // Only affect direct tabpanels within this tabs container (not nested ones)
  tabsContainer.querySelectorAll(':scope > .tabs-panel').forEach((panel) => {
    panel.setAttribute('aria-hidden', true);
  });

  // Only affect buttons in the immediate tablist (not nested ones)
  const tablistEl = tabsContainer.querySelector(':scope > .tabs-list');
  if (tablistEl) {
    tablistEl.querySelectorAll('button').forEach((btn) => {
      btn.setAttribute('aria-selected', false);
      btn.setAttribute('tabindex', '-1');
    });
  }
  tabpanel.setAttribute('aria-hidden', false);
  button.setAttribute('aria-selected', true);
  button.setAttribute('tabindex', '0');
}

export default async function decorate(block) {
  // build tablist
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');

  // decorate tabs and tabpanels
  const tabs = [...block.children].map((child) => child.firstElementChild);
  for (let i = 0; i < tabs.length; i += 1) {
    const tab = tabs[i];
    // Append index to prevent duplicate IDs when tab labels are identical or empty
    const id = `${toClassName(tab.textContent) || 'tab'}-${i}`;

    // decorate tabpanel
    const tabpanel = block.children[i];
    // Capture content div before inline-block processing appends wrapper
    // divs (e.g. .button-list-wrapper) that would change :last-child.
    const contentDiv = tabpanel.querySelector(':scope > div:last-child') || tabpanel;

    // Await async block resolution so pdfviewer/fragment/nested-tabs blocks
    // are fully loaded before the tabs DOM restructuring continues.
    /* eslint-disable no-await-in-loop */
    await decorateFragments(tabpanel);
    await decorateInlineBlocks(tabpanel);

    // Decorate nested blocks that EDS won't auto-discover
    const nestedBlocks = [...tabpanel.querySelectorAll(':scope .tabs, :scope .columns')];
    for (let n = 0; n < nestedBlocks.length; n += 1) {
      const nested = nestedBlocks[n];
      if (!nested.classList.contains('block')) {
        nested.classList.add('block');
        decorateBlock(nested);
        await loadBlock(nested);
      }
    }

    // Wrap leading consecutive pictures in a side-by-side grid
    const children = [...contentDiv.children];
    const leadingPics = [];
    for (let c = 0; c < children.length; c += 1) {
      const el = children[c];
      const isPic = el.tagName === 'PICTURE'
        || (el.tagName === 'P' && el.children.length === 1 && el.querySelector('picture'));
      if (isPic) leadingPics.push(el);
      else break;
    }
    if (leadingPics.length > 1) {
      const grid = document.createElement('div');
      grid.className = 'tabs-image-grid';
      leadingPics[0].before(grid);
      leadingPics.forEach((p) => grid.append(p));
    }
    /* eslint-enable no-await-in-loop */

    tabpanel.className = 'tabs-panel';
    tabpanel.id = `tabpanel-${id}`;
    tabpanel.setAttribute('aria-hidden', !!i);
    tabpanel.setAttribute('aria-labelledby', `tab-${id}`);
    tabpanel.setAttribute('role', 'tabpanel');

    // build tab button
    const button = document.createElement('button');
    button.className = 'tabs-tab';
    button.id = `tab-${id}`;
    button.innerHTML = tab.innerHTML;
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');
    // Only the active tab is in the tab order; others are reached via arrow keys
    button.setAttribute('tabindex', i === 0 ? '0' : '-1');
    button.addEventListener('click', () => {
      activateTab(button, tabpanel);
    });
    tablist.append(button);
    tab.remove();
  }

  // Keyboard navigation per WAI-ARIA Authoring Practices Tabs pattern:
  // Arrow Left/Right to move between tabs, Home/End for first/last tab
  tablist.addEventListener('keydown', (e) => {
    const tabButtons = [...tablist.querySelectorAll('[role="tab"]')];
    const currentIdx = tabButtons.indexOf(e.target);
    if (currentIdx < 0) return;

    let newIdx = -1;
    if (e.key === 'ArrowRight') {
      newIdx = (currentIdx + 1) % tabButtons.length;
    } else if (e.key === 'ArrowLeft') {
      newIdx = (currentIdx - 1 + tabButtons.length) % tabButtons.length;
    } else if (e.key === 'Home') {
      newIdx = 0;
    } else if (e.key === 'End') {
      newIdx = tabButtons.length - 1;
    }

    if (newIdx >= 0) {
      e.preventDefault();
      tabButtons[newIdx].focus();
      tabButtons[newIdx].click();
    }
  });

  block.prepend(tablist);

  // Deep-link: if the URL hash matches a tab ID, activate that tab
  const { hash } = window.location;
  if (hash) {
    const targetId = hash.substring(1);
    const targetBtn = [...tablist.querySelectorAll('[role="tab"]')]
      .find((btn) => btn.id === `tab-${targetId}`
        || btn.getAttribute('aria-controls') === `tabpanel-${targetId}`);
    if (targetBtn) {
      const panelId = targetBtn.getAttribute('aria-controls');
      const panel = document.getElementById(panelId);
      if (panel) activateTab(targetBtn, panel);
    }
  }
}
