# meredithb104.github.io

**Portfolio of Meredith Boyce, accessibility engineer and front-end developer.** Live at **https://meredithb104.github.io/**

Static HTML, hand-written CSS, and a few kilobytes of TypeScript. No framework runtime. Built to WCAG 2.2 AA, with contrast enforced at build time and axe-core run in a real browser on every push.

The site is the portfolio piece: the source is meant to be read. It is the sibling of [Commons UI](https://github.com/meredithb104/commons-ui), my React component library, and shares its token pipeline and testing philosophy, minus React.

## What's in it

| Piece | Where | What it shows |
| --- | --- | --- |
| Design tokens with contrast enforcement | [`tokens/tokens.json`](tokens/tokens.json), [`scripts/build-tokens.ts`](scripts/build-tokens.ts) | Any color token can declare what it sits on and the ratio it needs. The build computes 81 pairs across three themes with the WCAG 2.x formula and exits non-zero if one fails. Six `brand` stops (powder petal, ivory, light cyan, baby blue ice, Prussian blue, and a pink) declare no contrast target because they are never used as text; the pink is deepened to `accent` where it is. Runs directly under Node 24 with native type stripping; no build step for the build step. |
| Shared contrast math | [`src/lib/contrast.ts`](src/lib/contrast.ts) | One module used by the Node build and the browser, tested against published WCAG reference values. Ratios are truncated, never rounded up past a threshold. |
| Six light-DOM custom elements | [`src/components/`](src/components/) | `<theme-picker>`, `<contrast-checker>`, `<work-filter>`, `<site-nav>` (current-section marking and the phone-width Menu disclosure), `<tab-set>`, `<carousel-slider>`. Each enhances HTML that already works; none uses shadow DOM, so tokens and the focus ring apply everywhere. |
| APG tabs and a tabbed carousel | [`tab-set.ts`](src/components/tab-set.ts), [`carousel-slider.ts`](src/components/carousel-slider.ts), [`roving.ts`](src/lib/roving.ts) | Tabs with automatic activation upgraded from a list of links. A carousel that never auto-rotates: focus stays on Previous/Next and a polite live region announces only "Slide 3 of 12: heading" (a live region around the whole track was far too chatty in JAWS), the slide picker is a roving tablist, hidden slides leave the tree and the tab order. The "How it's built" tab on the site explains the focus decision and where the pattern stops applying. |
| Live-region announcer | [`src/lib/announce.ts`](src/lib/announce.ts) | Polite and assertive regions mounted empty at startup, re-mounted if detached, cleared before each message so repeats are announced. |
| Modern CSS, no preprocessor | [`src/styles/`](src/styles/) | Cascade layers, nesting, container queries (the case-study columns respond to their own width, not the viewport), `:has()`, logical properties, `color-mix()`, `forced-colors`, `prefers-reduced-motion`. |
| Architecture diagrams as inline SVG | [`index.html`](index.html) | `role="img"` with `<title>` and `<desc>`, styled from tokens, remapped to system colors under forced colors, and captioned in prose. Each has a wide and a stacked drawing; CSS renders one at a time so there is always exactly one accessible image. |
| Posts from Markdown | [`writing/`](writing/), [`scripts/build-posts.ts`](scripts/build-posts.ts), [`scripts/posts-lib.ts`](scripts/posts-lib.ts) | One Markdown file per post becomes a static page at `/posts/<slug>/`, an archive at `/posts/`, an Atom feed, and the newest three on the landing page. The build refuses a post with an image lacking alt text, a skipped heading level, an `h1` in the body, or bad front matter. `writing/README.md` has the format. |
| Accessibility statement | [`accessibility.html`](accessibility.html) | Conformance claim, test method, known limitations, how to report a problem. |
| Case studies | [`index.html`](index.html) | Architecture and process for two private TypeScript applications (a Slack app and a Discord bot), written from the code without publishing it. |

## Run it

```bash
npm install
npm run dev          # compiles tokens and posts, starts Vite on :5173; saving a post in writing/ rebuilds and reloads
npm run posts        # rebuilds posts/, public/feed.xml, and the Writing block in index.html
npm test             # tokens + Vitest (unit, component, jsdom axe)
npm run test:e2e     # production build + Playwright: axe in Chromium, keyboard walk, reflow
npm run check        # lint + typecheck + both test suites
npm run build        # tokens -> typecheck -> Vite build into dist/
```

Playwright needs a browser once: `npx playwright install chromium`.

## How it is tested

Every push runs, in order, and deploys only if all of it passes:

1. **Token build.** 81 contrast pairs. A failing pair is a failed build, not a warning.
   **Posts build.** Every Markdown post is validated: alt text on every image, no skipped heading levels, one `h1`, complete front matter.
2. **Vitest** (jsdom): contrast math against WCAG reference values; keyboard and state behavior of each custom element; an axe pass over the real source HTML of both pages, plus structural checks (one `h1`, skip link first, every nav target focusable, every diagram titled, described, and captioned).
3. **Playwright** (Chromium, against the production build): axe-core with the WCAG 2.0/2.1/2.2 A and AA rule sets and best practices, on both pages in all four theme states and after driving the tabs and carousel; keyboard tests for the tablist, the slide picker, and Previous/Next; a full keyboard walk asserting every focusable element is reachable, scrolled into view, and not obscured by the sticky header; reflow at 320 px and at a 200% zoom equivalent; the WCAG 1.4.12 text-spacing override; reduced motion; 24 px minimum target size; and rendered contrast at phone width: the focus ring against the color it actually borders for every focusable kind, and every control's text and boundary in default, hover, pressed, and selected states.

axe finds roughly a third of accessibility problems. The rest is in the tests that describe behavior (where focus went, what was announced) and in using the site with a screen reader, which I do.

## Performance

The whole site is one HTML document per page, one CSS file, and one JavaScript module (about 12 kB, 4 kB gzipped). No web fonts, no analytics, no third-party requests. The theme is applied by a two-line inline script before first paint, so there is no flash. Section highlighting uses `IntersectionObserver`, so nothing runs on scroll.

## Structure

```
index.html, accessibility.html   the pages; complete without JavaScript
writing/*.md                     posts, one file each; see writing/README.md
posts/, public/feed.xml          generated from writing/ (git-ignored)
tokens/tokens.json               design tokens, source of truth
scripts/build-tokens.ts          tokens -> src/styles/tokens.css, with contrast enforcement
scripts/build-posts.ts           writing/*.md -> posts/, feed.xml, landing-page block (posts-lib.ts holds the rules)
src/lib/                         contrast math, live-region announcer
src/components/                  custom elements (light DOM, progressive enhancement)
src/styles/                      base.css (layers, reset, focus), site.css (layout, components)
src/__tests__/                   Vitest
e2e/                             Playwright
.github/workflows/ci.yml         test, build, deploy to GitHub Pages
```

## License

MIT for the code. The words and the case studies are mine; please don't pass them off as yours.
