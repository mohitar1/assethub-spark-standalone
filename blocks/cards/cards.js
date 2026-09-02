import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  // Distinguishes compact icon/logo tiles (portrait/near-square source
  // art, e.g. "Top Brands") from photo tiles (landscape source photos,
  // e.g. "Browse by channel" on brand pages) so shared section styles
  // can size each correctly — icons need to stay contained/small, photos
  // need to stay full-bleed/cover. Checked from the first image's real
  // intrinsic width/height attributes, before any block-specific CSS
  // (which differs only by content, not by markup) can be applied.
  const firstImg = block.querySelector('img[width][height]');
  const isIconArt = firstImg && (Number(firstImg.height) > Number(firstImg.width));
  if (isIconArt) block.classList.add('icon-tiles');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    // A tile with no image cell (text-only) shouldn't reserve a blank image band — mark it
    // so section CSS can collapse it cleanly instead of showing an empty white box.
    if (!li.querySelector('.cards-card-image')) li.classList.add('no-image');

    const cardBody = li.querySelector('.cards-card-body');
    const link = cardBody?.querySelector('a');
    if (link) {
      // Store the original link's href and target
      const { href } = link;
      const { target } = link;

      // Make the whole card clickable
      li.style.cursor = 'pointer';
      li.addEventListener('click', (e) => {
        // Prevent default if clicking directly on the link
        if (e.target.tagName === 'A') return;

        // Navigate to the link
        if (target === '_blank') {
          window.open(href, '_blank');
        } else {
          window.location.href = href;
        }
      });

      // Keep the original link styling but remove its default click behavior for card clicks
      link.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    ul.append(li);
  });
  if (block.classList.contains('highlights') || block.classList.contains('two-up')) {
    ul.querySelectorAll('a.button').forEach((btn) => {
      btn.classList.remove('button', 'primary', 'secondary');
    });
    ul.querySelectorAll('.button-container').forEach((container) => {
      container.classList.remove('button-container');
    });
  }

  ul.querySelectorAll('picture > img').forEach((img) => {
    // DAM assets are served through the worker's own proxy (/api/adobe/assets/…), which is
    // already an optimized delivery endpoint and only accepts ?width=. Running it through
    // Helix's createOptimizedPicture would append Helix-only ?format=&optimize= params the
    // proxy forwards to a delivery host that ignores/rejects them, and would strip the
    // responsive <source> set the app authored — so leave those pictures untouched. Helix/DA
    // images (./media_… etc.) still get re-optimized as before.
    const { pathname } = new URL(img.src, window.location.href);
    if (pathname.startsWith('/api/adobe/assets/')) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
  });
  block.textContent = '';
  block.append(ul);
}
