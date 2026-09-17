import { attachRoving, setRovingFocus } from "../lib/roving.ts";

/**
 * <tab-set>: APG tabs pattern with automatic activation, built on markup
 * that works without JavaScript.
 *
 * Authored HTML:
 *   <tab-set label="Carousel demo">
 *     <ul data-tabs><li><a href="#p1">Demo</a></li><li><a href="#p2">Notes</a></li></ul>
 *     <section id="p1"><h4>Demo</h4>…</section>
 *     <section id="p2"><h4>Notes</h4>…</section>
 *   </tab-set>
 *
 * Without JavaScript that is a list of in-page links and stacked sections
 * with headings. With it, the list becomes role="tablist" of real
 * <button role="tab">s (one tab stop, arrow keys move and select, Home/End
 * jump), sections become focusable tabpanels labelled by their tab, the
 * now-redundant panel headings are removed, and a matching URL hash opens
 * that panel on load.
 */
export class TabSet extends HTMLElement {
  private tabs: HTMLButtonElement[] = [];
  private panels: HTMLElement[] = [];
  private detachRoving: (() => void) | undefined;

  connectedCallback(): void {
    const list = this.querySelector<HTMLElement>("[data-tabs]");
    if (!list || this.tabs.length > 0) return;

    const links = [...list.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
    const panels = links
      .map((a) => this.querySelector<HTMLElement>(`#${CSS.escape(a.hash.slice(1))}`))
      .filter((p): p is HTMLElement => p !== null);
    if (panels.length !== links.length || panels.length === 0) return;

    const tablist = document.createElement("div");
    tablist.setAttribute("role", "tablist");
    tablist.className = list.className || "tabs-list";
    tablist.setAttribute("aria-label", this.getAttribute("label") ?? "Tabs");

    this.tabs = links.map((a, i) => {
      const panel = panels[i] as HTMLElement;
      const tab = document.createElement("button");
      tab.type = "button";
      tab.setAttribute("role", "tab");
      tab.id = `${panel.id}-tab`;
      tab.setAttribute("aria-controls", panel.id);
      tab.textContent = a.textContent;
      tab.className = "tab";
      tab.addEventListener("click", () => this.activate(i, true));
      tablist.append(tab);

      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
      panel.tabIndex = 0;
      panel.classList.add("tab-panel");
      // The tab now names the panel; a visible heading saying the same thing is noise.
      panel.querySelector(":scope > [data-panel-heading]")?.remove();
      return tab;
    });
    this.panels = panels;

    list.replaceWith(tablist);
    this.detachRoving = attachRoving(tablist, () => this.tabs, { onMove: (i) => this.activate(i, false) });

    const fromHash = panels.findIndex((p) => p.id === decodeURIComponent(location.hash.slice(1)));
    this.activate(fromHash === -1 ? 0 : fromHash, false);
  }

  disconnectedCallback(): void {
    this.detachRoving?.();
  }

  /** Select a tab and show its panel. Focus moves to the tab only for pointer/click activation. */
  activate(index: number, focusTab: boolean): void {
    this.tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      const panel = this.panels[i];
      if (panel) panel.hidden = !selected;
    });
    setRovingFocus(this.tabs, index, focusTab);
    this.dispatchEvent(new CustomEvent("tabchange", { detail: { index }, bubbles: true }));
  }

  get selectedIndex(): number {
    return this.tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
  }
}

if (!customElements.get("tab-set")) customElements.define("tab-set", TabSet);
