import { announce } from "commons-ui/element";

/**
 * <work-filter>: toggle buttons that filter a list of project cards by tag.
 *
 * Buttons carry aria-pressed (a toggle, not a tab: nothing here is a panel).
 * Filtering uses the `hidden` attribute so hidden cards leave the
 * accessibility tree and the tab order together. The count is written to a
 * visible status line that is also a live region, so sighted and
 * screen-reader users get the same information at the same moment.
 *
 * Without JavaScript the buttons are absent from the HTML (they are only
 * meaningful with it) and every card is shown.
 */
export class WorkFilter extends HTMLElement {
  connectedCallback(): void {
    this.addEventListener("click", this.onClick);
    this.renderButtons();
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this.onClick);
  }

  private cards(): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>("[data-tags]")];
  }

  private renderButtons(): void {
    const host = this.querySelector<HTMLElement>("[data-filters]");
    if (!host) return;
    const tags = new Set<string>();
    for (const card of this.cards()) {
      for (const t of (card.dataset["tags"] ?? "").split(/\s+/).filter(Boolean)) tags.add(t);
    }
    // Chip order: the host's data-order lists tags in the order to show them; any tag it leaves
    // out follows alphabetically. Without data-order the whole set is alphabetical.
    const preferred = (host.dataset["order"] ?? "").split(/\s+/).filter((t) => tags.has(t));
    const rest = [...tags].filter((t) => !preferred.includes(t)).toSorted((a, b) => a.localeCompare(b));
    const all = ["all", ...preferred, ...rest];
    host.innerHTML = all
      .map(
        (tag) =>
          `<button type="button" class="chip" data-filter="${tag}" aria-pressed="${tag === "all" ? "true" : "false"}">${
            tag === "all" ? "All" : tag.replaceAll("-", " ")
          }</button>`,
      )
      .join("");
  }

  private readonly onClick = (event: Event): void => {
    const button = (event.target as Element).closest<HTMLButtonElement>("button[data-filter]");
    if (!button || !this.contains(button)) return;
    this.apply(button.dataset["filter"] ?? "all");
  };

  apply(filter: string): void {
    for (const b of this.querySelectorAll<HTMLButtonElement>("button[data-filter]")) {
      b.setAttribute("aria-pressed", b.dataset["filter"] === filter ? "true" : "false");
    }
    let shown = 0;
    const cards = this.cards();
    for (const card of cards) {
      const tags = (card.dataset["tags"] ?? "").split(/\s+/);
      const visible = filter === "all" || tags.includes(filter);
      card.hidden = !visible;
      if (visible) shown += 1;
    }
    const status = this.querySelector<HTMLElement>("[data-status]");
    const label = filter === "all" ? "all projects" : `projects tagged ${filter.replaceAll("-", " ")}`;
    const text = `Showing ${shown} of ${cards.length}: ${label}.`;
    if (status) status.textContent = text;
    else announce(text);
  }
}

if (!customElements.get("work-filter")) customElements.define("work-filter", WorkFilter);
