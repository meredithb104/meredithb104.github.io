import { settleHash } from "./settle-hash.ts";

/**
 * One path for every in-page fragment: land, focus, settle.
 *
 * Landing on a fragment should put keyboard focus on the target (WCAG 2.4.3),
 * whether the target is a section with tabindex="-1", a heading in a post, or
 * anything else with an id. Then the fragment is removed from the address,
 * because a fragment that lingers pulls a screen reader's reading cursor back
 * to its target on every buffer refresh.
 *
 * Covers: clicks on same-document links (href="#x" or "/#x" on that page),
 * hashchange (Back and Forward, or an edited address), and first load.
 */

const NATIVELY_FOCUSABLE = /^(a|button|input|select|textarea|summary)$/i;

function makeFocusable(el: HTMLElement): void {
  if (el.hasAttribute("tabindex") || NATIVELY_FOCUSABLE.test(el.tagName)) return;
  el.tabIndex = -1;
  // Keep the DOM as authored once focus moves on.
  el.addEventListener("blur", () => el.removeAttribute("tabindex"), { once: true });
}

/** Focus the element a fragment names (if any) without scrolling, then drop the fragment. */
export function landOnFragment(hash: string): void {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  const target = id ? document.getElementById(id) : null;
  if (target) {
    makeFocusable(target);
    target.focus({ preventScroll: true });
  }
  settleHash();
}

/** Same document, different fragment: the browser will scroll; we land after it. */
function isSameDocumentFragmentLink(link: HTMLAnchorElement): boolean {
  return link.hash !== "" && link.origin === location.origin && link.pathname === location.pathname && link.search === location.search;
}

export function installFragmentHandling(): void {
  document.addEventListener("click", (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
    if (!link || !isSameDocumentFragmentLink(link)) return;
    const hash = link.hash;
    // Let the browser scroll first (honouring scroll-padding), then focus without a second jump.
    requestAnimationFrame(() => requestAnimationFrame(() => landOnFragment(hash)));
  });

  window.addEventListener("hashchange", () => {
    if (location.hash) requestAnimationFrame(() => landOnFragment(location.hash));
  });

  const onLoad = (): void => {
    // The browser has scrolled to the fragment and the components have read it; now settle it.
    requestAnimationFrame(() => requestAnimationFrame(settleHash));
  };
  if (document.readyState === "complete") onLoad();
  else window.addEventListener("load", onLoad, { once: true });
}
