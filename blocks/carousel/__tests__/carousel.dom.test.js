import {
  describe, it, expect, vi, beforeAll, beforeEach, afterEach,
} from 'vitest';

vi.mock('../../../scripts/locale-utils.js', () => ({
  getAppLabel: async () => (key, fallback) => fallback || key,
}));

const { default: decorate } = await import('../carousel.js');

const DESKTOP_WIDTH = 1280; // 4 cards per screen
const MOBILE_WIDTH = 375; // 1 card per screen

function setViewportWidth(width) {
  window.innerWidth = width;
}

function buildRawBlock(slideCount, { withLink = false } = {}) {
  const block = document.createElement('div');
  for (let i = 0; i < slideCount; i += 1) {
    const row = document.createElement('div');
    const imageCol = document.createElement('div');
    imageCol.innerHTML = '<picture><img src="test.jpg" alt=""></picture>';
    const contentCol = document.createElement('div');
    contentCol.innerHTML = withLink
      ? `<p><a href="/campaigns/slide-${i}">Slide ${i}</a></p>`
      : `<p>Slide ${i}</p>`;
    row.append(imageCol, contentCol);
    block.append(row);
  }
  return block;
}

beforeAll(() => {
  // jsdom doesn't implement Element.scrollTo; showSlide() calls it whenever
  // resizeCarousel() runs (e.g. on the resize tests below).
  Element.prototype.scrollTo = () => {};
});

beforeEach(() => {
  setViewportWidth(DESKTOP_WIDTH);
});

describe('carousel decorate — slide structure', () => {
  it('converts each authored row into a carousel-slide with image/content columns', async () => {
    const block = buildRawBlock(2);
    await decorate(block);

    const slides = block.querySelectorAll('.carousel-slide');
    expect(slides).toHaveLength(2);
    expect(slides[0].querySelector('.carousel-slide-image')).toBeTruthy();
    expect(slides[0].querySelector('.carousel-slide-content')).toBeTruthy();
  });

  it('flattens a linked slide to plain text and makes the whole slide clickable', async () => {
    const block = buildRawBlock(1, { withLink: true });
    await decorate(block);

    const slide = block.querySelector('.carousel-slide');
    expect(slide.getAttribute('role')).toBe('link');
    expect(slide.getAttribute('tabindex')).toBe('0');
    expect(slide.dataset.cardLink).toContain('/campaigns/slide-0');
    expect(slide.querySelector('a')).toBeNull();
    expect(slide.textContent).toContain('Slide 0');
  });
});

describe('carousel decorate — pagination visibility', () => {
  it('hides nav arrows and indicators when a single slide is authored', async () => {
    const block = buildRawBlock(1);
    await decorate(block);

    expect(block.querySelector('.carousel-navigation-buttons').style.display).toBe('none');
    expect(block.querySelector('.carousel-slide-indicators-nav').style.display).toBe('none');
  });

  it('hides nav arrows and indicators when multiple slides all fit on one page', async () => {
    setViewportWidth(DESKTOP_WIDTH); // 4 cards per screen
    const block = buildRawBlock(3);
    await decorate(block);

    expect(block.querySelector('.carousel-navigation-buttons').style.display).toBe('none');
    expect(block.querySelector('.carousel-slide-indicators-nav').style.display).toBe('none');
    expect(block.querySelectorAll('.carousel-slide-indicator')).toHaveLength(1);
  });

  it('shows nav arrows and indicators when slides exceed one page', async () => {
    setViewportWidth(DESKTOP_WIDTH); // 4 cards per screen
    const block = buildRawBlock(5);
    await decorate(block);

    expect(block.querySelector('.carousel-navigation-buttons').style.display).not.toBe('none');
    expect(block.querySelector('.carousel-slide-indicators-nav').style.display).not.toBe('none');
    expect(block.querySelectorAll('.carousel-slide-indicator')).toHaveLength(2);
  });

  it('shows pagination for a 2-item carousel at a mobile width (1 card per screen)', async () => {
    setViewportWidth(MOBILE_WIDTH);
    const block = buildRawBlock(2);
    await decorate(block);

    expect(block.querySelector('.carousel-navigation-buttons').style.display).not.toBe('none');
    expect(block.querySelector('.carousel-slide-indicators-nav').style.display).not.toBe('none');
    expect(block.querySelectorAll('.carousel-slide-indicator')).toHaveLength(2);
  });
});

describe('carousel resize — dynamic pagination visibility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function resize(width) {
    setViewportWidth(width);
    window.dispatchEvent(new Event('resize'));
    await vi.advanceTimersByTimeAsync(300);
  }

  it('reveals pagination after resizing from an all-fit desktop width down to mobile', async () => {
    setViewportWidth(DESKTOP_WIDTH);
    const block = buildRawBlock(3); // fits in one page at 4/screen, needs 3 pages at 1/screen
    await decorate(block);
    expect(block.querySelector('.carousel-navigation-buttons').style.display).toBe('none');

    await resize(MOBILE_WIDTH);

    expect(block.querySelector('.carousel-navigation-buttons').style.display).not.toBe('none');
    expect(block.querySelector('.carousel-slide-indicators-nav').style.display).not.toBe('none');
    expect(block.querySelectorAll('.carousel-slide-indicator')).toHaveLength(3);
  });

  it('hides pagination after resizing from a paginated mobile width up to an all-fit desktop width', async () => {
    setViewportWidth(MOBILE_WIDTH);
    const block = buildRawBlock(3);
    await decorate(block);
    expect(block.querySelector('.carousel-navigation-buttons').style.display).not.toBe('none');

    await resize(DESKTOP_WIDTH);

    expect(block.querySelector('.carousel-navigation-buttons').style.display).toBe('none');
    expect(block.querySelector('.carousel-slide-indicators-nav').style.display).toBe('none');
  });
});
