import { describe, expect, it } from "vitest";
import { nextIndex } from "../lib/roving.ts";
import "../components/tab-set.ts";
import "../components/carousel-slider.ts";

const key = (el: Element, k: string): boolean =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));

describe("roving nextIndex", () => {
  it("moves, wraps, and jumps; ignores other keys", () => {
    expect(nextIndex("ArrowRight", 0, 3)).toBe(1);
    expect(nextIndex("ArrowRight", 2, 3)).toBe(0);
    expect(nextIndex("ArrowLeft", 0, 3)).toBe(2);
    expect(nextIndex("Home", 2, 3)).toBe(0);
    expect(nextIndex("End", 0, 3)).toBe(2);
    expect(nextIndex("ArrowDown", 0, 3)).toBeNull();
    expect(nextIndex("a", 0, 3)).toBeNull();
  });
});

describe("<tab-set>", () => {
  function mount(): void {
    document.body.innerHTML = `
      <tab-set label="Demo tabs">
        <ul data-tabs>
          <li><a href="#p-one">One</a></li>
          <li><a href="#p-two">Two</a></li>
          <li><a href="#p-three">Three</a></li>
        </ul>
        <section id="p-one"><h4 data-panel-heading>One</h4><p>First</p></section>
        <section id="p-two"><h4 data-panel-heading>Two</h4><p>Second</p></section>
        <section id="p-three"><h4 data-panel-heading>Three</h4><p>Third</p></section>
      </tab-set>`;
  }
  const tabs = (): HTMLButtonElement[] => [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role="tabpanel"]')];

  it("upgrades links to a labelled tablist of buttons wired to focusable panels", () => {
    mount();
    const list = document.querySelector('[role="tablist"]')!;
    expect(list.getAttribute("aria-label")).toBe("Demo tabs");
    expect(document.querySelector("ul[data-tabs]")).toBeNull();
    expect(tabs().map((t) => t.textContent)).toEqual(["One", "Two", "Three"]);
    expect(tabs().every((t) => t.type === "button")).toBe(true);
    tabs().forEach((t, i) => {
      const panel = panels()[i]!;
      expect(t.getAttribute("aria-controls")).toBe(panel.id);
      expect(panel.getAttribute("aria-labelledby")).toBe(t.id);
      expect(panel.tabIndex).toBe(0);
    });
    // Redundant panel headings are gone; the tab names the panel now.
    expect(document.querySelector("[data-panel-heading]")).toBeNull();
  });

  it("starts on the first tab: selected, in the tab order, only its panel shown", () => {
    mount();
    expect(tabs().map((t) => t.getAttribute("aria-selected"))).toEqual(["true", "false", "false"]);
    expect(tabs().map((t) => t.tabIndex)).toEqual([0, -1, -1]);
    expect(panels().map((p) => p.hidden)).toEqual([false, true, true]);
  });

  it("arrow keys move focus and select automatically; Home/End jump; wraps", () => {
    mount();
    tabs()[0]!.focus();
    key(tabs()[0]!, "ArrowRight");
    expect(document.activeElement).toBe(tabs()[1]);
    expect(tabs()[1]!.getAttribute("aria-selected")).toBe("true");
    expect(panels().map((p) => p.hidden)).toEqual([true, false, true]);

    key(tabs()[1]!, "End");
    expect(document.activeElement).toBe(tabs()[2]);
    expect(panels()[2]!.hidden).toBe(false);

    key(tabs()[2]!, "ArrowRight");
    expect(document.activeElement).toBe(tabs()[0]);
    expect(tabs().map((t) => t.tabIndex)).toEqual([0, -1, -1]);
  });

  it("click activates and a matching hash opens that panel on load", () => {
    mount();
    tabs()[2]!.click();
    expect(panels().map((p) => p.hidden)).toEqual([true, true, false]);

    location.hash = "#p-two";
    mount();
    expect(tabs()[1]!.getAttribute("aria-selected")).toBe("true");
    expect(panels()[1]!.hidden).toBe(false);
    location.hash = "";
  });
});

