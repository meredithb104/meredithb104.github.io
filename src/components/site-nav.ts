/**
 * <site-nav>: two enhancements to a plain <nav><ul> of links.
 *
 * 1. On narrow screens the list collapses behind a "Menu" button. The
 *    button is created by the script, so without JavaScript the full list
 *    simply shows. aria-expanded and aria-controls describe the state;
 *    Escape closes and returns focus to the button; choosing a link closes;
 *    a click outside or focus leaving the panel closes it, so the open panel
 *    can never sit on top of something else that has focus (2.4.11).
 *    CSS decides when it applies (the [data-collapsible] attribute plus a
 *    width query), so resizing never leaves the menu stuck closed.
 *
 * 2. Marks the in-page link for the section currently in view with
 *    aria-current="location" (underline as well as color). Uses
 *    IntersectionObserver, so nothing runs on scroll.
 *
 * 3. On wide screens six of the sections sit under a native <details>
 *    disclosure labelled "More". The element works without any script; the
 *    script adds what a menu-like disclosure should do: Escape closes it and
 *    returns focus to its summary, a click outside or focus leaving closes it,
 *    and inside the phone panel it stays open with its summary hidden, so the
 *    panel is one flat list.
 */
export class SiteNav extends HTMLElement {
  private observer: IntersectionObserver | undefined;
  private readonly visible = new Map<string, number>();
  private toggle: HTMLButtonElement | undefined;
  private list: HTMLElement | undefined;
  private more: HTMLDetailsElement | null = null;
  private readonly narrow = window.matchMedia("(max-width: 71.99em)");

  connectedCallback(): void {
    const nav = this.querySelector("nav");
    const list = nav?.querySelector("ul");
    if (!nav || !list) return;
    this.list = list;
    this.addEventListener("keydown", this.onKeydown);
    this.addEventListener("focusout", this.onFocusOut);
    document.addEventListener("pointerdown", this.onPointerDown);
    this.setupToggle(nav, list);
    this.setupMore();
    this.setupCurrentSection();
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    this.removeEventListener("keydown", this.onKeydown);
    this.removeEventListener("focusout", this.onFocusOut);
    document.removeEventListener("pointerdown", this.onPointerDown);
    this.narrow.removeEventListener("change", this.syncMore);
  }

  private setupMore(): void {
    this.more = this.querySelector<HTMLDetailsElement>("details.nav-more");
    if (!this.more) return;
    this.narrow.addEventListener("change", this.syncMore);
    this.syncMore();
    // Choosing a link closes the disclosure on wide screens (on narrow ones the whole panel closes).
    this.more.addEventListener("click", (e) => {
      if ((e.target as Element).closest("a") && !this.narrow.matches) this.more!.open = false;
    });
  }

  /** Narrow: the disclosure stays open inside the panel (CSS hides its summary). Wide: closed until asked. */
  private readonly syncMore = (): void => {
    if (this.more) this.more.open = this.narrow.matches;
  };

  private closeMore(focusSummary: boolean): void {
    if (!this.more || this.narrow.matches || !this.more.open) return;
    this.more.open = false;
    if (focusSummary) this.more.querySelector("summary")?.focus();
  }

  private setupToggle(nav: HTMLElement, list: HTMLElement): void {
    if (this.toggle) return;
    list.id ||= "site-nav-list";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav-toggle";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", list.id);
    button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 5h14M3 10h14M3 15h14"/></svg> Menu`;
    button.addEventListener("click", () => this.setOpen(!this.isOpen()));
    // Before the <nav>, not inside it, so the header grid can place the button beside the wordmark
    // and the list on its own row. The button still names the list through aria-controls.
    nav.before(button);
    this.toggle = button;
    this.dataset["collapsible"] = "true";
    list.addEventListener("click", (e) => {
      if ((e.target as Element).closest("a")) this.setOpen(false, false);
    });
  }

  isOpen(): boolean {
    return this.dataset["open"] === "true";
  }

  setOpen(open: boolean, focusToggle = false): void {
    this.dataset["open"] = open ? "true" : "false";
    this.toggle?.setAttribute("aria-expanded", open ? "true" : "false");
    if (focusToggle) this.toggle?.focus();
  }

  /** Focus moved outside the component (Tab past the last link, or a click elsewhere): close without stealing focus. */
  private readonly onFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget;
    if (this.isOpen() && (!(next instanceof Node) || !this.contains(next))) this.setOpen(false, false);
    if (this.more?.open && (!(next instanceof Node) || !this.more.contains(next))) this.closeMore(false);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.isOpen() && event.target instanceof Node && !this.contains(event.target)) this.setOpen(false, false);
    if (this.more?.open && event.target instanceof Node && !this.more.contains(event.target)) this.closeMore(false);
  };

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    if (this.more?.open && !this.narrow.matches && this.more.contains(event.target as Node)) {
      event.preventDefault();
      this.closeMore(true);
      return;
    }
    if (this.isOpen()) {
      event.preventDefault();
      this.setOpen(false, true);
    }
  };

  private setupCurrentSection(): void {
    if (!("IntersectionObserver" in window) || !this.list) return;
    const links = [...this.list.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
    const targets = links
      .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) this.visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        let best: string | undefined;
        let bestRatio = 0;
        for (const [id, ratio] of this.visible) {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }
        for (const a of links) {
          if (best !== undefined && a.hash === `#${best}`) a.setAttribute("aria-current", "location");
          else a.removeAttribute("aria-current");
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    for (const t of targets) this.observer.observe(t);
  }
}

if (!customElements.get("site-nav")) customElements.define("site-nav", SiteNav);
