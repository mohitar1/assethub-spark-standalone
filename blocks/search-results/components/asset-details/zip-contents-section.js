/**
 * Asset Details ZIP Contents Section
 * Displays the file/folder structure from structure.json rendition for ZIP assets
 */

import { getDynamicMediaClient } from '../../clients/dynamicmedia-client.js';

/**
 * Sort nodes: folders first, then files, alphabetically
 * @param {Array} nodes - Array of tree nodes
 */
function sortNodes(nodes) {
  nodes.sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });
  nodes.forEach((node) => {
    if (node.children && node.children.length > 0) {
      sortNodes(node.children);
    }
  });
}

/**
 * Check if a name looks like a file (has a file extension)
 * @param {string} name - The name to check
 * @returns {boolean} True if looks like a file
 */
function looksLikeFile(name) {
  // Match common file extensions (2-5 alphanumeric chars after the last dot)
  return /\.[a-zA-Z0-9]{2,5}$/.test(name);
}

/**
 * Check if items are already in hierarchical format (have nested children arrays)
 * @param {Array} items - Array of items
 * @returns {boolean} True if hierarchical
 */
function isHierarchicalFormat(items) {
  return items.some((item) => item.children && Array.isArray(item.children));
}

/**
 * Determine if an item should be treated as a folder
 * @param {Object} item - The item to check
 * @returns {boolean} True if should be treated as folder
 */
function isFolder(item) {
  // A folder must have non-empty children AND not look like a file
  const hasChildren = item.children && item.children.length > 0;
  const nameIsFile = looksLikeFile(item.name);
  return hasChildren && !nameIsFile;
}

/**
 * Process hierarchical tree structure (already nested)
 * Just sorts and returns the tree as-is
 * @param {Array} items - Array of items already in tree format
 * @returns {Array} Sorted hierarchical tree structure
 */
function processHierarchicalTree(items) {
  const result = items.map((item) => {
    const isFolderItem = isFolder(item);
    return {
      name: item.name,
      type: isFolderItem ? 'folder' : 'file',
      children: isFolderItem ? processHierarchicalTree(item.children) : undefined,
    };
  });
  sortNodes(result);
  return result;
}

/**
 * Build a hierarchical tree from flat file paths
 * @param {Array} items - Array of items with flat paths like "folder/subfolder/file.txt"
 * @returns {Array} Hierarchical tree structure
 */
function buildTreeFromPaths(items) {
  // Check if data is already hierarchical (has nested children arrays)
  if (isHierarchicalFormat(items)) {
    return processHierarchicalTree(items);
  }

  // Handle flat path format
  const root = [];
  const folderMap = new Map();

  items.forEach((item) => {
    const parts = item.name.split('/');
    let currentLevel = root;
    let currentPath = '';

    parts.forEach((part, index) => {
      const isLastPart = index === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      // Check if this folder/file already exists at current level
      let existing = currentLevel.find((node) => node.name === part);

      if (!existing) {
        const node = {
          name: part,
          type: isLastPart ? 'file' : 'folder',
          children: isLastPart ? undefined : [],
        };

        currentLevel.push(node);
        existing = node;

        if (!isLastPart) {
          folderMap.set(currentPath, node);
        }
      }

      if (!isLastPart && existing.children) {
        currentLevel = existing.children;
      }
    });
  });

  sortNodes(root);
  return root;
}

/**
 * Render a tree node (file or folder)
 * @param {Object} node - The tree node
 * @param {number} depth - Current depth in the tree
 * @returns {string} HTML string
 */
function renderTreeNode(node, depth = 0) {
  const indent = (depth + 1) * 20; // 20px per level, root starts at 20px
  const isFolderNode = node.type === 'folder' || (node.children && node.children.length > 0);
  const itemClass = isFolderNode ? 'zip-tree-folder' : 'zip-tree-file';

  let html = `
    <div class="zip-tree-item ${itemClass}" style="padding-left: ${indent}px;">
      <span class="zip-tree-icon"></span>
      <span class="zip-tree-name">${node.name}</span>
      ${isFolderNode ? '<img src="/icons/arrow.svg" class="zip-tree-toggle" alt="expand" />' : ''}
    </div>
  `;

  // Recursively render children in a collapsible container (collapsed by default)
  if (node.children && node.children.length > 0) {
    html += '<div class="zip-tree-children" style="display: none;">';
    node.children.forEach((child) => {
      html += renderTreeNode(child, depth + 1);
    });
    html += '</div>';
  }

  return html;
}

/**
 * Render the tree HTML from structure data
 * @param {Array} tree - Hierarchical tree structure
 * @returns {string} HTML string
 */