describe("<carousel-slider>", () => {
  function mount(n = 4): HTMLElement {
    document.body.innerHTML = `
      <carousel-slider id="demo" label="Demo carousel">
        <div data-track>
          ${Array.from({ length: n }, (_, i) => `<section data-slide><h4>Slide ${i + 1}</h4><p>Body ${i + 1}</p></section>`).join("")}
        </div>
      </carousel-slider>`;
    return document.querySelector("carousel-slider")!;
  }
  const slides = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>("[data-slide]")];
  const dots = (): HTMLButtonElement[] => [...document.querySelectorAll<HTMLButtonElement>('.carousel-picker [role="tab"]')];
  const byName = (name: string): HTMLButtonElement => document.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;

  it("exposes the APG tabbed-carousel roles and names", () => {
    const el = mount();
    expect(el.getAttribute("role")).toBe("group");
    expect(el.getAttribute("aria-roledescription")).toBe("carousel");
    expect(el.getAttribute("aria-label")).toBe("Demo carousel");
    expect(document.querySelector("[data-track]")!.getAttribute("aria-live")).toBe("polite");
    slides().forEach((s, i) => {
      expect(s.getAttribute("role")).toBe("tabpanel");
      expect(s.getAttribute("aria-roledescription")).toBe("slide");
      expect(s.getAttribute("aria-label")).toBe(`${i + 1} of 4`);
      expect(dots()[i]!.getAttribute("aria-controls")).toBe(s.id);
    });
    expect(document.querySelector(".carousel-picker")!.getAttribute("aria-label")).toBe("Choose a slide");
    expect(document.querySelector(".carousel-counter")!.getAttribute("aria-hidden")).toBe("true");
  });

  it("shows exactly one slide and hides the rest with the hidden attribute", () => {
    mount();
    expect(slides().map((s) => s.hidden)).toEqual([false, true, true, true]);
    expect(document.querySelector(".carousel-counter")!.textContent).toBe("1 of 4");
  });

  it("Previous and Next wrap, keep focus where it is, and update the picker", () => {
    mount();
    const prev = byName("Previous slide");
    const next = byName("Next slide");
    prev.focus();
    prev.click();
    expect(slides().map((s) => s.hidden)).toEqual([true, true, true, false]);
    expect(document.activeElement).toBe(prev);
    expect(dots().map((d) => d.getAttribute("aria-selected"))).toEqual(["false", "false", "false", "true"]);
    next.click();
    expect(slides()[0]!.hidden).toBe(false);
    expect(document.querySelector(".carousel-counter")!.textContent).toBe("1 of 4");
  });

  it("Left/Right on Previous or Next also move slides", () => {
    mount();
    const next = byName("Next slide");
    next.focus();
    key(next, "ArrowRight");
    expect(slides()[1]!.hidden).toBe(false);
    key(byName("Previous slide"), "ArrowLeft");
    expect(slides()[0]!.hidden).toBe(false);
    expect(document.activeElement).toBe(next);
  });

  it("the picker is a roving tablist: arrows move and select, click focuses", () => {
    mount();
    expect(dots().map((d) => d.tabIndex)).toEqual([0, -1, -1, -1]);
    dots()[0]!.focus();
    key(dots()[0]!, "ArrowLeft");
    expect(document.activeElement).toBe(dots()[3]);
    expect(slides()[3]!.hidden).toBe(false);
    dots()[1]!.click();
    expect(document.activeElement).toBe(dots()[1]);
    expect(slides()[1]!.hidden).toBe(false);
    expect(dots().map((d) => d.tabIndex)).toEqual([-1, 0, -1, -1]);
  });

  it("does not auto-rotate", async () => {
    mount();
    await new Promise((r) => setTimeout(r, 30));
    expect(slides()[0]!.hidden).toBe(false);
    expect(document.querySelectorAll("[data-autoplay], [aria-label*='Pause'], [aria-label*='pause']")).toHaveLength(0);
  });
});
