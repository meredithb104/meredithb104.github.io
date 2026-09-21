/**
 * Roving tabindex for a horizontal set of controls (tabs, a slide picker).
 * One tab stop for the group; Left/Right move, Home/End jump, wrapping at
 * the ends. This is the keyboard half of the APG tabs pattern, kept
 * separate from <carousel-slider> so it can be tested on its own. (The Lab's
 * tabs are Commons UI's <cui-tabs>, which carries its own keyboard handling.)
 */

export interface RovingOptions {
  /** Called with the new index after arrow/Home/End moves focus. */
  onMove: (index: number) => void;
}

/** Resolve the index a key press should move to, or null if the key isn't ours. */
export function nextIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    case "ArrowRight":
      return (current + 1) % count;
    case "ArrowLeft":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

/** Put exactly one item in the tab order and focus it if asked. */
export function setRovingFocus(items: readonly HTMLElement[], index: number, focus = true): void {
  items.forEach((el, i) => {
    el.tabIndex = i === index ? 0 : -1;
  });
  if (focus) items[index]?.focus();
}

/** Attach the key handling to a container. Returns a detach function. */
export function attachRoving(container: HTMLElement, items: () => readonly HTMLElement[], opts: RovingOptions): () => void {
  const onKeydown = (event: KeyboardEvent): void => {
    const list = items();
    const current = list.findIndex((el) => el === document.activeElement);
    if (current === -1) return;
    const next = nextIndex(event.key, current, list.length);
    if (next === null) return;
    event.preventDefault();
    setRovingFocus(list, next);
    opts.onMove(next);
  };
  container.addEventListener("keydown", onKeydown);
  return () => container.removeEventListener("keydown", onKeydown);
}
