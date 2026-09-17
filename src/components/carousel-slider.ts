import { announce } from "../lib/announce.ts";
import { attachRoving, setRovingFocus } from "../lib/roving.ts";

/**
 * <carousel-slider>: the APG "tabbed carousel" pattern. No auto-rotation,
 * ever: nothing on the page moves unless the visitor asks it to (WCAG 2.2.2
 * has nothing to pause because nothing starts by itself).
 *
 * Authored HTML:
 *   <carousel-slider label="Twelve mistakes">
 *     <div data-track>
 *       <section data-slide><h4>…</h4><p>…</p></section>
 *       …
 *     </div>
 *   </carousel-slider>
 *
 * Without JavaScript: every slide is visible, stacked. With it:
 *  - the element becomes role="group" aria-roledescription="carousel";
 *  - Previous/Next buttons and a slide picker are inserted; the picker is a
 *    tablist (one tab stop, arrow keys) and each slide a tabpanel with
 *    aria-roledescription="slide" and an "n of N" name, exactly as APG does;
 *  - non-current slides are `hidden`, so they leave the accessibility tree
 *    and the tab order together;
 *  - Previous/Next keep focus on the button, and one short line is sent to
 *    the shared polite live region: "Slide 3 of 12: Focus dropped on close"
 *    (position plus the slide's heading, never its body). A live region
 *    around the whole track read every paragraph on every press, which
 *    JAWS users found far too chatty;
 *  - Left/Right on Previous or Next also move slides.
 *
 * Focus deliberately stays on the button after Previous/Next: the slides are
 * not interactive, so moving focus onto one would put a ring on something
 * that does nothing and break a sighted keyboard user's flow. Slides with
 * interactive content would need a different pattern (focus to the slide's
 * first element); this component is scoped to non-interactive slides.
 *
 * Visible slide counter is aria-hidden: the slide's own name carries "n of N".
 */
export class CarouselSlider extends HTMLElement {
  private slides: HTMLElement[] = [];
  private pickers: HTMLButtonElement[] = [];
  private current = 0;
  private counter: HTMLElement | undefined;
  private detachRoving: (() => void) | undefined;

  connectedCallback(): void {
    const track = this.querySelector<HTMLElement>("[data-track]");
    if (!track || this.slides.length > 0) return;
    this.slides = [...track.querySelectorAll<HTMLElement>("[data-slide]")];
    if (this.slides.length === 0) return;

    const label = this.getAttribute("label") ?? "Carousel";
    const base = this.id || "carousel";
    this.id = base;
    this.setAttribute("role", "group");
    this.setAttribute("aria-roledescription", "carousel");
    this.setAttribute("aria-label", label);
    this.classList.add("carousel");

    track.classList.add("carousel-track");

    const controls = document.createElement("div");
    controls.className = "carousel-controls";

    const prev = this.button("Previous slide", "‹", "Previous");
    const next = this.button("Next slide", "›", "Next");
    prev.addEventListener("click", () => this.go(this.current - 1, false, true));
    next.addEventListener("click", () => this.go(this.current + 1, false, true));
    // Left/Right on either button also move, so it doesn't matter which one has focus.
    for (const b of [prev, next]) {
      b.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          this.go(this.current + (e.key === "ArrowRight" ? 1 : -1), false, true);
        }
      });
    }

    const picker = document.createElement("div");
    picker.className = "carousel-picker";
    picker.setAttribute("role", "tablist");
    picker.setAttribute("aria-label", "Choose a slide");

    this.pickers = this.slides.map((slide, i) => {
      slide.id ||= `${base}-slide-${i + 1}`;
      slide.setAttribute("role", "tabpanel");
      slide.setAttribute("aria-roledescription", "slide");
      slide.setAttribute("aria-label", `${i + 1} of ${this.slides.length}`);
      slide.classList.add("carousel-slide");

      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("role", "tab");
      dot.id = `${slide.id}-tab`;
      dot.setAttribute("aria-controls", slide.id);
      dot.setAttribute("aria-label", `Slide ${i + 1}`);
      dot.className = "carousel-dot";
      dot.addEventListener("click", () => this.go(i, true));
      picker.append(dot);
      return dot;
    });

    this.counter = document.createElement("p");
    this.counter.className = "carousel-counter";
    this.counter.setAttribute("aria-hidden", "true");

    controls.append(prev, picker, next, this.counter);
    track.before(controls);

    this.detachRoving = attachRoving(picker, () => this.pickers, { onMove: (i) => this.go(i, false) });
    this.go(0);
  }

  disconnectedCallback(): void {
    this.detachRoving?.();
  }

  private button(name: string, glyph: string, text: string): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "button button--secondary carousel-button";
    b.setAttribute("aria-label", name);
    b.innerHTML = `<span aria-hidden="true">${glyph}</span> ${text}`;
    return b;
  }

  /**
   * Show slide `index` (wrapping). Focus moves to the picker tab only for explicit picker
   * clicks. `announceChange` is true for Previous/Next, where focus stays put and the screen
   * reader would otherwise hear nothing; picker tabs already announce their own selection.
   */
  go(index: number, focusPicker = false, announceChange = false): void {
    const n = this.slides.length;
    this.current = ((index % n) + n) % n;
    this.slides.forEach((slide, i) => {
      slide.hidden = i !== this.current;
    });
    this.pickers.forEach((dot, i) => dot.setAttribute("aria-selected", i === this.current ? "true" : "false"));
    setRovingFocus(this.pickers, this.current, focusPicker);
    if (this.counter) this.counter.textContent = `${this.current + 1} of ${n}`;
    if (announceChange) {
      const heading = this.slides[this.current]?.querySelector("h1, h2, h3, h4, h5, h6")?.textContent?.trim();
      announce(`Slide ${this.current + 1} of ${n}${heading ? `: ${heading.replace(/^\d+\.\s*/, "")}` : ""}`);
    }
    this.dispatchEvent(new CustomEvent("slidechange", { detail: { index: this.current }, bubbles: true }));
  }

  get currentIndex(): number {
    return this.current;
  }
}

if (!customElements.get("carousel-slider")) customElements.define("carousel-slider", CarouselSlider);
