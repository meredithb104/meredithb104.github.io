import pathlib
root = pathlib.Path(r"C:\Users\mered\Projects\Active\Frontend\meredithb104.github.io")
c = root / "src" / "styles" / "site.css"
s = c.read_text(encoding="utf-8")
n = 0
def rep(old, new):
    global s, n
    assert old in s, old[:70]
    s = s.replace(old, new); n += 1

# Header: gradient band on the bottom edge.
rep('''  .site-header {
    background: var(--color-bg-subtle);
    border-block-end: var(--size-border) solid var(--color-border-subtle);
    padding-block: var(--space-3);
''', '''  .site-header {
    position: relative;
    background: var(--color-bg-subtle);
    border-block-end: var(--size-border) solid var(--color-border-subtle);
    padding-block: var(--space-3);

    /* The brand band: the five palette stops, coral to peach. Decorative, so no contrast claim. */
    &::after {
      content: "";
      position: absolute;
      inset-inline: 0;
      inset-block-end: -1px;
      block-size: 5px;
      background: linear-gradient(
        90deg,
        var(--color-brand-1),
        var(--color-brand-2),
        var(--color-brand-3),
        var(--color-brand-4),
        var(--color-brand-5)
      );
      pointer-events: none;
    }

    @media (forced-colors: active) {
      &::after {
        background: CanvasText;
        block-size: 2px;
      }
    }
''')

# Sticky variant keeps its translucent background.
rep('''      min-block-size: var(--header-height);
      background: color-mix(in srgb, var(--color-bg-subtle) 92%, transparent);
      backdrop-filter: blur(8px);
    }
  }''', '''      min-block-size: var(--header-height);
      background: color-mix(in srgb, var(--color-bg-subtle) 94%, transparent);
      backdrop-filter: blur(8px);
    }
  }''')

# Monogram: coral tile, ink letters (set in the SVG), no extra color rule.
rep('''    .brand-mark {
      inline-size: 2rem;
      block-size: 2rem;
      flex: none;
      color: var(--color-primary);
    }

    &:hover {
      color: var(--color-primary);
    }

    @media (forced-colors: active) {
      .brand-mark {
        forced-color-adjust: none;
        color: CanvasText;
      }
    }''', '''    /* The tile is brand stop 1 and the letters are ink: 6.3:1, where white would be 2.6:1. */
    .brand-mark {
      inline-size: 2rem;
      block-size: 2rem;
      flex: none;
      color: var(--color-brand-1);
    }

    &:hover {
      color: var(--color-primary);
    }

    @media (forced-colors: active) {
      .brand-mark {
        forced-color-adjust: none;
        color: CanvasText;
      }
    }''')

# Hero facts separator dots and eyebrow stay accent (text). Card rules become brand stops.
rep('''  .credential {
    padding: var(--space-5);
    background: var(--color-surface);
    border: var(--size-border) solid var(--color-border-subtle);
    border-block-start: 4px solid var(--color-accent);
    border-radius: var(--radius-lg);''', '''  .credential {
    padding: var(--space-5);
    background: var(--color-surface);
    border: var(--size-border) solid var(--color-border-subtle);
    /* Decorative rule in brand stop 2; it is not a control boundary, so 1.4.11 does not apply. */
    border-block-start: 4px solid var(--color-brand-2);
    border-radius: var(--radius-lg);''')
rep('''  .callout {
    padding: var(--space-4) var(--space-5);
    border-inline-start: 4px solid var(--color-accent);
    background: var(--color-accent-bg);''', '''  .callout {
    padding: var(--space-4) var(--space-5);
    border-inline-start: 4px solid var(--color-brand-1);
    background: var(--color-accent-bg);''')
rep('''  .carousel-slide {
    padding: var(--space-5);
    background: var(--color-bg-subtle);
    border: var(--size-border) solid var(--color-border-subtle);
    border-inline-start: 4px solid var(--color-accent);''', '''  .carousel-slide {
    padding: var(--space-5);
    background: var(--color-bg-subtle);
    border: var(--size-border) solid var(--color-border-subtle);
    border-inline-start: 4px solid var(--color-brand-2);''')
rep('''  .post-item {
    display: grid;
    gap: var(--space-1);
    padding-inline-start: var(--space-5);
    border-inline-start: 3px solid var(--color-border-subtle);''', '''  .post-item {
    display: grid;
    gap: var(--space-1);
    padding-inline-start: var(--space-5);
    border-inline-start: 3px solid var(--color-brand-4);''')
rep('''    li {
      display: grid;
      gap: var(--space-1);
      padding-inline-start: var(--space-5);
      border-inline-start: 3px solid var(--color-border-subtle);
      max-inline-size: none;
    }

    h3 {
      font-size: var(--font-size-lg);
    }
  }

  .timeline-when {''', '''    li {
      display: grid;
      gap: var(--space-1);
      padding-inline-start: var(--space-5);
      border-inline-start: 3px solid var(--color-brand-4);
      max-inline-size: none;
    }

    h3 {
      font-size: var(--font-size-lg);
    }
  }

  .timeline-when {''')
