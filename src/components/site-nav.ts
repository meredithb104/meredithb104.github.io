/**
 * <site-nav>: two enhancements to a plain <nav><ul> of links.
 *
 * 1. On narrow screens the list collapses behind a "Menu" button. The
 *    button is created by the script, so without JavaScript the full list
 *    simply shows. aria-expanded and aria-controls describe the state;
 *    Escape closes and returns focus to the button; choosing a link closes.
 *    CSS decides when it applies (the [data-collapsible] attribute plus a
 *    width query), so resizing never leaves the menu stuck closed.
 *
 * 2. Marks the in-page link for the section currently in view with
 *    aria-current="location" (underline as well as color). Uses
 *    IntersectionObserver, so nothing runs on scroll.
 */
export class SiteNav extends HTMLElement {
  private observer: IntersectionObserver | undefined;
  private readonly visible = new Map<string, number>();
  private toggle: HTMLButtonElement | undefined;
  private list: HTMLElement | undefined;

  connectedCallback(): void {
    const nav = this.querySelector("nav");
    const list = nav?.querySelector("ul");
    if (!nav || !list) return;
    this.list = list;
    this.setupToggle(nav, list);
    this.setupCurrentSection();
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    this.removeEventListener("keydown", this.onKeydown);
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
    this.addEventListener("keydown", this.onKeydown);
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

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.isOpen()) {
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
