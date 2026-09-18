/**
 * Drop a URL fragment once it has done its job.
 *
 * A fragment such as #lab is useful exactly once: it scrolls and focuses the
 * target on arrival. Left in the address afterwards, it becomes a liability
 * for screen-reader users: when the page restyles (a theme or typeface
 * change), JAWS rebuilds its virtual buffer and treats the fragment as a
 * fresh arrival, moving the reading cursor back to the target's heading. So
 * after an in-page jump has landed, and before any whole-page restyle, the
 * fragment is removed from the address without a navigation. The same on
 * first load: the browser has already scrolled to the target, and the
 * components have already read the fragment, before this runs.
 */
export function settleHash(): void {
  if (!location.hash) return;
  try {
    history.replaceState(history.state, "", location.pathname + location.search);
  } catch {
    /* sandboxed or file: contexts may refuse; the fragment then simply stays */
  }
}
