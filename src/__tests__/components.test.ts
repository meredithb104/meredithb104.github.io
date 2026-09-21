import { describe, expect, it, vi } from "vitest";
import "commons-ui/element";
import "../components/theme-picker.ts";
import "../components/font-picker.ts";
import "../components/contrast-checker.ts";
import "../components/work-filter.ts";

// The setup file clears <body> after each test; Commons UI's announce() re-creates its
// <cui-live-region> on demand, so the polite region is looked up fresh each time.
function liveText(): string {
  return document.querySelector('cui-live-region [aria-live="polite"]')?.textContent ?? "";
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

  it("writes the choice to <html data-theme>, persists it, and does not also announce it", async () => {
    // The focused radio's own name and state are the announcement; a live-region line on top is noise.
    vi.useFakeTimers();
    const [, , dark] = mount();
    dark!.checked = true;
    dark!.dispatchEvent(new Event("change", { bubbles: true }));

    expect(document.documentElement.dataset["theme"]).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    vi.advanceTimersByTime(100);
    expect(liveText()).toBe("");
    vi.useRealTimers();
  });

  it("moves DOM focus to the chosen radio when a change arrives while focus is elsewhere", () => {
    document.body.innerHTML = `<section id="lab" tabindex="-1"></section>`;
    const section = document.getElementById("lab")!;
    const inputs = mount();
    document.body.prepend(section);
    section.focus();
    expect(document.activeElement).toBe(section);
    const dark = inputs[2]!;
    dark.checked = true;
    dark.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.activeElement).toBe(dark);
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

  it("orders the toggles as data-order says, then the rest alphabetically", () => {
    document.body.innerHTML = `
      <work-filter>
        <div data-filters data-order="testing front-end no-such-tag"></div>
        <p data-status role="status"></p>
        <ul>
          <li data-tags="front-end testing"><h3>A</h3></li>
          <li data-tags="back-end"><h3>B</h3></li>
        </ul>
      </work-filter>`;
    const buttons = [...document.querySelectorAll<HTMLButtonElement>("button[data-filter]")];
    expect(buttons.map((b) => b.dataset["filter"])).toEqual(["all", "testing", "front-end", "back-end"]);
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
  // The site's markup contract: a Commons UI <cui-text-field> and a native picker per colour.
  function mount(fg = "#1B1F24", bg = "#FFFFFF"): HTMLElement {
    document.body.innerHTML = `
      <contrast-checker>
        <form aria-label="Contrast checker">
          <div class="color-pair">
            <cui-text-field data-role="fg-hex" field-id="fg" label="Text color" hint="Hex, like #1B1F24" value="${fg}"></cui-text-field>
            <input type="color" data-role="fg-picker" value="${fg.toLowerCase()}" aria-label="Pick text color">
          </div>
          <div class="color-pair">
            <cui-text-field data-role="bg-hex" field-id="bg" label="Background color" hint="Hex, like #FFFFFF" value="${bg}"></cui-text-field>
            <input type="color" data-role="bg-picker" value="${bg.toLowerCase()}" aria-label="Pick background color">
          </div>
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
    expect(fg.getAttribute("aria-invalid")).toBeNull(); // the field only marks invalid while it has an error
  });

  it("marks invalid hex with aria-invalid and a text error, and does not announce", async () => {
    vi.useFakeTimers();
    mount();
    const bg = document.querySelector<HTMLInputElement>("#bg")!;
    bg.value = "not a color";
    bg.dispatchEvent(new Event("input", { bubbles: true }));

    expect(bg.getAttribute("aria-invalid")).toBe("true");
    expect(bg.getAttribute("aria-describedby")).toBe("bg-hint bg-error");
    expect(document.querySelector("#bg-error")!.textContent).toMatch(/^Error: .*hex color/i);
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
          <label><input type="radio" name="font" value="public-sans" checked> Public Sans</label>
          <label><input type="radio" name="font" value="atkinson"> Atkinson Hyperlegible Next</label>
          <label><input type="radio" name="font" value="system"> System</label>
        </fieldset>
      </font-picker>`;
    return [...document.querySelectorAll<HTMLInputElement>("input")];
  }

  it("writes the choice to <html data-font>, persists it, and the default (Public Sans) clears both", () => {
    const [publicSans, atkinson, system] = mount();
    atkinson!.checked = true;
    atkinson!.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.documentElement.dataset["font"]).toBe("atkinson");
    expect(localStorage.getItem("font")).toBe("atkinson");
    system!.checked = true;
    system!.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.documentElement.dataset["font"]).toBe("system");
    publicSans!.checked = true;
    publicSans!.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.documentElement.dataset["font"]).toBeUndefined();
    expect(localStorage.getItem("font")).toBeNull();
    delete document.documentElement.dataset["font"];
  });

  it("restores a saved choice and ignores garbage", () => {
    localStorage.setItem("font", "atkinson");
    expect(mount().find((i) => i.checked)?.value).toBe("atkinson");
    localStorage.setItem("font", "comic");
    expect(mount().find((i) => i.checked)?.value).toBe("public-sans");
  });
});

describe("settleHash", () => {
  it("removes a fragment without navigating, and is a no-op without one", async () => {
    const { settleHash } = await import("../lib/settle-hash.ts");
    history.replaceState(null, "", "/page?q=1#lab");
    settleHash();
    expect(location.hash).toBe("");
    expect(location.pathname + location.search).toBe("/page?q=1");
    settleHash();
    expect(location.pathname + location.search).toBe("/page?q=1");
    history.replaceState(null, "", "/");
  });

  it("theme change clears a leftover fragment before restyling", () => {
    history.replaceState(null, "", "/#lab");
    document.body.innerHTML = `<theme-picker><input type="radio" name="theme" value="dark"></theme-picker>`;
    const dark = document.querySelector<HTMLInputElement>("input")!;
    dark.checked = true;
    dark.dispatchEvent(new Event("change", { bubbles: true }));
    expect(location.hash).toBe("");
    expect(document.documentElement.dataset["theme"]).toBe("dark");
    delete document.documentElement.dataset["theme"];
    history.replaceState(null, "", "/");
  });
});
