import { announce, type CuiTextField } from "commons-ui/element";
import { contrastRatio, formatRatio, judge, normalizeHex, parseHex, type ContrastVerdict } from "../lib/contrast.ts";

/**
 * <contrast-checker>: the same WCAG math the token build runs, live.
 *
 * Markup contract (see index.html): two pairs of inputs, a Commons UI
 * <cui-text-field> and a native color picker for each of foreground and
 * background, wired by data-role on the field host and on the picker. Results
 * render as text in a table, and the whole verdict is summarised to a polite
 * live region, debounced so typing a hex does not produce a word per keystroke.
 *
 * Every pass/fail is a word, not just a color. Invalid input is handed to the
 * text field as its `error`, which marks it aria-invalid and chains the message
 * through aria-describedby (WCAG 3.3.1, 3.3.3).
 */

/** Inline, aria-hidden icons so every state is icon + word + color, and JAWS never reads a glyph. */
const ICON_PASS = `<svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3 3 7-7"/></svg>`;
const ICON_FAIL = `<svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>`;

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
    // When this element and its fields are parsed together, the parent's callback runs first;
    // upgrade the subtree now so the fields have rendered their inputs before the first check.
    customElements.upgrade(this);
    this.addEventListener("input", this.onInput);
    this.addEventListener("submit", this.onSubmit);
    this.render(false);
  }

  disconnectedCallback(): void {
    this.removeEventListener("input", this.onInput);
    this.removeEventListener("submit", this.onSubmit);
    if (this.debounce !== undefined) window.clearTimeout(this.debounce);
  }

  /** The hex fields are <cui-text-field>s; the pickers are plain inputs. Both carry data-role. */
  private hexField(which: "fg" | "bg"): CuiTextField | null {
    return this.querySelector<CuiTextField>(`cui-text-field[data-role="${which}-hex"]`);
  }

  private field(role: string): HTMLInputElement | null {
    if (role.endsWith("-hex")) return (this.hexField(role.slice(0, 2) as "fg" | "bg")?.input as HTMLInputElement | null) ?? null;
    return this.querySelector<HTMLInputElement>(`input[data-role="${role}"]`);
  }

  /** Enter in a field should re-check, never reload the page. */
  private readonly onSubmit = (event: Event): void => {
    event.preventDefault();
    this.render(true);
  };

  private readonly onInput = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const role = target.dataset["role"] ?? target.closest("cui-text-field")?.dataset["role"];
    if (!role) return;

    // Keep the picker and the text box in sync in both directions.
    const [which, kind] = role.split("-") as [string, string];
    const twin = this.field(`${which}-${kind === "hex" ? "picker" : "hex"}`);
    const normalized = normalizeHex(target.value);
    if (twin && normalized) twin.value = normalized;

    this.render(true);
  };

  private validate(which: "fg" | "bg"): string | null {
    const field = this.hexField(which);
    if (!field?.input) return null;
    const value = normalizeHex(field.value);
    const message = value === null ? "Enter a hex color like #1B1F24 or #FFF." : "";
    if (field.error !== message) field.error = message;
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
        <td>${verdict[r.key] ? `<span class="pass">${ICON_PASS}Pass</span>` : `<span class="fail">${ICON_FAIL}Fail</span>`}</td>
      </tr>`,
    ).join("");

    out.innerHTML = `
      <p class="ratio"><span class="cui-visually-hidden">Contrast ratio </span>${pretty}</p>
      <table>
        <caption class="cui-visually-hidden">WCAG 2.2 results for ${fg} on ${bg}</caption>
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