function renderTreeHtml(tree) {
  let html = '<div class="zip-tree">';
  tree.forEach((node) => {
    html += renderTreeNode(node, 0);
  });
  html += '</div>';
  return html;
}

/**
 * Bind click events for folder expand/collapse toggles using event delegation
 * @param {HTMLElement} container - The container element
 */
export function bindTreeToggleEvents(container) {
  if (!container) return;

  container.addEventListener('click', (e) => {
    // Allow clicking on the folder row or the toggle arrow
    const folderItem = e.target.closest('.zip-tree-folder');
    if (!folderItem) return;

    e.stopPropagation();

    const childrenContainer = folderItem.nextElementSibling;
    if (childrenContainer?.classList.contains('zip-tree-children')) {
      const isExpanded = childrenContainer.style.display !== 'none';
      childrenContainer.style.display = isExpanded ? 'none' : 'block';
      folderItem.classList.toggle('expanded', !isExpanded);
    }
  });
}

/**
 * Render ZIP Contents section
 * @param {Object} asset - The asset object
 * @param {Object} renditions - The renditions object (optional, not used for structure.json fetch)
 * @param {boolean} collapseAll - Whether section should be collapsed
 * @param {Object} cachedStructure - Cached structure data (optional)
 * @returns {string} HTML string
 */
export function renderZipContentsSection(asset, renditions, collapseAll, cachedStructure) {
  const isExpanded = !collapseAll;

  // If we have cached structure data, render the tree directly
  // cachedStructure can be: null (loading), { error: true } (failed),
  // or { children: [...] } (success)
  let contentHtml;
  if (cachedStructure?.error) {
    contentHtml = `
      <div class="zip-contents-unavailable">
        <span>Zip content not available</span>
      </div>
    `;
  } else if (cachedStructure?.children) {
    const tree = buildTreeFromPaths(cachedStructure.children);
    contentHtml = renderTreeHtml(tree);
  } else {
    contentHtml = `
      <div class="zip-contents-loading">
        <span>Loading contents...</span>
      </div>
    `;
  }

  return `
    <div class="asset-details-card" data-section-id="zip-contents">
      <div class="asset-details-header" data-action="toggle-section" data-section="zip-contents">
        <h3 class="asset-details-title">Contents</h3>
        <span class="asset-details-arrow ${isExpanded ? 'expanded' : ''}"></span>
      </div>
      <div class="asset-details-content" style="${isExpanded ? '' : 'display: none;'}">
        <div class="zip-contents-container">
          <div class="zip-filename">${asset.name || ''}</div>
          <div class="zip-tree-content">${contentHtml}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Fetch and render ZIP structure after section is in DOM
 * @param {HTMLElement} container - The modal container
 * @param {Object} asset - The asset object
 * @param {Function} onDataLoaded - Callback called with structure data when loaded (for caching)
 */
export async function loadZipContents(container, asset, onDataLoaded) {
  const zipTreeContent = container?.querySelector('.zip-tree-content');
  if (!zipTreeContent) return;

  try {
    const client = getDynamicMediaClient();
    if (!client) {
      throw new Error('Dynamic Media client not available');
    }

    // First fetch renditions to find the structure.json rendition name
    // (it may have a prefix like 'asset-structure.json')
    const renditionsResponse = await client.getAssetRenditions(asset);
    const structureRendition = renditionsResponse?.items?.find(
      (r) => r.name?.toLowerCase().endsWith('structure.json'),
    );

    if (!structureRendition) {
      throw new Error('No structure.json rendition found');
    }

    // Fetch the structure.json content using the actual rendition name
    const structureData = await client.fetchRenditionAsJson(asset, structureRendition.name);

    if (!structureData || !structureData.children || structureData.children.length === 0) {
      throw new Error('No structure data available');
    }

    // Cache the data via callback so it persists across re-renders
    if (onDataLoaded) {
      onDataLoaded(structureData);
    }

    // Re-query container in case a re-render replaced the DOM during fetch
    const currentTreeContent = container?.querySelector('.zip-tree-content');
    if (currentTreeContent) {
      // Transform flat paths into hierarchical tree and render
      const tree = buildTreeFromPaths(structureData.children);
      currentTreeContent.innerHTML = renderTreeHtml(tree);
      bindTreeToggleEvents(currentTreeContent);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load ZIP contents:', error);

    // Cache error state so re-renders show unavailable message
    if (onDataLoaded) {
      onDataLoaded({ error: true });
    }

    // Re-query container in case a re-render replaced the DOM during fetch
    const currentTreeContent = container?.querySelector('.zip-tree-content');
    if (currentTreeContent) {
      currentTreeContent.innerHTML = `
        <div class="zip-contents-unavailable">
          <span>Zip content not available</span>
        </div>
      `;
    }
  }
}

export default renderZipContentsSection;
