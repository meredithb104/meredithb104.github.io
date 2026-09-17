import { announce } from "../lib/announce.ts";

/**
 * <theme-picker>: progressively enhances a native radio group.
 *
 * The HTML works without JavaScript (the OS preference still applies via
 * prefers-color-scheme). With JavaScript, the choice is written to
 * <html data-theme>, persisted, and read back before first paint by the
 * inline script in index.html so there is no flash of the wrong theme.
 *
 * Native radios give us the whole APG radio-group pattern for free:
 * arrow keys, one tab stop, checked state exposed to assistive tech.
 */

export type Theme = "auto" | "light" | "dark" | "high-contrast";

export const THEME_STORAGE_KEY = "theme";
const THEMES: ReadonlySet<string> = new Set(["auto", "light", "dark", "high-contrast"]);

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && THEMES.has(value);
}

export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : "auto";
  } catch {
    return "auto";
  }
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "auto") delete root.dataset["theme"];
  else root.dataset["theme"] = theme;
  try {
    if (theme === "auto") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode or storage disabled: the theme still applies for this page view */
  }
}

export class ThemePicker extends HTMLElement {
  connectedCallback(): void {
    const current = readStoredTheme();
    for (const input of this.radios()) input.checked = input.value === current;
    this.addEventListener("change", this.onChange);
  }

  disconnectedCallback(): void {
    this.removeEventListener("change", this.onChange);
  }

  private radios(): HTMLInputElement[] {
    return [...this.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
  }

  private readonly onChange = (event: Event): void => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !isTheme(input.value)) return;
    applyTheme(input.value);
    const label = input.labels?.[0]?.textContent?.trim() ?? input.value;
    announce(`Theme: ${label}`);
  };
}

if (!customElements.get("theme-picker")) customElements.define("theme-picker", ThemePicker);
