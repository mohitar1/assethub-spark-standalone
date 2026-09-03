/**
 * Rewrite the landing page's category cards from an enrichment report — the per-customer
 * authoring step that the migration used to do ad-hoc (and got wrong: image-less tiles,
 * link-less "Top Areas", raw delivery URLs that 404).
 *
 * It operates on the copied `/<company>/en/index` DA HTML, PRESERVING the existing block
 * wrappers (`<div class="carousel tiles">` for Browse-by-category, `<div class="cards">`
 * for the secondary "Top" section) and regenerating only their rows from `report.cards`.
 * Each row is authored in the exact shape the live base index uses (verified against
 * main--assethub-spark-standalone--mohitar1.aem.page/en/index.plain.html):
 *
 *   carousel slide / card tile:
 *     <div>
 *       <div><picture><source srcset="<daSourceUrl>"><img src="<daSourceUrl>" …></picture></div>
 *       <div><h3>Label</h3><p>blurb<br><strong><a href="<facet>">Browse →</a></strong></p></div>
 *     </div>
 *
 * Images are DA-hosted page images (report.cards[].cardImageUrl — a content.da.live source
 * URL uploaded by da-card-images.js), authored with ordinary <picture>/<source srcset>/<img>
 * markup exactly like any other authored image in this template. On preview/publish, Helix
 * rewrites this into its own public media_<hash>.<ext> path automatically. This is NOT the
 * worker's `/api/adobe/assets/...` proxy — that path depends on the visitor's session cookie
 * and is broken for a statically published doc (verified live, even for a signed-in user).
 *
 * Count is whatever report.cards yields — no fixed 5/2. The caller decides how many rows go
 * to the carousel vs the secondary cards section (topAreas), defaulting to all-in-carousel.
 */

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * One carousel slide / card tile row for a card spec.
 * @param {{label,blurb,href,cardImageUrl,slug}} card
 * @param {{withBrowseLink?:boolean}} [opts]  Browse-by-category tiles carry a blurb + Browse
 *   link; a "Top" cards tile can be just image + linked heading. Default true.
 */
export function cardRowHtml(card, { withBrowseLink = true } = {}) {
  const img = escapeHtml(card.cardImageUrl);
  const alt = escapeHtml(card.label);
  const href = escapeHtml(card.href);
  const label = escapeHtml(card.label);
  const picture = `<picture><source srcset="${img}"><source srcset="${img}" media="(min-width: 600px)"><img loading="lazy" alt="${alt}" src="${img}"></picture>`;
  if (withBrowseLink) {
    const blurb = escapeHtml(card.blurb || '');
    return `<div><div>${picture}</div>`
      + `<div><h3>${label}</h3>`
      + `<p>${blurb}<br><strong><a href="${href}">Browse →</a></strong></p></div></div>`;
  }
  return `<div><div>${picture}</div>`
    + `<div><h3><a href="${href}">${label}</a></h3></div></div>`;
}

/** Inner HTML for a whole block from a list of card specs. */
export function cardsBlockInnerHtml(cards, opts) {
  return cards.map((c) => cardRowHtml(c, opts)).join('\n');
}

/**
 * Replace the inner rows of the block whose opening tag has `class` containing every token
 * in `classTokens` (e.g. ['carousel','tiles'] or ['cards']), preserving the wrapper and its
 * attributes. Returns the rewritten HTML, or throws if the block isn't found.
 */
export function replaceBlockRows(html, classTokens, innerHtml) {
  const tokens = Array.isArray(classTokens) ? classTokens : [classTokens];
  // Find <div class="… tokens …"> — match the class attribute, then balance nested divs.
  const openRe = /<div\b[^>]*\bclass=(?:"([^"]*)"|'([^']*)')[^>]*>/gi;
  for (let match = openRe.exec(html); match !== null; match = openRe.exec(html)) {
    const classValue = (match[1] || match[2] || '').split(/\s+/);
    if (!tokens.every((t) => classValue.includes(t))) continue;
    const start = match.index;
    const openEnd = openRe.lastIndex;
    // Balance <div>…</div> from openEnd.
    let depth = 1;
    const tagRe = /<\/?div\b[^>]*>/gi;
    tagRe.lastIndex = openEnd;
    let closeStart = -1;
    for (let tag = tagRe.exec(html); tag !== null; tag = tagRe.exec(html)) {
      if (tag[0].startsWith('</')) {
        depth -= 1;
        if (depth === 0) { closeStart = tag.index; break; }
      } else {
        depth += 1;
      }
    }
    if (closeStart === -1) break;
    const openTag = html.slice(start, openEnd);
    const closeTag = '</div>';
    return `${html.slice(0, start)}${openTag}\n${innerHtml}\n${closeTag}${html.slice(closeStart + closeTag.length)}`;
  }
  throw new Error(`Block with class tokens [${tokens.join(', ')}] not found in index HTML`);
}

/**
 * Rewrite the landing index HTML's category blocks from report.cards.
 *
 * @param {string} indexHtml  current copied /<company>/en/index HTML
 * @param {{cards:Array}} report  enrichment report (report.cards)
 * @param {Object} [opts]
 * @param {number} [opts.topAreasCount=0]  how many of the LAST cards go to the secondary
 *   `.cards` block instead of the carousel (0 = all in carousel).
 * @returns {string} rewritten HTML
 */
export function updateIndexCards(indexHtml, report, opts = {}) {
  const cards = (report && report.cards) || [];
  if (cards.length === 0) throw new Error('report.cards is empty — nothing to author');
  const topAreasCount = Math.max(0, Math.min(opts.topAreasCount || 0, cards.length));
  const carouselCards = topAreasCount ? cards.slice(0, cards.length - topAreasCount) : cards;
  const topCards = topAreasCount ? cards.slice(cards.length - topAreasCount) : [];

  let out = replaceBlockRows(
    indexHtml,
    ['carousel', 'tiles'],
    cardsBlockInnerHtml(carouselCards, { withBrowseLink: true }),
  );
  if (topCards.length) {
    out = replaceBlockRows(
      out,
      ['cards'],
      cardsBlockInnerHtml(topCards, { withBrowseLink: false }),
    );
  }
  return out;
}
