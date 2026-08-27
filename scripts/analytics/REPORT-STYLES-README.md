# Analytics Report Shared Styles

## Overview

The `report-styles.css` file contains shared CSS patterns and design tokens for all analytics reports (logins, searches, downloads, collections, etc.). This reduces code duplication and ensures visual consistency across all reports.

## Phase 1 Implementation ✅ (Completed)

**Goal:** Create CSS custom properties (design tokens) and shared utilities to reduce duplication

**Status:** Completed - All reports now use shared CSS variables

### What Was Done

1. **Created** `scripts/analytics/report-styles.css` with:
   - CSS custom properties (:root variables) for colors, spacing, shadows, typography, transitions
   - Reusable component classes (`.analytics-*`) for future use
   - Responsive breakpoints
   - Utility classes

2. **Updated all report CSS files** to:
   - Import the shared stylesheet
   - Replace hardcoded values with CSS variables (--report-*)
   - Maintain existing class names (no JavaScript changes required)

3. **Reports updated:**
   - ✅ `blocks/report-logins/report-logins.css`
   - ✅ `blocks/report-searches/report-searches.css`
   - ✅ `blocks/report-downloads/report-downloads.css`
   - ✅ `blocks/report-collections/report-collections.css`

### Benefits Achieved

- **Consistency:** All reports now use the same color palette, spacing, and typography
- **Maintainability:** Change design tokens in one place to update all reports
- **Reduced Duplication:** ~150-200 lines of CSS variables centralized
- **Easier Theming:** All colors and styles defined as CSS custom properties
- **Low Risk:** No JavaScript changes required, existing class names preserved

## CSS Custom Properties (Design Tokens)

### Colors

```css
--report-primary-color: #f40009;        /* Primary red */
--report-primary-hover: #c8102e;        /* Darker red */
--report-secondary-color: #6ac9ce;      /* Teal */
--report-text-dark: #333;
--report-text-medium: #666;
--report-text-light: #999;
--report-border-color: #ddd;
--report-border-light: #f0f0f0;
--report-error-color: #f44336;
--report-error-bg: #ffebee;
```

### Spacing

```css
--report-spacing-xs: 8px;
--report-spacing-sm: 12px;
--report-spacing-md: 15px;
--report-spacing-lg: 20px;
--report-spacing-xl: 24px;
--report-spacing-2xl: 30px;
```

### Typography

```css
--report-font-size-xs: 11px;
--report-font-size-sm: 12px;
--report-font-size-md: 14px;
--report-font-size-lg: 18px;
--report-font-size-xl: 20px;
--report-font-size-2xl: 28px;
--report-font-size-3xl: 32px;
```

### Shadows & Effects

```css
--report-shadow-sm: 0 2px 8px rgb(0 0 0 / 10%);
--report-shadow-md: 0 4px 12px rgb(0 0 0 / 15%);
--report-shadow-focus: 0 0 0 3px rgb(244 0 9 / 10%);
--report-transition-fast: 0.2s ease;
--report-transition-normal: 0.3s ease;
--report-transition-slow: 0.4s ease-in-out;
```

### Border Radius

```css
--report-radius-sm: 6px;
--report-radius-md: 8px;
--report-radius-lg: 12px;
```

## Usage Examples

### Using CSS Variables

**Before:**
```css
.my-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
  color: #333;
}
```

**After:**
```css
.my-card {
  background: var(--report-background-white);
  border-radius: var(--report-radius-md);
  padding: var(--report-spacing-lg);
  box-shadow: var(--report-shadow-sm);
  color: var(--report-text-dark);
}
```

### Importing in Report CSS

```css
/* At the top of your report CSS file */
@import url('../../scripts/analytics/report-styles.css');
```

## Shared Component Classes

The shared CSS also includes reusable component classes with the `.analytics-*` prefix for future use:

### Containers
- `.analytics-report-container` - Main report wrapper
- `.analytics-report-header` - Report header with title

### Metrics
- `.analytics-metrics` - Metrics grid container
- `.analytics-metric-card` - Individual metric card
- `.analytics-metric-value` - Metric value (large number)
- `.analytics-metric-label` - Metric label (small text)

### Charts
- `.analytics-charts` - Charts grid container
- `.analytics-chart-card` - Individual chart card
- `.analytics-chart-title` - Chart title
- `.analytics-chart-container` - Chart canvas wrapper

### Tables
- `.analytics-table-container` - Table wrapper with card styling
- `.analytics-table` - Table with gradient headers and striped rows
- `.analytics-table-title` - Table title

### Collapsible Sections
- `.analytics-collapsible-section` - Collapsible section wrapper
- `.analytics-collapsible-title` - Clickable title with icon
- `.analytics-collapsible-content` - Content that expands/collapses
- `.analytics-collapse-icon` - Arrow icon (▼)

### Filters
- `.analytics-filter-group` - Filter group container
- `.analytics-filter-select` - Filter dropdown
- `.analytics-filters-toggle` - Toggle button for collapsible filters

## Next Steps (Future Phases)

### Phase 2: Shared Chart Utilities
- Extract common Chart.js code
- Create reusable chart factory functions
- Estimated savings: ~500 lines of JS

### Phase 3: Shared UI Components
- Extract common UI component factories
- Create generic collapsible table, metric card, etc.
- Estimated savings: ~300-400 lines of JS

### Phase 4: Shared Data Utilities
- Extract common data processing functions
- Date range builders, monthly normalization, etc.
- Estimated savings: ~200-300 lines of JS

## Migration Guide (For Existing Reports)

To migrate an existing report to use shared styles:

1. **Import the shared CSS:**
   ```css
   @import url('../../scripts/analytics/report-styles.css');
   ```

2. **Replace hardcoded values with CSS variables:**
   - Find: `#f40009` → Replace: `var(--report-primary-color)`
   - Find: `20px` (spacing) → Replace: `var(--report-spacing-lg)`
   - Find: `8px` (border radius) → Replace: `var(--report-radius-md)`
   - Find: `box-shadow: 0 2px 8px rgb(0 0 0 / 10%)` → Replace: `var(--report-shadow-sm)`

3. **Test thoroughly:**
   - Visual regression testing
   - Check responsive layouts
   - Verify all interactive elements work

4. **Optional: Migrate to shared classes:**
   - Replace report-specific classes with `.analytics-*` classes
   - Update JavaScript to use new class names
   - Higher impact but requires more testing

## Browser Support

CSS custom properties are supported in all modern browsers:
- Chrome 49+
- Firefox 31+
- Safari 9.1+
- Edge 15+

## Testing

After making changes:
- Run `npm run lint:css` to check for CSS errors
- Visual test all reports in multiple browsers
- Check responsive layouts (mobile, tablet, desktop)
- Verify print stylesheets if applicable

## Maintenance

When adding new reports or features:
1. Check if shared styles can be reused
2. Add new design tokens to `:root` if needed
3. Create new shared component classes if pattern is repeated 3+ times
4. Document new patterns in this README

## Contributing

When updating shared styles:
1. Consider impact on all reports using these styles
2. Test changes across all reports
3. Update this README if adding new tokens or classes
4. Communicate breaking changes to the team
