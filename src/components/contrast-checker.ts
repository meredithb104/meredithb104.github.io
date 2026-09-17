import { announce } from "../lib/announce.ts";
import { contrastRatio, formatRatio, judge, normalizeHex, parseHex, type ContrastVerdict } from "../lib/contrast.ts";

/**
 * <contrast-checker>: the same WCAG math the token build runs, live.
 *
 * Markup contract (see index.html): two pairs of inputs, a text field and a
 * native color picker for each of foreground and background, wired by
 * data-role. Results render as text in a table, and the whole verdict is
 * summarised to a polite live region, debounced so typing a hex does not
 * produce a word per keystroke.
 *
 * Every pass/fail is a word, not just a color. Invalid input marks the text
 * field aria-invalid and points aria-describedby at the error (WCAG 3.3.1).
 */

const ROWS: ReadonlyArray<{ key: keyof Omit<ContrastVerdict, "ratio">; label: string; needs: string }> = [
  { key: "aaText", label: "Normal text, AA (1.4.3)", needs: "4.5:1" },
  { key: "aaLargeText", label: "Large text, AA (1.4.3)", needs: "3:1" },
  { key: "nonText", label: "UI components and graphics, AA (1.4.11)", needs: "3:1" },
  { key: "aaaText", label: "Normal text, AAA (1.4.6)", needs: "7:1" },
  { key: "aaaLargeText", label: "Large text, AAA (1.4.6)", needs: "4.5:1" },
];

export class ContrastChecker extends HTMLElement {
  private debounce: number | undefined;

  connectedCallback(): void {
    this.addEventListener("input", this.onInput);
    this.addEventListener("submit", this.onSubmit);
    this.render(false);
  }

  disconnectedCallback(): void {
    this.removeEventListener("input", this.onInput);
    this.removeEventListener("submit", this.onSubmit);
    if (this.debounce !== undefined) window.clearTimeout(this.debounce);
  }

  private field(role: string): HTMLInputElement | null {
    return this.querySelector<HTMLInputElement>(`[data-role="${role}"]`);
  }

  /** Enter in a field should re-check, never reload the page. */
  private readonly onSubmit = (event: Event): void => {
    event.preventDefault();
    this.render(true);
  };

  private readonly onInput = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const role = target.dataset["role"];
    if (!role) return;

    // Keep the picker and the text box in sync in both directions.
    const [which, kind] = role.split("-") as [string, string];
    const twin = this.field(`${which}-${kind === "hex" ? "picker" : "hex"}`);
    const normalized = normalizeHex(target.value);
    if (twin && normalized) twin.value = normalized;

    this.render(true);
  };

  private validate(which: "fg" | "bg"): string | null {
    const hex = this.field(`${which}-hex`);
    const error = this.querySelector<HTMLElement>(`[data-error="${which}"]`);
    if (!hex) return null;
    const value = normalizeHex(hex.value);
    const invalid = value === null;
    hex.setAttribute("aria-invalid", invalid ? "true" : "false");
    if (error) {
      error.textContent = invalid ? "Enter a hex color like #1B1F24 or #FFF." : "";
    }
    return value;
  }

  private render(fromUser: boolean): void {
    const fg = this.validate("fg");
    const bg = this.validate("bg");
    const out = this.querySelector<HTMLElement>("[data-result]");
    const swatch = this.querySelector<HTMLElement>("[data-swatch]");
    if (!out) return;

    if (!fg || !bg) {
      out.innerHTML = `<p class="muted">Enter two valid hex colors to see the ratio.</p>`;
      return;
    }

    const fgRgb = parseHex(fg);
    const bgRgb = parseHex(bg);
    if (!fgRgb || !bgRgb) return;
    const ratio = contrastRatio(fgRgb, bgRgb);
    const verdict = judge(ratio);
    const pretty = formatRatio(ratio);

    if (swatch) {
      swatch.style.setProperty("--swatch-fg", fg);
      swatch.style.setProperty("--swatch-bg", bg);
    }

    const rows = ROWS.map(
      (r) => `<tr>
        <th scope="row">${r.label}</th>
        <td>${r.needs}</td>
        <td>${verdict[r.key] ? `<span class="pass">Pass</span>` : `<span class="fail">Fail</span>`}</td>
      </tr>`,
    ).join("");

    out.innerHTML = `
      <p class="ratio"><span class="visually-hidden">Contrast ratio </span>${pretty}</p>
      <table>
        <caption class="visually-hidden">WCAG 2.2 results for ${fg} on ${bg}</caption>
        <thead><tr><th scope="col">Use</th><th scope="col">Needs</th><th scope="col">Result</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    if (!fromUser) return;
    if (this.debounce !== undefined) window.clearTimeout(this.debounce);
    this.debounce = window.setTimeout(() => {
      const passes = ROWS.filter((r) => verdict[r.key]).length;
      announce(`${pretty}. Passes ${passes} of ${ROWS.length} checks.`);
    }, 600);
  }
}

if (!customElements.get("contrast-checker")) customElements.define("contrast-checker", ContrastChecker);
