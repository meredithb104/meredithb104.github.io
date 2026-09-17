import { describe, expect, it } from "vitest";
import { contrastHex, formatRatio, judge, normalizeHex, parseHex, relativeLuminance } from "../lib/contrast.ts";

describe("parseHex", () => {
  it("accepts 3- and 6-digit forms with or without a hash", () => {
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
    expect(parseHex("FFF")).toEqual([255, 255, 255]);
    expect(parseHex("#1B1F24")).toEqual([27, 31, 36]);
    expect(parseHex("  #1b1f24  ")).toEqual([27, 31, 36]);
  });

  it("rejects anything else", () => {
    expect(parseHex("")).toBeNull();
    expect(parseHex("#12")).toBeNull();
    expect(parseHex("#12345")).toBeNull();
    expect(parseHex("red")).toBeNull();
    expect(parseHex("#GGGGGG")).toBeNull();
  });

  it("normalises to lower-case six digits", () => {
    expect(normalizeHex("FFF")).toBe("#ffffff");
    expect(normalizeHex("#1B1F24")).toBe("#1b1f24");
    expect(normalizeHex("nope")).toBeNull();
  });
});

describe("relative luminance and contrast (WCAG 2.x)", () => {
  it("matches the spec endpoints", () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 6);
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 6);
    expect(contrastHex("#000000", "#FFFFFF")).toBeCloseTo(21, 6);
    expect(contrastHex("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 6);
  });

  it("is symmetric", () => {
    expect(contrastHex("#0B4F8A", "#FFFFFF")).toBeCloseTo(contrastHex("#FFFFFF", "#0B4F8A"), 10);
  });

  it("agrees with widely published reference values", () => {
    // #767676 on white is the canonical "just passes AA" grey: 4.54:1.
    expect(contrastHex("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
    // #777777 on white is the canonical "just fails" grey.
    expect(contrastHex("#777777", "#FFFFFF")).toBeLessThan(4.5);
  });

  it("throws on invalid input so the token build fails loudly", () => {
    expect(() => contrastHex("#zzz", "#fff")).toThrow(/Not a hex color: #zzz/);
    expect(() => contrastHex("#fff", "")).toThrow(/Not a hex color/);
  });
});

describe("judge", () => {
  it("maps ratios to each WCAG threshold", () => {
    expect(judge(21)).toMatchObject({ aaText: true, aaLargeText: true, aaaText: true, aaaLargeText: true, nonText: true });
    expect(judge(4.5)).toMatchObject({ aaText: true, aaaText: false, aaaLargeText: true });
    expect(judge(3)).toMatchObject({ aaText: false, aaLargeText: true, nonText: true, aaaLargeText: false });
    expect(judge(2.9)).toMatchObject({ aaLargeText: false, nonText: false });
  });
});

describe("formatRatio", () => {
  it("truncates rather than rounds, so 4.499 never displays as a pass", () => {
    expect(formatRatio(4.499)).toBe("4.49:1");
    expect(formatRatio(4.5)).toBe("4.50:1");
    expect(formatRatio(21)).toBe("21.00:1");
  });
});
