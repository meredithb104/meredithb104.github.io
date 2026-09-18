import { beforeAll, describe, expect, it, vi } from "vitest";
import { mountLiveRegions } from "../lib/announce.ts";
import "../components/theme-picker.ts";
import "../components/font-picker.ts";
import "../components/contrast-checker.ts";
import "../components/work-filter.ts";

// The setup file clears <body> after each test; the announcer re-mounts its regions on demand.
beforeAll(() => {
  mountLiveRegions();
});

function liveText(): string {
  return document.querySelector('[data-live-region="polite"]')?.textContent ?? "";
}

describe("<theme-picker>", () => {
  function mount(): HTMLInputElement[] {
    document.body.innerHTML = `
      <theme-picker>
        <fieldset><legend>Choose a theme</legend>
          <label><input type="radio" name="theme" value="auto" checked> Match system</label>
          <label><input type="radio" name="theme" value="light"> Light</label>
          <label><input type="radio" name="theme" value="dark"> Dark</label>
          <label><input type="radio" name="theme" value="high-contrast"> High contrast</label>
        </fieldset>
      </theme-picker>`;
    return [...document.querySelectorAll<HTMLInputElement>("input")];
  }

  it("writes the choice to <html data-theme>, persists it, and announces it", async () => {
    vi.useFakeTimers();
    const [, , dark] = mount();
    dark!.checked = true;
    dark!.dispatchEvent(new Event("change", { bubbles: true }));

    expect(document.documentElement.dataset["theme"]).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    vi.advanceTimersByTime(100);
    expect(liveText()).toBe("Theme: Dark");
    vi.useRealTimers();
  });

  it("'auto' removes the attribute and the stored value", () => {
    localStorage.setItem("theme", "light");
    document.documentElement.dataset["theme"] = "light";
    const [auto] = mount();
    auto!.checked = true;
    auto!.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.documentElement.dataset["theme"]).toBeUndefined();
    expect(localStorage.getItem("theme")).toBeNull();
  });

  it("restores a saved theme into the radio group on connect", () => {
    localStorage.setItem("theme", "high-contrast");
    const inputs = mount();
    expect(inputs.find((i) => i.checked)?.value).toBe("high-contrast");
  });

  it("ignores garbage in storage", () => {
    localStorage.setItem("theme", "neon");
    const inputs = mount();
    expect(inputs.find((i) => i.checked)?.value).toBe("auto");
  });
});

describe("<work-filter>", () => {
  function mount(): HTMLElement {
    document.body.innerHTML = `
      <work-filter>
        <div data-filters role="group" aria-label="Filter projects"></div>
        <p data-status role="status"></p>
        <ul>
          <li data-tags="front-end testing"><h3>A</h3></li>
          <li data-tags="back-end"><h3>B</h3></li>
          <li data-tags="front-end"><h3>C</h3></li>
        </ul>
      </work-filter>`;
    return document.querySelector("work-filter")!;
  }

  it("builds one toggle per tag plus All, with All pressed", () => {
    mount();
    const buttons = [...document.querySelectorAll<HTMLButtonElement>("button[data-filter]")];
    expect(buttons.map((b) => b.dataset["filter"])).toEqual(["all", "back-end", "front-end", "testing"]);
    expect(buttons.map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "false", "false", "false"]);
    expect(buttons.every((b) => b.type === "button")).toBe(true);
  });

  it("hides non-matching cards with the hidden attribute and reports the count in the status line", () => {
    mount();
    const frontEnd = document.querySelector<HTMLButtonElement>('button[data-filter="front-end"]')!;
    frontEnd.click();

    const cards = [...document.querySelectorAll<HTMLElement>("[data-tags]")];
    expect(cards.map((c) => c.hidden)).toEqual([false, true, false]);
    expect(frontEnd.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector('button[data-filter="all"]')!.getAttribute("aria-pressed")).toBe("false");
    expect(document.querySelector("[data-status]")!.textContent).toBe("Showing 2 of 3: projects tagged front end.");
  });

  it("All restores every card", () => {
    mount();
    document.querySelector<HTMLButtonElement>('button[data-filter="back-end"]')!.click();
    document.querySelector<HTMLButtonElement>('button[data-filter="all"]')!.click();
    expect([...document.querySelectorAll<HTMLElement>("[data-tags]")].every((c) => !c.hidden)).toBe(true);
    expect(document.querySelector("[data-status]")!.textContent).toBe("Showing 3 of 3: all projects.");
  });
});

