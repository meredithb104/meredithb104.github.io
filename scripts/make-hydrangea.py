"""Generate a small decorative hydrangea as inline SVG in the palette, and place two on the home page."""
import math, pathlib, random

root = pathlib.Path(r"C:\Users\mered\Projects\Active\Frontend\meredithb104.github.io")
rng = random.Random(7)

def floret(cx, cy, s, tone, rot):
    # Four petals (ellipses) around a small centre; tones map to CSS classes so themes recolour them.
    return (f'<g class="hy-f hy-{tone}" transform="translate({cx:.1f} {cy:.1f}) rotate({rot}) scale({s:.2f})">'
            '<ellipse cx="0" cy="-7" rx="4.6" ry="6.4"/><ellipse cx="7" cy="0" rx="6.4" ry="4.6"/>'
            '<ellipse cx="0" cy="7" rx="4.6" ry="6.4"/><ellipse cx="-7" cy="0" rx="6.4" ry="4.6"/>'
            '<circle class="hy-c" cx="0" cy="0" r="2.1"/></g>')

def cluster(cx, cy, r, n):
    out = []
    pts = []
    tries = 0
    while len(pts) < n and tries < 4000:
        tries += 1
        a = rng.uniform(0, math.tau); d = r * math.sqrt(rng.uniform(0, 1))
        x, y = cx + d * math.cos(a), cy + d * math.sin(a) * 0.9
        if all(math.hypot(x - px, y - py) > 10.5 for px, py in pts):
            pts.append((x, y))
    # Back florets first (lighter), front florets last (deeper), so the blob has some depth.
    pts.sort(key=lambda p: math.hypot(p[0] - cx, p[1] - cy), reverse=True)
    for i, (x, y) in enumerate(pts):
        depth = math.hypot(x - cx, y - cy) / r
        tone = 1 if depth > 0.66 else (2 if depth > 0.33 else 3)
        s = rng.uniform(0.85, 1.15) * (0.95 if tone == 1 else 1.0)
        out.append(floret(x, y, s, tone, rng.randint(0, 45)))
    return "".join(out)

def leaf(cx, cy, rot, s):
    return (f'<g class="hy-leaf" transform="translate({cx} {cy}) rotate({rot}) scale({s})">'
            '<path d="M0 -34 C 18 -26, 22 -4, 0 34 C -22 -4, -18 -26, 0 -34 Z"/>'
            '<path class="hy-vein" d="M0 -30 L0 30 M0 -10 C 6 -8, 10 -4, 13 2 M0 2 C -6 4, -10 8, -13 14" fill="none"/></g>')

svg = ('<svg class="hydrangea" aria-hidden="true" focusable="false" viewBox="0 0 240 240" width="240" height="240">'
       + leaf(52, 178, -35, 1.05) + leaf(196, 74, 40, 0.95) + leaf(184, 190, 120, 0.8)
       + cluster(120, 122, 74, 60) + '</svg>')

html = root / "index.html"; s = html.read_text(encoding="utf-8")
# One in the hero's empty right-hand column (desktop), one in the Contact section.
old_hero = '      <section class="hero" aria-labelledby="hero-h">\n        <div>\n'
assert old_hero in s
s = s.replace(old_hero, '      <section class="hero" aria-labelledby="hero-h">\n        ' + svg.replace('class="hydrangea"', 'class="hydrangea hydrangea--hero"') + '\n        <div>\n', 1)
old_contact = '      <section id="contact" class="section flow" tabindex="-1" aria-labelledby="contact-h">\n        <h2 id="contact-h">Contact</h2>\n'
assert old_contact in s
s = s.replace(old_contact, '      <section id="contact" class="section flow" tabindex="-1" aria-labelledby="contact-h">\n        ' + svg.replace('class="hydrangea"', 'class="hydrangea hydrangea--contact"') + '\n        <h2 id="contact-h">Contact</h2>\n', 1)
html.write_text(s, encoding="utf-8", newline="\n")

css = root / "src/styles/site.css"; c = css.read_text(encoding="utf-8")
anchor = "  /* ---- Page tools: Previous, Next, Top ------------------------------ */"
assert anchor in c
block = '''  /* ---- Decorative hydrangeas ----------------------------------------- */
  /* Purely visual (aria-hidden, no name). Drawn in the palette's blues so they recolour with the
     theme; parked in space the text never uses, and gone at narrow widths, in print, and under
     forced colors. */
  .hydrangea {
    position: absolute;
    pointer-events: none;
    user-select: none;
    --hy-1: #c9d8f0; /* back florets: monaco blue lightened */
    --hy-2: #a9c1e8; /* monaco blue */
    --hy-3: #8aa8db; /* front florets: toward yearbook */
    --hy-centre: #3550b0;
    --hy-leaf: #d6dde8;
    --hy-vein: #b4c0d4;

    .hy-1 { fill: var(--hy-1); }
    .hy-2 { fill: var(--hy-2); }
    .hy-3 { fill: var(--hy-3); }
    .hy-f { fill-opacity: 0.92; }
    .hy-c { fill: var(--hy-centre); fill-opacity: 0.85; }
    .hy-leaf { fill: var(--hy-leaf); }
    .hy-vein { stroke: var(--hy-vein); stroke-width: 1.4; stroke-linecap: round; }

    @media (max-width: 63.99em), print, (forced-colors: active) {
      display: none;
    }
  }

  :root[data-theme="dark"] .hydrangea,
  :root:not([data-theme]) .hydrangea {
    @media (prefers-color-scheme: dark) {
      --hy-1: #6f86bb;
      --hy-2: #8ea9db;
      --hy-3: #a9c1e8;
      --hy-centre: #f4f1e8;
      --hy-leaf: #2c3f72;
      --hy-vein: #4e63a0;
    }
  }
  :root[data-theme="dark"] .hydrangea {
    --hy-1: #6f86bb;
    --hy-2: #8ea9db;
    --hy-3: #a9c1e8;
    --hy-centre: #f4f1e8;
    --hy-leaf: #2c3f72;
    --hy-vein: #4e63a0;
  }
  :root[data-theme="high-contrast"] .hydrangea {
    display: none;
  }

  .hero {
    position: relative;
  }
  .hydrangea--hero {
    inset-inline-end: 0;
    inset-block-start: var(--space-5);
    inline-size: clamp(12rem, 19vw, 16rem);
    block-size: auto;
  }
  #contact {
    position: relative;
  }
  .hydrangea--contact {
    inset-inline-end: var(--space-4);
    inset-block-end: var(--space-4);
    inline-size: 9rem;
    block-size: auto;
    transform: scaleX(-1);
  }

'''
c = c.replace(anchor, block + anchor, 1)
css.write_text(c, encoding="utf-8", newline="\n")
print("ok", len(svg))
