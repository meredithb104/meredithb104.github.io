import { announce } from "../lib/announce.ts";

/**
 * <font-picker>: same shape as <theme-picker>. A native radio group chooses
 * the body typeface; the choice is written to <html data-font>, persisted,
 * and read back before first paint by the inline script in each page's
 * head. Public Sans is the default and is preloaded; Atkinson Hyperlegible
 * Next is fetched only when chosen; System uses no web font at all.
 */

export type Font = "public-sans" | "system" | "atkinson";

export const FONT_STORAGE_KEY = "font";
const FONTS: ReadonlySet<string> = new Set(["system", "atkinson", "public-sans"]);

export function isFont(value: unknown): value is Font {
  return typeof value === "string" && FONTS.has(value);
}

export function readStoredFont(): Font {
  try {
    const stored = localStorage.getItem(FONT_STORAGE_KEY);
    return isFont(stored) ? stored : "public-sans";
  } catch {
    return "public-sans";
  }
}

export function applyFont(font: Font): void {
  const root = document.documentElement;
  if (font === "public-sans") delete root.dataset["font"];
  else root.dataset["font"] = font;
  try {
    if (font === "public-sans") localStorage.removeItem(FONT_STORAGE_KEY);
    else localStorage.setItem(FONT_STORAGE_KEY, font);
  } catch {
    /* storage unavailable: the choice still applies to this page view */
  }
}

export class FontPicker extends HTMLElement {
  connectedCallback(): void {
    const current = readStoredFont();
    for (const input of this.querySelectorAll<HTMLInputElement>('input[type="radio"]')) input.checked = input.value === current;
    this.addEventListener("change", this.onChange);
  }

  disconnectedCallback(): void {
    this.removeEventListener("change", this.onChange);
  }

  private readonly onChange = (event: Event): void => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !isFont(input.value)) return;
    applyFont(input.value);
    if (document.activeElement !== input) input.focus({ preventScroll: true }); // see theme-picker
    announce(`Typeface: ${input.labels?.[0]?.textContent?.trim() ?? input.value}`);
  };
}

if (!customElements.get("font-picker")) customElements.define("font-picker", FontPicker);
