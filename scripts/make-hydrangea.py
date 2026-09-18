"""Regenerate the decorative hydrangeas on the home page.

One bloom is drawn once as an SVG <symbol> in a sprite at the top of <body>; each placement is a
tiny <svg><use> that the stylesheet sizes, positions, mirrors, and recolours per theme through
custom properties (inherited into the <use> shadow tree, which is why fills are inline styles).
Purely decorative: aria-hidden, no name, pointer-events none, hidden at narrow widths, in print,
under forced colors, and in the high-contrast theme. Seeded, so the layout is stable.

  python scripts/make-hydrangea.py
"""
import math, pathlib, random, re

root = pathlib.Path(__file__).resolve().parent.parent
rng = random.Random(7)

def floret(cx, cy, s, tone, rot):
    return (f'<g style="fill:var(--hy-{tone});fill-opacity:.92" transform="translate({cx:.1f} {cy:.1f}) rotate({rot}) scale({s:.2f})">'
            '<ellipse cx="0" cy="-7" rx="4.6" ry="6.4"/><ellipse cx="7" cy="0" rx="6.4" ry="4.6"/>'
            '<ellipse cx="0" cy="7" rx="4.6" ry="6.4"/><ellipse cx="-7" cy="0" rx="6.4" ry="4.6"/>'
            '<circle style="fill:var(--hy-centre);fill-opacity:.85" cx="0" cy="0" r="2.1"/></g>')

def cluster(cx, cy, r, n):
    pts, tries = [], 0
    while len(pts) < n and tries < 6000:
        tries += 1
        a = rng.uniform(0, math.tau); d = r * math.sqrt(rng.uniform(0, 1))
        x, y = cx + d * math.cos(a), cy + d * math.sin(a) * 0.9
        if all(math.hypot(x - px, y - py) > 10.5 for px, py in pts):
            pts.append((x, y))
    pts.sort(key=lambda p: math.hypot(p[0] - cx, p[1] - cy), reverse=True)  # back florets first
    out = []
    for x, y in pts:
        depth = math.hypot(x - cx, y - cy) / r
        tone = 1 if depth > 0.66 else (2 if depth > 0.33 else 3)
        out.append(floret(x, y, rng.uniform(0.85, 1.15) * (0.95 if tone == 1 else 1.0), tone, rng.randint(0, 45)))
    return "".join(out)

def leaf(cx, cy, rot, s):
    return (f'<g transform="translate({cx} {cy}) rotate({rot}) scale({s})">'
            '<path style="fill:var(--hy-leaf)" d="M0 -34 C 18 -26, 22 -4, 0 34 C -22 -4, -18 -26, 0 -34 Z"/>'
            '<path style="fill:none;stroke:var(--hy-vein);stroke-width:1.4;stroke-linecap:round" d="M0 -30 L0 30 M0 -10 C 6 -8, 10 -4, 13 2 M0 2 C -6 4, -10 8, -13 14"/></g>')

# A soft wash behind the bloom for a watercolour feel.
WASH = ('<radialGradient id="hy-wash-g"><stop offset="0" style="stop-color:var(--hy-2);stop-opacity:.35"/>'
        '<stop offset="1" style="stop-color:var(--hy-2);stop-opacity:0"/></radialGradient>'
        '<ellipse cx="120" cy="124" rx="112" ry="100" fill="url(#hy-wash-g)"/>')

SYMBOL = ('<symbol id="hydrangea" viewBox="0 0 240 240">' + WASH
          + leaf(52, 178, -35, 1.05) + leaf(196, 74, 40, 0.95) + leaf(184, 190, 120, 0.8)
          + cluster(120, 122, 74, 60) + '</symbol>')
SPRITE = ('    <svg class="hydrangea-sprite" aria-hidden="true" focusable="false" width="0" height="0">'
          + SYMBOL + '</svg>\n')

def use(where):
    return f'<svg class="hydrangea hydrangea--{where}" aria-hidden="true" focusable="false"><use href="#hydrangea"/></svg>'

html = root / "index.html"; s = html.read_text(encoding="utf-8")
# Remove any previous run.
s = re.sub(r'    <svg class="hydrangea-sprite".*?</svg>\n', '', s, flags=re.S)
s = re.sub(r'\s*<svg class="hydrangea hydrangea--[a-z0-9-]+"[^>]*>(<use href="#hydrangea"/>|.*?)</svg>', '', s, flags=re.S)

s = s.replace('    <a class="skip-link" href="#main">Skip to main content</a>\n',
              '    <a class="skip-link" href="#main">Skip to main content</a>\n' + SPRITE, 1)

