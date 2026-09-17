#!/usr/bin/env node
/**
 * Compiles tokens/tokens.json into src/styles/tokens.css. Runs directly under
 * Node 24 (native type stripping); there is no build step for the build step.
 *
 * Two jobs:
 *  1. Emit CSS custom properties: global tokens on :root, one theme block per
 *     entry under `theme`. Light is the default; dark is exposed as
 *     [data-theme="dark"] and via prefers-color-scheme when no theme is set;
 *     high contrast as [data-theme="high-contrast"].
 *  2. Enforce contrast. Any color token that declares `$contrastAgainst` is
 *     checked against each named sibling with the WCAG 2.x formula. If a
 *     pair falls below `$minRatio`, the build exits non-zero and nothing is
 *     written. A low-contrast theme is a build error, not a review comment.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { contrastHex } from "../src/lib/contrast.ts";

interface TokenLeaf {
  value: string;
  $contrastAgainst?: string[];
  $minRatio?: number;
  $note?: string;
}
interface TokenGroup {
  [key: string]: TokenLeaf | TokenGroup | string | undefined;
}
interface ThemeDef {
  $description?: string;
  color: Record<string, TokenLeaf>;
}
interface TokenFile extends TokenGroup {
  theme: { light: ThemeDef; dark: ThemeDef; highContrast: ThemeDef } & TokenGroup;
}

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../tokens/tokens.json");
const out = resolve(here, "../src/styles/tokens.css");

const tokens = JSON.parse(readFileSync(src, "utf8")) as TokenFile;

const kebab = (s: string): string => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const isLeaf = (v: unknown): v is TokenLeaf =>
  typeof v === "object" && v !== null && "value" in v && typeof (v as TokenLeaf).value === "string";

function walk(node: TokenGroup, path: string[], into: string[]): void {
  for (const [key, val] of Object.entries(node)) {
    if (key.startsWith("$") || val === undefined || typeof val === "string") continue;
    if (isLeaf(val)) into.push(`  --${[...path, key].map(kebab).join("-")}: ${val.value};`);
    else walk(val, [...path, key], into);
  }
}

const globals: string[] = [];
for (const [group, node] of Object.entries(tokens)) {
  if (group.startsWith("$") || group === "theme" || typeof node !== "object" || node === undefined) continue;
  walk(node as TokenGroup, [group], globals);
}

const failures: string[] = [];
let pairsChecked = 0;

function themeBlock(name: string, theme: ThemeDef): string[] {
  const lines: string[] = [];
  for (const [key, def] of Object.entries(theme.color)) {
    if (key.startsWith("$")) continue;
    lines.push(`  --color-${kebab(key)}: ${def.value};`);
    for (const other of def.$contrastAgainst ?? []) {
      const against = theme.color[other];
      if (!against) {
        failures.push(`${name}: ${key} names unknown sibling "${other}"`);
        continue;
      }
      const ratio = contrastHex(def.value, against.value);
      const min = def.$minRatio ?? 4.5;
      pairsChecked += 1;
      if (ratio < min) {
        failures.push(
          `${name}: ${key} (${def.value}) on ${other} (${against.value}) = ${ratio.toFixed(2)}:1, needs ${min}:1`,
        );
      }
    }
  }
  return lines;
}

const light = themeBlock("light", tokens.theme.light);
const dark = themeBlock("dark", tokens.theme.dark);
const hc = themeBlock("high-contrast", tokens.theme.highContrast);

if (failures.length > 0) {
  console.error(`\nContrast check failed:\n  ${failures.join("\n  ")}\n`);
  process.exit(1);
}

const indent = (l: string): string => `  ${l}`;
const css = [
  "/* GENERATED FILE. Edit tokens/tokens.json and run `npm run tokens`. */",
  ":root {",
  "  color-scheme: light dark;",
  ...globals,
  ...light,
  "}",
  "",
  "/* Dark: automatic when the OS asks for it and no explicit theme is set. */",
  "@media (prefers-color-scheme: dark) {",
  "  :root:not([data-theme]) {",
  ...dark.map(indent),
  "  }",
  "}",
  '[data-theme="dark"] {',
  ...dark,
  "}",
  "",
  '[data-theme="high-contrast"] {',
  ...hc,
  "  --size-border: var(--size-border-strong);",
  "}",
  "",
  "/* Motion: reduced-motion users get instant transitions everywhere. */",
  "@media (prefers-reduced-motion: reduce) {",
  "  :root {",
  "    --motion-duration-fast: 0ms;",
  "    --motion-duration-base: 0ms;",
  "  }",
  "}",
  "",
].join("\n");

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, css);
console.log(
  `tokens.css written (${globals.length} global, ${light.length} light, ${dark.length} dark, ${hc.length} high-contrast). ${pairsChecked} contrast pairs checked, all pass.`,
);
