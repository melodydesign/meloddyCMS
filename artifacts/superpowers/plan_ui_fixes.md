# UI Bug Fixes Plan

## Goal
Fix a series of UI bugs across the dashboard and file manager based on user feedback.

## Constraints & Risks
- **Constraint**: Maintain the existing glassmorphism aesthetic.
- **Constraint**: Ensure light and dark themes are fully supported without invisible text.
- **Risk**: Changing overflow on elements could introduce scrollbars where they aren't wanted.
- **Risk**: Modifying CSS classes might affect elements globally. 

## Proposed Changes

### 1. Fix text visibility in light theme (dashboard_v2.js / style.css)
- Investigate `#tabSeo` text visibility. Ensure text color contrasts correctly with the background in light mode (update `.btn-secondary` or specific text elements).

### 2. Fix file manager scroll and padding (file-manager.html / style.css)
- Update the layout of `file-manager.html` so the left sidebar (file tree) has internal scrolling (`overflow-y: auto`) when there are many files.
- Add bottom padding to the main file manager view to prevent content from touching the bottom edge of the screen.

### 3. Fix logo visibility in light theme (dashboard.html / style.css)
- The logo text has `color: #fff` hardcoded inline or in CSS. Need to remove hardcoded inline styles from `dashboard.html` and use CSS variables (`var(--text-color)`) so it flips to dark in light theme.

### 4. Fix client name and icon visibility in light theme (dashboard_v2.js)
- The client tabs list (`.client-tab-item`) text and icons are currently hardcoded to `#fff` or `color: inherit` within a dark container. Ensure they adapt to light theme properly.

### 5. Fix 3-dots popup clipping (dashboard_v2.js / style.css)
- The popup menu inside `.site-card` is being clipped. The `.site-card` has `overflow: hidden` in `style.css`.
- Action: Remove `overflow: hidden` from `.site-card` to allow the absolute positioned popup menu to render outside its boundaries.

## Verification
- Reload dashboard.html and file-manager.html in browser.
- Switch between light and dark modes to confirm text, logo, and icons are visible in both.
- Click the 3-dots menu on a site card to ensure it does not clip.
- Add many files/folders to the file manager to verify the left panel scrolls independently.
