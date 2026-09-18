/**
 * Entry point. The page is complete HTML before this runs; everything here
 * is enhancement. Total shipped JavaScript is a few kilobytes, and none of it
 * blocks first paint (the module is deferred by default).
 */
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/site.css";

import { mountLiveRegions } from "./lib/announce.ts";
import { installFragmentHandling } from "./lib/fragments.ts";
import "./components/theme-picker.ts";
import "./components/font-picker.ts";
import "./components/contrast-checker.ts";
import "./components/work-filter.ts";
import "./components/site-nav.ts";
import "./components/tab-set.ts";
import "./components/carousel-slider.ts";

mountLiveRegions();

// Fragments: a link, Back or Forward, or an address with #section lands on the target, moves focus there
// without scrolling, and then clears the fragment. A fragment left in the address pulls a screen
// reader's cursor back to its target on every buffer refresh. See lib/fragments.ts.
installFragmentHandling();
