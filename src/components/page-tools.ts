/**
 * <page-tools>: Previous section, Next section, Back to top.
 *
 * A small fixed toolbar for anyone deep in a long page. It is one landmark
 * (nav "Page") placed after <main>, so it is never met while reading, and it is
 * hidden until the reader has scrolled past the hero, so at the top of the page,
 * where the real navigation is, it is not in the tab order at all.
 *
 * It is not hidden from assistive technology. Screen readers have their own
 * heading and landmark keys, but the Tab key is shared with sighted keyboard
 * users, and a control that is focusable yet aria-hidden is a silent tab stop
 * (WCAG 4.1.2). Scope, not concealment, keeps it out of the way.
 *
 * Jumps go through the URL fragment, so the same code path that handles every
 * other in-page link lands focus on the section and then clears the fragment.
 */

export class PageTools extends HTMLElement {
  private sections: HTMLElement[] = [];
  private prev: HTMLButtonElement | null = null;
  private next: HTMLButtonElement | null = null;
  private scheduled = false;
  /** The section just jumped to, counted as current until that (smooth) scroll has ended. */
  private pending: HTMLElement | null = null;
  private pendingTimer = 0;

  connectedCallback(): void {
    this.sections = [...document.querySelectorAll<HTMLElement>("main > section[id]")];
    this.prev = this.querySelector<HTMLButtonElement>("[data-prev]");
    this.next = this.querySelector<HTMLButtonElement>("[data-next]");
    if (this.sections.length === 0 || !this.prev || !this.next) return;
    this.prev.addEventListener("click", this.onPrev);
    this.next.addEventListener("click", this.onNext);
    // The Top link targets the <site-nav> wrapper in the header (always rendered, unlike the <nav>
    // inside it, which is the collapsed panel on a phone). The browser counts it as already in view
    // in the sticky header, so following it would not scroll, and its no-op scroll would cancel one
    // we started. Set the fragment ourselves (the fragment handler lands focus), then scroll.
    this.querySelector<HTMLAnchorElement>("[data-top]")?.addEventListener("click", (event) => {
      event.preventDefault();
      location.hash = (event.currentTarget as HTMLAnchorElement).hash;
      window.scrollTo({ top: 0 });
    });
    window.addEventListener("scroll", this.schedule, { passive: true });
    window.addEventListener("resize", this.schedule, { passive: true });
    window.addEventListener("scrollend", this.settle);
    this.update();
  }

  disconnectedCallback(): void {
    window.removeEventListener("scroll", this.schedule);
    window.removeEventListener("resize", this.schedule);
    window.removeEventListener("scrollend", this.settle);
  }

  /**
   * The viewport's reading line: where a jump lands a section's top. That is the root's
   * scroll-padding-block-start (which clears the sticky header on wide screens and still applies
   * on phones, where the header is not sticky), plus a little, so a section sitting exactly on the
   * landing line counts as current.
   */
  private line(): number {
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    return scrollY + padding + 8;
  }

  private top(el: HTMLElement): number {
    return el.getBoundingClientRect().top + scrollY;
  }

  /** Index of the section the reading line is in, or -1 above the first. */
  private currentIndex(): number {
    if (this.pending) return this.sections.indexOf(this.pending);
    const line = this.line();
    let index = -1;
    this.sections.forEach((s, i) => {
      if (this.top(s) <= line) index = i;
    });
    return index;
  }

  private readonly schedule = (): void => {
    if (this.scheduled) return;
    this.scheduled = true;
    requestAnimationFrame(() => {
      this.scheduled = false;
      this.update();
    });
  };

  private update(): void {
    const first = this.sections[0];
    if (!first || !this.prev || !this.next) return;
    // Shown once the first section has reached the reading line; before that the header is in view.
    this.hidden = this.top(first) > this.line();
    const index = this.currentIndex();
    setDisabled(this.prev, index < 0);
    setDisabled(this.next, index >= this.sections.length - 1);
  }

  private go(section: HTMLElement): void {
    this.pending = section;
    clearTimeout(this.pendingTimer);
    this.pendingTimer = window.setTimeout(this.settle, 1000); // for browsers without scrollend
    // The fragment handler (lib/fragments.ts) hears the hashchange, focuses the section, and clears it.
    location.hash = `#${section.id}`;
  }

  private readonly settle = (): void => {
    clearTimeout(this.pendingTimer);
    this.pending = null;
    this.schedule();
  };

  private readonly onPrev = (): void => {
    const index = this.currentIndex();
    const current = this.sections[index];
    if (index < 0 || !current) return;
    // Well into a section, Previous returns to its start; near the start, it goes to the one before.
    const wellInto = this.line() - this.top(current) > 160;
    const target = wellInto || index === 0 ? current : this.sections[index - 1];
    if (target) this.go(target);
  };

  private readonly onNext = (): void => {
    const target = this.sections[this.currentIndex() + 1];
    if (target) this.go(target);
  };
}

/** aria-disabled, not disabled: the control stays in the tab order and keeps its name. */
function setDisabled(button: HTMLButtonElement, disabled: boolean): void {
  if (disabled) button.setAttribute("aria-disabled", "true");
  else button.removeAttribute("aria-disabled");
}

if (!customElements.get("page-tools")) customElements.define("page-tools", PageTools);