def place(marker, where, after=False):
    global s
    assert marker in s, marker[:60]
    s = s.replace(marker, (marker + "        " + use(where) + "\n") if after else ("        " + use(where) + "\n" + marker), 1)

place('      <section class="hero" aria-labelledby="hero-h">\n', "hero-a", after=True)
place('      <section class="hero" aria-labelledby="hero-h">\n', "hero-b", after=True)
place('        <h2 id="contact-h">Contact</h2>\n', "contact")
place('          <div class="panel panel--wide">\n', "lab")  # a grid item in the empty cell beside the checker
place('        <h2 id="experience-h">Experience</h2>\n', "experience")
# Not My approach: its principles run the full width, so a bloom there sits on text.
html.write_text(s, encoding="utf-8", newline="\n")

css = root / "src/styles/site.css"; c = css.read_text(encoding="utf-8")
c = re.sub(r"  /\* ---- Decorative hydrangeas -+ \*/\n.*?(?=  /\* ---- Page tools)", "", c, flags=re.S)
anchor = "  /* ---- Page tools: Previous, Next, Top ------------------------------ */"
assert anchor in c
block = '''  /* ---- Decorative hydrangeas ----------------------------------------- */
  /* Coastal grandma: blue hydrangeas in the palette's blues, filling about a quarter of the empty
     space beside measure-limited text on wide screens. Purely visual: aria-hidden, no name, no
     pointer events; gone below 72em (where the text needs the width), in print, under forced
     colors, and in the high-contrast theme. Regenerate with scripts/make-hydrangea.py. */
  .hydrangea-sprite {
    position: absolute;
  }

  .hydrangea {
    position: absolute;
    pointer-events: none;
    user-select: none;
    block-size: auto;
    aspect-ratio: 1;
    /* Light theme: the three blues run from monaco blue toward yearbook, deep enough to read as
       flowers on cream rather than a tint of it. */
    --hy-1: #adc3ea; /* back florets: monaco blue */
    --hy-2: #86a7de; /* between monaco and yearbook */
    --hy-3: #5f86cf; /* front florets: near yearbook */
    --hy-centre: #14224a;
    --hy-leaf: #bccbe0;
    --hy-vein: #8296b8;

    @media (max-width: 71.99em), print, (forced-colors: active) {
      display: none;
    }
  }

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

  /* Hosts: each section that carries a bloom becomes the positioning box, and on wide screens its
     content keeps out of a reserved column on the end side, so the bloom never sits on text at any
     font size or zoom. */
  #contact,
  #experience {
    position: relative;
  }
  @media (min-width: 72em) {
    #contact > :not(.hydrangea),
    #experience > :not(.hydrangea):not(.credentials) {
      padding-inline-end: clamp(13rem, 20vw, 19rem);
    }
  }

  /* Hero: on wide screens the hero is two columns, text and a decoration column of fixed width.
     The blooms are grid items in that column, so whatever the font size or zoom, they can never
     sit on the text: the text column is what is left, and the measure wraps inside it. */
  @media (min-width: 72em) {
    .hero {
      grid-template-columns: minmax(0, 1fr) clamp(13rem, 20vw, 19rem);
      column-gap: var(--space-6);

      > :not(.hydrangea) {
        grid-column: 1;
      }
    }
    .hydrangea--hero-a {
      position: static;
      grid-column: 2;
      grid-row: 1 / 3; /* beside the heading and the lede */
      align-self: center;
      justify-self: end;
      inline-size: 100%;
    }
    .hydrangea--hero-b {
      position: static;
      grid-column: 2;
      grid-row: 3 / 5; /* beside the facts and the buttons */
      align-self: end;
      justify-self: start;
      inline-size: 55%;
      transform: scaleX(-1) rotate(12deg);
    }
  }
  .hydrangea--contact {
    inset-inline-end: 0;
    inset-block-end: var(--space-3);
    inline-size: clamp(11rem, 17vw, 16rem);
    transform: scaleX(-1);
  }
  /* Lab: a grid item in the empty cell beside the contrast checker (three panels, two columns),
     laid out by the grid rather than positioned over anything. */
  .hydrangea--lab {
    position: static;
    justify-self: center;
    align-self: center;
    inline-size: clamp(13rem, 20vw, 18rem);
    transform: rotate(-8deg);
  }
  .hydrangea--experience {
    inset-inline-end: 0;
    inset-block-start: 8rem;
    inline-size: clamp(12rem, 18vw, 17rem);
    transform: scaleX(-1) rotate(6deg);
  }

'''
c = c.replace(anchor, block + anchor, 1)
css.write_text(c, encoding="utf-8", newline="\n")
print("ok: sprite", len(SYMBOL), "bytes; five placements")
