/**
 * WCAG 2.x contrast math. Shared by the token build (Node) and the live
 * contrast checker on the page (browser), so both agree to the decimal.
 * No dependencies, no DOM.
 */

export type Rgb = readonly [r: number, g: number, b: number];

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Parse "#RGB" or "#RRGGBB" (hash optional). Returns null for anything else. */
export function parseHex(input: string): Rgb | null {
  const m = HEX.exec(input.trim());
  if (!m) return null;
  let h = m[1] ?? "";
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = Number.parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Normalise any accepted hex to "#rrggbb" lower-case, or null. */
export function normalizeHex(input: string): string | null {
  const rgb = parseHex(input);
  if (!rgb) return null;
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** One sRGB channel (0-255) to linear light. */
function linearize(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance per WCAG 2.x. */
export function relativeLuminance([r, g, b]: Rgb): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** Contrast ratio between two colors, 1 to 21. Order does not matter. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Convenience: contrast of two hex strings. Throws on a bad hex so build failures are loud. */
export function contrastHex(a: string, b: string): number {
  const ra = parseHex(a);
  const rb = parseHex(b);
  if (!ra || !rb) throw new Error(`Not a hex color: ${ra ? b : a}`);
  return contrastRatio(ra, rb);
}

export const WCAG_THRESHOLDS = {
  /** 1.4.3 Contrast (Minimum): normal text. */
  aaText: 4.5,
  /** 1.4.3: large text (24px, or 18.66px bold). Also 1.4.11 Non-text Contrast for UI parts. */
  aaLargeText: 3,
  /** 1.4.6 Contrast (Enhanced). */
  aaaText: 7,
  aaaLargeText: 4.5,
} as const;

export interface ContrastVerdict {
  ratio: number;
  aaText: boolean;
  aaLargeText: boolean;
  aaaText: boolean;
  aaaLargeText: boolean;
  nonText: boolean;
}

/** Evaluate a ratio against every WCAG threshold at once. */
export function judge(ratio: number): ContrastVerdict {
  return {
    ratio,
    aaText: ratio >= WCAG_THRESHOLDS.aaText,
    aaLargeText: ratio >= WCAG_THRESHOLDS.aaLargeText,
    aaaText: ratio >= WCAG_THRESHOLDS.aaaText,
    aaaLargeText: ratio >= WCAG_THRESHOLDS.aaaLargeText,
    nonText: ratio >= WCAG_THRESHOLDS.aaLargeText,
  };
}

/** Format like the WCAG spec does: "4.54:1". Truncated, never rounded up past a threshold. */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;
}
