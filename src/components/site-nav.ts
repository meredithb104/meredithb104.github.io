/**
 * <site-nav>: enhancements to a plain <nav><ul> of links, with two menu
 * buttons from Commons UI (<cui-menu-button>, the library's MenuButton as a
 * framework-free custom element).
 *
 * 1. On narrow screens the list collapses behind the "Menu" button. Without
 *    JavaScript the custom element renders nothing and the full list simply
 *    shows. The button owns its own manners (aria-expanded, aria-controls,
 *    Escape closing and returning focus, a pointer down outside closing);
 *    this element listens for its cui-open-change event, shows the panel,
 *    and adds what only the page knows: choosing a link closes, and focus
 *    leaving the panel closes it, so an open panel never sits on top of
 *    something else that has focus (2.4.11). CSS decides when the collapse
 *    applies (the [data-collapsible] attribute plus a width query), so
 *    resizing never leaves the menu stuck closed.
 *
 * 2. On wide screens six of the sections sit behind a second button, "More
 *    information", the same component in its quiet variant, with the same
 *    wiring; inside the phone panel CSS hides that button and the six links
 *    show flat, so the panel is one list of ten.
 *
 * 3. Gives whichever list is a popup the menu roles the button promises
 *    (aria-haspopup="menu"): role="menu" on the list, "presentation" on its
 *    items, "menuitem" on the links. JAWS hands Up/Down/Home/End to the page
 *    only inside a widget it recognises, so without these roles the arrow
 *    keys the button supports never arrive. Which list is the popup depends
 *    on the layout: below 72em the whole ten-row list is the phone menu and
 *    the nested More list is a group inside it; from 72em the top four are
 *    plain links on the bar and only the More list is a menu. A matchMedia on
 *    the same breakpoint the CSS uses keeps the roles honest on resize, and
 *    without JavaScript the lists stay the plain lists the HTML declares.
 *
 * 4. Marks the in-page link for the section currently in view with
 *    aria-current="location" (underline as well as color). Uses
 *    IntersectionObserver, so nothing runs on scroll.
 */
import type { CuiMenuButton } from "commons-ui/element";

export class SiteNav extends HTMLElement {
  private observer: IntersectionObserver | undefined;
  private readonly visible = new Map<string, number>();
  private list: HTMLElement | undefined;
  private menu: CuiMenuButton | null = null;
  private more: CuiMenuButton | null = null;
  private moreItem: HTMLElement | null = null;

  connectedCallback(): void {
    const nav = this.querySelector("nav");
    const list = nav?.querySelector("ul");
    if (!nav || !list) return;
    this.list = list;
    this.addEventListener("focusout", this.onFocusOut);
    this.setupMenu(list);
    this.setupMore();
    this.setupRoles();
    this.setupCurrentSection();
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    this.removeEventListener("focusout", this.onFocusOut);
    this.wide?.removeEventListener("change", this.applyRoles);
  }

  /** The CSS breakpoint at which the full nav shows on one row and only More is a popup. */
  private static readonly WIDE = "(min-width: 72em)";
  private wide: MediaQueryList | null = null;

  private setupRoles(): void {
    if (!this.menu || typeof window.matchMedia !== "function") return; // no popup, or no layout (jsdom)
    this.wide = window.matchMedia(SiteNav.WIDE);
    this.wide.addEventListener("change", this.applyRoles);
    this.applyRoles();
  }

  private readonly applyRoles = (): void => {
    const list = this.list;
    const moreList = this.moreItem?.querySelector<HTMLElement>("ul.nav-more-list") ?? null;
    if (!list) return;
    const wide = this.wide?.matches ?? true;
    // items=true: menu roles; items=false: back to the plain list the HTML declares.
    const setRoles = (ul: HTMLElement, role: "menu" | "group" | "list", items: boolean): void => {
      ul.setAttribute("role", role);
      for (const li of ul.querySelectorAll(":scope > li")) {
        if (items) li.setAttribute("role", "presentation");
        else li.removeAttribute("role");
      }
      for (const a of ul.querySelectorAll(":scope > li > a")) {
        if (items) a.setAttribute("role", "menuitem");
        else a.removeAttribute("role");
      }
    };
    if (wide) {
      // The bar is a list of links; the More list is the one popup.
      setRoles(list, "list", false);
      if (moreList) setRoles(moreList, "menu", true);
    } else {
      // The whole list is the phone menu; the More list is a group of six inside it.
      setRoles(list, "menu", true);
      if (moreList) setRoles(moreList, "group", true);
    }
  };

  /** The phone Menu button: the element is in the HTML; wire it to the list. */
  private setupMenu(list: HTMLElement): void {
    const menu = this.querySelector<CuiMenuButton>("cui-menu-button.nav-toggle");
    if (!menu) return;
    list.id ||= "site-nav-list";
    menu.setAttribute("controls", list.id);
    this.menu = menu;
    this.dataset["collapsible"] = "true";
    menu.addEventListener("cui-open-change", (e) => this.setOpen(e.detail.open));
    this.setOpen(false);
    list.addEventListener("click", (e) => {
      if ((e.target as Element).closest("a")) this.setOpen(false);
    });
  }

  isOpen(): boolean {
    return this.dataset["open"] === "true";
  }

  setOpen(open: boolean): void {
    this.dataset["open"] = open ? "true" : "false";
    if (this.menu) this.menu.open = open;
  }

  /** The "More information" button: the same element, quiet variant, wired to its own list. */
  private setupMore(): void {
    const item = this.querySelector<HTMLElement>("li.nav-more-item");
    const more = item?.querySelector<CuiMenuButton>("cui-menu-button");
    const list = item?.querySelector<HTMLElement>("ul.nav-more-list");
    if (!item || !more || !list) return;
    list.id ||= "nav-more-list";
    more.setAttribute("controls", list.id);
    this.moreItem = item;
    this.more = more;
    item.dataset["more"] = "true"; // CSS: the list is a panel shown only while open, on wide screens
    more.addEventListener("cui-open-change", (e) => this.setMoreOpen(e.detail.open));
    this.setMoreOpen(false);
    list.addEventListener("click", (e) => {
      if ((e.target as Element).closest("a")) this.setMoreOpen(false);
    });
  }

  isMoreOpen(): boolean {
    return this.moreItem?.dataset["open"] === "true";
  }

  setMoreOpen(open: boolean): void {
    if (!this.moreItem || !this.more) return;
    this.moreItem.dataset["open"] = open ? "true" : "false";
    this.more.open = open;
  }

  /** Focus moved outside a panel (Tab past its last link): close it without stealing focus. */
  private readonly onFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget;
    if (this.isOpen() && (!(next instanceof Node) || !this.contains(next))) this.setOpen(false);
    if (this.isMoreOpen() && (!(next instanceof Node) || !this.moreItem?.contains(next))) this.setMoreOpen(false);
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
