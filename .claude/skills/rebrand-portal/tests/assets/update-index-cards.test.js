import { describe, it, expect } from 'vitest';
import {
  cardRowHtml,
  replaceBlockRows,
  updateIndexCards,
} from '../../scripts/assets/update-index-cards.js';

const cardA = {
  slug: 'dermatology',
  label: 'Dermatology',
  blurb: 'Skin condition imagery.',
  href: '/en/search?facetFilters=%7B%22productCategory%22%3A%7B%22dermatology%22%3Atrue%7D%7D',
  cardImageUrl: '/api/adobe/assets/a1/as/eczema.jpg?width=750',
};
const cardB = {
  slug: 'cancer',
  label: 'Cancer',
  blurb: 'Oncology imagery.',
  href: '/en/search?facetFilters=cancer',
  cardImageUrl: '/api/adobe/assets/a2/as/onc.jpg?width=750',
};

describe('cardRowHtml', () => {
  it('authors image cell + heading + blurb + facet Browse link', () => {
    const html = cardRowHtml(cardA);
    expect(html).toContain('src="/api/adobe/assets/a1/as/eczema.jpg?width=750"');
    expect(html).toContain('<h3>Dermatology</h3>');
    expect(html).toContain('Skin condition imagery.');
    expect(html).toContain(`<a href="${cardA.href}">Browse →</a>`);
  });

  it('authors a linked-heading tile when withBrowseLink is false', () => {
    const html = cardRowHtml(cardB, { withBrowseLink: false });
    expect(html).toContain('<h3><a href="/en/search?facetFilters=cancer">Cancer</a></h3>');
    expect(html).not.toContain('Browse →');
  });
});

describe('replaceBlockRows', () => {
  it('replaces the inner rows of the matching block, preserving the wrapper', () => {
    const html = '<div class="carousel tiles"><div>OLD</div></div>';
    const out = replaceBlockRows(html, ['carousel', 'tiles'], '<div>NEW</div>');
    expect(out).toContain('<div class="carousel tiles">');
    expect(out).toContain('<div>NEW</div>');
    expect(out).not.toContain('OLD');
  });

  it('balances nested divs so it replaces the whole block, not the first close', () => {
    const html = '<div class="cards"><div><div>inner</div></div></div>AFTER';
    const out = replaceBlockRows(html, ['cards'], 'X');
    expect(out).toBe('<div class="cards">\nX\n</div>AFTER');
  });

  it('throws when the block is absent', () => {
    expect(() => replaceBlockRows('<div class="other"></div>', ['cards'], 'X')).toThrow();
  });
});

describe('updateIndexCards', () => {
  const indexHtml = [
    '<div class="search-hero category-tiles">',
    '<h2 id="browse-by-category">Browse by category</h2>',
    '<div class="carousel tiles"><div><div><picture></picture></div><div><h3>Old</h3></div></div></div>',
    '<h2 id="top-areas">Top Areas</h2>',
    '<div class="cards"><div><div><picture></picture></div><div><h3>OldBrand</h3></div></div></div>',
    '</div>',
  ].join('\n');

  it('rewrites the carousel from report.cards (all in carousel by default)', () => {
    const out = updateIndexCards(indexHtml, { cards: [cardA, cardB] });
    expect(out).toContain('<h3>Dermatology</h3>');
    expect(out).toContain('<h3>Cancer</h3>');
    expect(out).toContain('Browse →');
    expect(out).not.toContain('<h3>Old</h3>');
    // The cards block is left as-is when topAreasCount is 0.
    expect(out).toContain('<h3>OldBrand</h3>');
  });

  it('splits the last N cards into the secondary cards block', () => {
    const out = updateIndexCards(indexHtml, { cards: [cardA, cardB] }, { topAreasCount: 1 });
    // cardA -> carousel (with Browse link), cardB -> cards block (linked heading, no Browse).
    expect(out).toContain('<h3>Dermatology</h3>');
    expect(out).toContain('<h3><a href="/en/search?facetFilters=cancer">Cancer</a></h3>');
    expect(out).not.toContain('<h3>OldBrand</h3>');
  });

  it('throws on an empty report', () => {
    expect(() => updateIndexCards(indexHtml, { cards: [] })).toThrow();
  });
});