rep('''    blockquote {
      margin: 0;
      padding-inline-start: var(--space-4);
      border-inline-start: 4px solid var(--color-accent);''', '''    blockquote {
      margin: 0;
      padding-inline-start: var(--space-4);
      border-inline-start: 4px solid var(--color-brand-2);''')

# Principles counter numbers: keep accent (text).

# Pass / Fail: icon + word + color.
rep('''    .pass,
    .fail {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: 0.05em var(--space-2);
      border-radius: var(--radius-sm);
      font-weight: var(--font-weight-medium);
    }
    .pass {
      color: var(--color-success);
      background: var(--color-success-bg);
    }
    .fail {
      color: var(--color-error);
      background: var(--color-error-bg);
    }''', '''    .pass,
    .fail {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: 0.05em var(--space-2);
      border-radius: var(--radius-sm);
      font-weight: var(--font-weight-medium);

      /* Icon, word, and color together: state is never color alone (1.4.1). */
      &::before {
        content: "";
        inline-size: 1em;
        block-size: 1em;
        background: currentColor;
        mask: var(--icon) center / contain no-repeat;
      }
    }
    .pass {
      --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3 8.5l3 3 7-7' fill='none' stroke='black' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      color: var(--color-success);
      background: var(--color-success-bg);
    }
    .fail {
      --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 4l8 8M12 4l-8 8' fill='none' stroke='black' stroke-width='2.2' stroke-linecap='round'/%3E%3C/svg%3E");
      color: var(--color-error);
      background: var(--color-error-bg);
    }''')

# Field error message: icon + text.
rep('''    .error {
      color: var(--color-error);
      font-size: var(--font-size-sm);

      &:empty {
        display: none;
      }
    }''', '''    .error {
      display: flex;
      align-items: flex-start;
      gap: var(--space-1);
      color: var(--color-error);
      font-size: var(--font-size-sm);

      &::before {
        content: "";
        flex: none;
        inline-size: 1.1em;
        block-size: 1.1em;
        margin-block-start: 0.15em;
        background: currentColor;
        mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='6.5' fill='none' stroke='black' stroke-width='1.8'/%3E%3Cpath d='M8 4.5v4.2M8 11.2v.3' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") center / contain no-repeat;
      }

      &:empty {
        display: none;
      }
    }''')

# Table-scroll and prose left rules: leave.
c.write_text(s, encoding="utf-8", newline="\n")

# Monogram letters: ink, in all three shells.
MONO_OLD = 'fill="var(--color-on-primary)">MB</text>'
MONO_NEW = 'fill="var(--color-text)">MB</text>'
for name in ["index.html", "accessibility.html", "scripts/posts-lib.ts"]:
    p = root / name
    t = p.read_text(encoding="utf-8")
    assert MONO_OLD in t, name
    t = t.replace(MONO_OLD, MONO_NEW)
    t = t.replace('<meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)" />', '<meta name="theme-color" content="#FFF7F2" media="(prefers-color-scheme: light)" />')
    t = t.replace('<meta name="theme-color" content="#0F1419" media="(prefers-color-scheme: dark)" />', '<meta name="theme-color" content="#1E1512" media="(prefers-color-scheme: dark)" />')
    p.write_text(t, encoding="utf-8", newline="\n")

fav = root / "public" / "favicon.svg"
f = fav.read_text(encoding="utf-8")
f = f.replace('fill="#0B4F8A"', 'fill="#F08080"').replace('fill="#FFFFFF">MB</text>', 'fill="#2B1D1A">MB</text>')
fav.write_text(f, encoding="utf-8", newline="\n")

# Docs.
acc = root / "accessibility.html"
t = acc.read_text(encoding="utf-8")
old = "Three themes (light, dark, and high contrast) compiled from one token file; the build fails if any text/background pair drops below its required ratio."
assert old in t
t = t.replace(old, "Three themes (light, dark, and high contrast) compiled from one token file; the build fails if any text/background pair drops below its required ratio. The coral brand colors appear only as surfaces, rules, and the monogram; text is always a dark ink at 7:1 or better, and the focus ring is a navy chosen so it can never blend with the coral.")
acc.write_text(t, encoding="utf-8", newline="\n")

rd = root / "README.md"
t = rd.read_text(encoding="utf-8")
old = "The build computes 81 pairs across three themes with the WCAG 2.x formula and exits non-zero if one fails."
assert old in t
t = t.replace(old, "The build computes 81 pairs across three themes with the WCAG 2.x formula and exits non-zero if one fails. Five `brand` stops (a coral-to-peach palette) declare no contrast target because they are never used as text.")
rd.write_text(t, encoding="utf-8", newline="\n")
print("css edits:", n)
