/**
 * Entry point. The page is complete HTML before this runs; everything here
 * is enhancement. Total shipped JavaScript is a few kilobytes, and none of it
 * blocks first paint (the module is deferred by default).
 */
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/site.css";

import { mountLiveRegions } from "./lib/announce.ts";
import "./components/theme-picker.ts";
import "./components/contrast-checker.ts";
import "./components/work-filter.ts";
import "./components/site-nav.ts";

mountLiveRegions();

// Keyboard users who follow an in-page link should land *on* the section, not
// just scroll to it (2.4.3 Focus Order). Sections carry tabindex="-1".
document.addEventListener("click", (event) => {
  const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
  if (!link) return;
  const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
  if (target && target.tabIndex === -1) {
    // Let the browser scroll first (respecting scroll-padding), then move focus without a second jump.
    requestAnimationFrame(() => target.focus({ preventScroll: true }));
  }
});
