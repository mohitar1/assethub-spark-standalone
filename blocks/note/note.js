import { decorateIcons } from '../../scripts/aem.js';

/**
 * loads and decorates the note
 * @param {Element} block The note block element
 */
export default async function decorate(block) {
  // Replace headings
  block.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((oldHeading) => {
    const heading = document.createElement('P');
    heading.classList.add('note-heading');
    heading.textContent = oldHeading.textContent;
    oldHeading.replaceWith(heading);
  });

  // Add icon
  if (!block.classList.contains('no-icon')) {
    const icon = document.createElement('span');
    if (block.classList.contains('warning')) {
      icon.classList.add('icon', 'icon-warning');
    } else if (block.classList.contains('error')) {
      icon.classList.add('icon', 'icon-error');
    } else if (block.classList.contains('success')) {
      icon.classList.add('icon', 'icon-success');
    } else {
      icon.classList.add('icon', 'icon-info');
    }
    block.prepend(icon);
    decorateIcons(block);
  }
}
