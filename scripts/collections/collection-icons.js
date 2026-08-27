/**
 * Inline SVG icon constants shared by the collections blocks.
 * Kept as inline-SVG (not background-image) so callers retain `currentColor` theming.
 *
 * Use one of these constants as the `innerHTML` of a button/span, or as the `icon`
 * field of a picker/menu option.
 *
 * Sizing convention:
 *   `*_SM` = 16px square (kebab-menu rows)
 *   `*_MD` = 18px square (toolbar action buttons)
 *   `*_LG` = larger / non-square illustrations
 */

export const ICON_PERSON_SM = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="10" cy="6.5" r="3.5" stroke="currentColor" stroke-width="1.3"/>
  <path d="M3 18c0-3.866 3.134-6 7-6s7 2.134 7 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
</svg>`;

export const ICON_EDIT_SM = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" fill="none"/>
</svg>`;

export const ICON_DELETE_SM = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 5h10M6 5V3h4v2M6.5 8v4M9.5 8v4M4 5l1 8h6l1-8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const ICON_PEOPLE_MD = `<svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="6" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.2"/>
  <path d="M1.5 13c0-2.485 2.015-4 4.5-4s4.5 1.515 4.5 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M10.5 7a2 2 0 1 0 0-4M11 13h3.5c0-2-1.5-3.5-3.5-3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
</svg>`;

export const ICON_EDIT_MD = `<svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" fill="none"/>
</svg>`;

export const ICON_DELETE_MD = `<svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 5h10M6 5V3h4v2M6.5 8v4M9.5 8v4M4 5l1 8h6l1-8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const ICON_STAR_SM = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M8 1.5l1.545 3.13 3.455.502-2.5 2.437.59 3.44L8 9.387l-3.09 1.622.59-3.44L3 5.132l3.455-.503z"
    stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`;

export const ICON_PIN_SM = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M9.5 2.5l4 4-1.5 1.5-1-.5-3 3 .5 1.5-1.5 1.5-2-2-2.5 2.5-.5-.5 2.5-2.5-2-2 1.5-1.5 1.5.5 3-3-.5-1z"
    stroke="currentColor" stroke-width="1.1" stroke-linejoin="round" fill="none"/>
</svg>`;

export const ICON_GRID_SM = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/></svg>';

export const ICON_PERSON_FILTER = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.2"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';

export const ICON_GLOBE_SM = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2"/><path d="M8 2c0 0-3 2-3 6s3 6 3 6M8 2c0 0 3 2 3 6s-3 6-3 6M2 8h12" stroke="currentColor" stroke-width="1.2"/></svg>';

export const ICON_LOCK_SM = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';

export const PLACEHOLDER_SVG = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="10" width="36" height="28" rx="3" fill="#f0f0f0" stroke="#e0e0e0" stroke-width="1.5"/>
  <rect x="10" y="14" width="12" height="9" rx="1.5" fill="#ddd"/>
  <rect x="24" y="14" width="14" height="4" rx="1" fill="#e8e8e8"/>
  <rect x="24" y="20" width="10" height="3" rx="1" fill="#ebebeb"/>
  <rect x="10" y="26" width="28" height="3" rx="1" fill="#ebebeb"/>
  <rect x="10" y="31" width="20" height="3" rx="1" fill="#ebebeb"/>
</svg>`;
