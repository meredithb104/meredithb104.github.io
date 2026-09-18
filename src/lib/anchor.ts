/**
 * Keep an element where the reader is looking while the page restyles around it.
 *
 * Changing the typeface (or, less so, the theme) reflows everything above the
 * control that was just used, so the control slides up or down the screen even
 * though scrollY never changed. Measure the element before the change, and after
 * it scroll by the difference, instantly, with no animation. Web fonts arrive
 * asynchronously, so correct once more when they have loaded.
 */
export function keepInPlace(el: Element, change: () => void): void {
  const before = el.getBoundingClientRect().top;
  const correct = (): void => {
    const delta = el.getBoundingClientRect().top - before;
    if (Math.abs(delta) >= 1) window.scrollBy({ top: delta, behavior: "instant" });
  };
  change();
  correct(); // getBoundingClientRect forces the reflow, so the delta is exact here
  document.fonts?.ready.then(correct);
}
