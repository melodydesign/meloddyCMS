# Brainstorm & Plan: Mobile Menu & Responsiveness

## Goal
Create a smooth, premium mobile menu for the landing page and document pages, and verify overall site responsiveness.

## Constraints & Risks
- Multiple HTML files (`index.html`, `privacy.html`, `terms.html`, `offer.html`) need the same header updates.
- Need to keep the "Wow-effect" premium look.
- Modifying the header layout might cause issues on tablet resolutions if not careful with CSS media queries.
- Must ensure that clicking a mobile menu link auto-closes the overlay so the user can see the smooth scroll effect.

## Options / Recommendation
**Recommendation:** Implement a full-screen blurred overlay for the mobile menu. It feels modern and premium.
1. Add `.land-burger` button to `<div class="land-header-inner">`.
2. Add `<div class="land-mobile-nav">` with links.
3. Use CSS to hide `.land-nav` and `.land-header-auth` on mobile (max-width: 900px), and show the burger menu.
4. Add simple JS to toggle a `.menu-open` class on `body` (to prevent scrolling) and the menu container.

## Step-by-Step Plan
1. **HTML Updates:** Add the burger button and mobile navigation container to `index.html`, `privacy.html`, `terms.html`, and `offer.html`.
2. **CSS Updates (`landing.css`):**
   - Style `.land-burger` (hamburger icon using spans).
   - Style `.land-mobile-nav` (fixed position, backdrop-filter blur, centered large links).
   - Add animations for menu open/close and burger icon transform.
   - Adjust `max-width: 900px` and `max-width: 600px` media queries to accommodate the new header layout.
3. **JS Updates:**
   - Add a `<script>` snippet to the bottom of the HTML files to handle the burger click and link clicks.
4. **Responsiveness Audit:**
   - Verify `.workflow-grid`, `.audience-grid` (now Bento), and `.compare-table` display correctly on mobile. The Bento grid currently falls back to `1fr` on `600px`, which is good. The comparison table has `overflow-x: auto;`, which is also correct for tables.

## Verification Steps
- Run `node deploy_script.js` and verify changes.
- Ensure the menu opens and closes correctly on a mobile viewport.
- Ensure the background doesn't scroll when the menu is open.
- Ensure clicking a link navigates to the section and closes the menu.