describe("<contrast-checker>", () => {
  function mount(fg = "#1B1F24", bg = "#FFFFFF"): HTMLElement {
    document.body.innerHTML = `
      <contrast-checker>
        <form aria-label="Contrast checker">
          <label for="fg">Text color</label>
          <input type="text" id="fg" data-role="fg-hex" value="${fg}" aria-describedby="fg-error">
          <input type="color" data-role="fg-picker" value="${fg.toLowerCase()}" aria-label="Pick text color">
          <p id="fg-error" data-error="fg"></p>
          <label for="bg">Background color</label>
          <input type="text" id="bg" data-role="bg-hex" value="${bg}" aria-describedby="bg-error">
          <input type="color" data-role="bg-picker" value="${bg.toLowerCase()}" aria-label="Pick background color">
          <p id="bg-error" data-error="bg"></p>
        </form>
        <div data-swatch></div>
        <div data-result></div>
      </contrast-checker>`;
    return document.querySelector("contrast-checker")!;
  }

  it("renders the ratio and a table of Pass/Fail words on connect", () => {
    mount();
    const result = document.querySelector("[data-result]")!;
    expect(result.querySelector(".ratio")!.textContent).toContain("16.");
    const cells = [...result.querySelectorAll("tbody td:last-child")].map((td) => td.textContent?.trim());
    expect(cells).toEqual(["Pass", "Pass", "Pass", "Pass", "Pass"]);
    expect(result.querySelector("caption")!.textContent).toContain("#1b1f24 on #ffffff");
  });

  it("fails the right rows for a mid-grey and keeps the picker in sync with typed hex", () => {
    mount();
    const fg = document.querySelector<HTMLInputElement>("#fg")!;
    fg.value = "#777";
    fg.dispatchEvent(new Event("input", { bubbles: true }));

    const cells = [...document.querySelectorAll("tbody td:last-child")].map((td) => td.textContent?.trim());
    // 4.47:1 -> fails AA normal text and AAA, passes large text and non-text.
    expect(cells).toEqual(["Fail", "Pass", "Pass", "Fail", "Fail"]);
    expect(document.querySelector<HTMLInputElement>('[data-role="fg-picker"]')!.value).toBe("#777777");
    expect(fg.getAttribute("aria-invalid")).toBe("false");
  });

  it("marks invalid hex with aria-invalid and a text error, and does not announce", async () => {
    vi.useFakeTimers();
    mount();
    const bg = document.querySelector<HTMLInputElement>("#bg")!;
    bg.value = "not a color";
    bg.dispatchEvent(new Event("input", { bubbles: true }));

    expect(bg.getAttribute("aria-invalid")).toBe("true");
    expect(document.querySelector("#bg-error")!.textContent).toMatch(/hex color/i);
    expect(document.querySelector("[data-result]")!.textContent).toMatch(/two valid hex colors/);
    vi.advanceTimersByTime(1000);
    expect(liveText()).toBe("");
    vi.useRealTimers();
  });

  it("announces one debounced summary after typing stops", () => {
    vi.useFakeTimers();
    mount();
    const fg = document.querySelector<HTMLInputElement>("#fg")!;
    for (const v of ["#7", "#77", "#777"]) {
      fg.value = v;
      fg.dispatchEvent(new Event("input", { bubbles: true }));
      vi.advanceTimersByTime(100);
    }
    expect(liveText()).toBe("");
    vi.advanceTimersByTime(700);
    expect(liveText()).toBe("4.47:1. Passes 2 of 5 checks.");
    vi.useRealTimers();
  });

  it("never lets Enter submit the form", () => {
    mount();
    const form = document.querySelector("form")!;
    const event = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("<font-picker>", () => {
  function mount(): HTMLInputElement[] {
    document.body.innerHTML = `
      <font-picker>
        <fieldset><legend>Choose a typeface</legend>
          <label><input type="radio" name="font" value="system" checked> System</label>
          <label><input type="radio" name="font" value="atkinson"> Atkinson Hyperlegible Next</label>
          <label><input type="radio" name="font" value="public-sans"> Public Sans</label>
        </fieldset>
      </font-picker>`;
    return [...document.querySelectorAll<HTMLInputElement>("input")];
  }

  it("writes the choice to <html data-font>, persists it, and 'system' clears both", () => {
    const [system, atkinson] = mount();
    atkinson!.checked = true;
    atkinson!.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.documentElement.dataset["font"]).toBe("atkinson");
    expect(localStorage.getItem("font")).toBe("atkinson");
    system!.checked = true;
    system!.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.documentElement.dataset["font"]).toBeUndefined();
    expect(localStorage.getItem("font")).toBeNull();
    delete document.documentElement.dataset["font"];
  });

  it("restores a saved choice and ignores garbage", () => {
    localStorage.setItem("font", "public-sans");
    expect(mount().find((i) => i.checked)?.value).toBe("public-sans");
    localStorage.setItem("font", "comic");
    expect(mount().find((i) => i.checked)?.value).toBe("system");
  });
});
