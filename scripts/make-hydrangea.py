"""Regenerate the decorative hydrangeas on the home page.

Three bloom styles, after a hand-drawn reference: a mophead of many small florets, a bloom of a few
large outlined florets, and a lacecap sprig on stems. Each is an SVG <symbol> in a sprite at the top
of <body>; each placement is a tiny <svg><use> that the stylesheet sizes, positions, mirrors, and
recolours per theme through custom properties (inherited into the <use> shadow tree, which is why
fills are inline styles). Purely decorative: aria-hidden, no name, pointer-events none, hidden at
narrow widths, in print, under forced colors, and in the high-contrast theme. Seeded, so the layout
is stable.

  python scripts/make-hydrangea.py
"""
import math, pathlib, random, re

root = pathlib.Path(__file__).resolve().parent.parent
rng = random.Random(11)

PETAL = 'style="stroke:var(--hy-line);stroke-width:{sw};stroke-linejoin:round"'

def floret(cx, cy, s, tone, rot, petal=(4.8, 6.6), sw=0.9):
    """Four petals around a small centre. Tones map to custom properties so themes recolour them."""
    rx, ry = petal
    return (f'<g style="fill:var(--hy-{tone});fill-opacity:.95" transform="translate({cx:.1f} {cy:.1f}) rotate({rot}) scale({s:.2f})">'
            f'<g {PETAL.format(sw=sw)}>'
            f'<ellipse cx="0" cy="{-ry + 0.6:.1f}" rx="{rx}" ry="{ry}"/><ellipse cx="{ry - 0.6:.1f}" cy="0" rx="{ry}" ry="{rx}"/>'
            f'<ellipse cx="0" cy="{ry - 0.6:.1f}" rx="{rx}" ry="{ry}"/><ellipse cx="{-ry + 0.6:.1f}" cy="0" rx="{ry}" ry="{rx}"/></g>'
            '<circle style="fill:var(--hy-centre)" cx="0" cy="0" r="2"/></g>')

def cluster(cx, cy, r, n, spacing, scale=(0.9, 1.15), petal=(4.8, 6.6), sw=0.9, squash=0.88):
    pts, tries = [], 0
    while len(pts) < n and tries < 8000:
        tries += 1
        a = rng.uniform(0, math.tau); d = r * math.sqrt(rng.uniform(0, 1))
        x, y = cx + d * math.cos(a), cy + d * math.sin(a) * squash
        if all(math.hypot(x - px, y - py) > spacing for px, py in pts):
            pts.append((x, y))
    pts.sort(key=lambda p: math.hypot(p[0] - cx, p[1] - cy), reverse=True)  # back florets first
    out = []
    for x, y in pts:
        depth = math.hypot(x - cx, y - cy) / r
        tone = 1 if depth > 0.66 else (2 if depth > 0.33 else 3)
        out.append(floret(x, y, rng.uniform(*scale), tone, rng.randint(0, 45), petal, sw))
    return "".join(out)

def leaf(cx, cy, rot, s, length=34):
    L = length
    return (f'<g transform="translate({cx} {cy}) rotate({rot}) scale({s})">'
            f'<path style="fill:var(--hy-leaf);stroke:var(--hy-leaf-line);stroke-width:1.1;stroke-linejoin:round" '
            f'd="M0 {-L} C {L*0.55} {-L*0.75}, {L*0.62} {-L*0.1}, 0 {L} C {-L*0.62} {-L*0.1}, {-L*0.55} {-L*0.75}, 0 {-L} Z"/>'
            f'<path style="fill:none;stroke:var(--hy-leaf-line);stroke-width:1;stroke-linecap:round" '
            f'd="M0 {-L*0.85} L0 {L*0.85} M0 {-L*0.3} C {L*0.18} {-L*0.25}, {L*0.3} {-L*0.1}, {L*0.4} {L*0.05} '
            f'M0 {L*0.05} C {-L*0.18} {L*0.1}, {-L*0.3} {L*0.25}, {-L*0.4} {L*0.4}"/></g>')

def stem(d):
    return f'<path style="fill:none;stroke:var(--hy-stem);stroke-width:2;stroke-linecap:round" d="{d}"/>'

def wash(cx, cy, rx, ry, gid):
    return (f'<radialGradient id="{gid}"><stop offset="0" style="stop-color:var(--hy-2);stop-opacity:var(--hy-wash)"/>'
            f'<stop offset="1" style="stop-color:var(--hy-2);stop-opacity:0"/></radialGradient>'
            f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="url(#{gid})"/>')

# A: mophead, many small florets, a stalk and two leaves below, like the reference's round heads.
MOPHEAD = ('<symbol id="hy-mophead" viewBox="0 0 240 260">' + wash(120, 108, 100, 92, "hy-wash-a")
           + stem("M120 170 C 124 195, 128 215, 134 245") + leaf(92, 208, -40, 0.95) + leaf(160, 226, 35, 0.8)
           + cluster(120, 108, 72, 46, 12.5) + '</symbol>')

# B: a few large outlined florets, the bold style, leaves either side.
BIGPETAL = ('<symbol id="hy-bigpetal" viewBox="0 0 260 220">' + wash(130, 110, 118, 92, "hy-wash-b")
            + leaf(36, 150, -62, 1.15, 36) + leaf(226, 150, 62, 1.15, 36) + leaf(126, 196, 5, 0.8, 30)
            + cluster(130, 104, 74, 16, 26, scale=(1.55, 2.0), petal=(5.2, 7.2), sw=0.75, squash=0.8) + '</symbol>')

# C: a lacecap sprig: three small heads on thin stems with small leaves.
SPRIG = ('<symbol id="hy-sprig" viewBox="0 0 240 200">'
         + stem("M120 190 C 118 160, 112 130, 96 96") + stem("M120 190 C 126 150, 140 120, 168 92") + stem("M118 170 C 140 150, 150 140, 150 122")
         + leaf(106, 150, -35, 0.55, 30) + leaf(146, 168, 40, 0.5, 30)
         + cluster(84, 76, 40, 18, 11, scale=(0.8, 1.0)) + cluster(176, 74, 38, 16, 11, scale=(0.8, 1.0)) + cluster(148, 108, 26, 8, 11, scale=(0.75, 0.95))
         + '</symbol>')

SPRITE = ('    <svg class="hydrangea-sprite" aria-hidden="true" focusable="false" width="0" height="0">'
          + MOPHEAD + BIGPETAL + SPRIG + '</svg>\n')

def use(where, which):
    return f'<svg class="hydrangea hydrangea--{where}" aria-hidden="true" focusable="false"><use href="#hy-{which}"/></svg>'

html = root / "index.html"; s = html.read_text(encoding="utf-8")
# Remove any previous run.
s = re.sub(r'    <svg class="hydrangea-sprite".*?</svg>\n', '', s, flags=re.S)
s = re.sub(r'\s*<svg class="hydrangea hydrangea--[a-z0-9-]+"[^>]*>(<use href="#[a-z-]+"/>|.*?)</svg>', '', s, flags=re.S)

s = s.replace('    <a class="skip-link" href="#main">Skip to main content</a>\n',
              '    <a class="skip-link" href="#main">Skip to main content</a>\n' + SPRITE, 1)

def place(marker, where, which, after=False):
    global s
    assert marker in s, marker[:60]
    s = s.replace(marker, (marker + "        " + use(where, which) + "\n") if after else ("        " + use(where, which) + "\n" + marker), 1)

place('      <section class="hero" aria-labelledby="hero-h">\n', "hero-a", "bigpetal", after=True)
place('      <section class="hero" aria-labelledby="hero-h">\n', "hero-b", "sprig", after=True)
place('        <h2 id="contact-h">Contact</h2>\n', "contact", "mophead")
place('          <div class="panel panel--wide">\n', "lab", "mophead")  # a grid item in the empty cell beside the checker
place('        <h2 id="experience-h">Experience</h2>\n', "experience", "sprig")
# Not My approach: its principles run the full width, so a bloom there sits on text.
html.write_text(s, encoding="utf-8", newline="\n")

css = root / "src/styles/site.css"; c = css.read_text(encoding="utf-8")
c = re.sub(r"  /\* ---- Decorative hydrangeas -+ \*/\n.*?(?=  /\* ---- Page tools)", "", c, flags=re.S)
anchor = "  /* ---- Page tools: Previous, Next, Top ------------------------------ */"
assert anchor in c
block = '''  /* ---- Decorative hydrangeas ----------------------------------------- */
  /* Coastal grandma: blue hydrangeas after a hand-drawn reference, in three styles (a mophead, a
     few large outlined florets, a lacecap sprig), filling about a quarter of the empty space beside
     measure-limited text on wide screens. Purely visual: aria-hidden, no name, no pointer events;
     gone below 72em (where the text needs the width), in print, under forced colors, and in the
     high-contrast theme. Regenerate with scripts/make-hydrangea.py. */
  .hydrangea-sprite {
    position: absolute;
  }

  /* The custom properties are set on the sprite as well as on each placement: a placement's <use>
     inherits them into its shadow tree, but a gradient referenced by url() resolves in the sprite's
     own tree, so the wash's colour and opacity must be defined there. */
  .hydrangea,
  .hydrangea-sprite {
    /* Light theme: sky blue through to yearbook, navy outlines and centres, green leaves. */
    --hy-1: #8fbde8;
    --hy-2: #5f93da;
    --hy-3: #3d63c2;
    --hy-line: #1f3a7a;
    --hy-centre: #14224a;
    --hy-leaf: #9dbf7c;
    --hy-leaf-line: #4f7a3e;
    --hy-stem: #5f8a4a;
    --hy-wash: 0; /* the halo behind a bloom reads as a smudge on cream; it stays on the navy */
  }

  .hydrangea {
    position: absolute;
    pointer-events: none;
    user-select: none;
    block-size: auto;

    @media (max-width: 71.99em), print, (forced-colors: active) {
      display: none;
    }
  }
  .hydrangea--hero-a {
    aspect-ratio: 260 / 220;
  }
  .hydrangea--hero-b,
  .hydrangea--experience {
    aspect-ratio: 240 / 200;
  }
  .hydrangea--contact,
  .hydrangea--lab {
    aspect-ratio: 240 / 260;
  }

  /* Dark theme: the same blues a step lighter on the navy, navy outlines, cream centres. */
  :root:not([data-theme]) :is(.hydrangea, .hydrangea-sprite) {
    @media (prefers-color-scheme: dark) {
      --hy-1: #7ea9e4;
      --hy-2: #a9c1e8;
      --hy-3: #cfdcf3;
      --hy-line: #14224a;
      --hy-centre: #f4f1e8;
      --hy-leaf: #6f9a5a;
      --hy-leaf-line: #2f4a25;
      --hy-stem: #7fa868;
      --hy-wash: 0.3;
    }
  }
  :root[data-theme="dark"] :is(.hydrangea, .hydrangea-sprite) {
    --hy-1: #7ea9e4;
    --hy-2: #a9c1e8;
    --hy-3: #cfdcf3;
    --hy-line: #14224a;
    --hy-centre: #f4f1e8;
    --hy-leaf: #6f9a5a;
    --hy-leaf-line: #2f4a25;
    --hy-stem: #7fa868;
    --hy-wash: 0.3;
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
    /* A max width, not padding: padding is inside the box, and a box that reaches under a bloom
       is an overlap even when its text does not. */
    #contact > :not(.hydrangea),
    #experience > :not(.hydrangea):not(.credentials) {
      max-inline-size: min(var(--size-measure), calc(100% - clamp(13rem, 20vw, 19rem)));
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
      justify-self: end;
      inline-size: 68%;
      margin-block-end: -2.5rem; /* down into the hero's bottom padding, away from the buttons */
      transform: scaleX(-1);
    }
  }
  .hydrangea--contact {
    inset-inline-end: 0;
    inset-block-end: var(--space-2);
    inline-size: clamp(10rem, 15vw, 14rem);
    transform: scaleX(-1);
  }
  /* Lab: a grid item in the empty cell beside the contrast checker (three panels, two columns),
     laid out by the grid rather than positioned over anything. */
  .hydrangea--lab {
    position: static;
    justify-self: center;
    align-self: center;
    inline-size: clamp(13rem, 20vw, 18rem);
    transform: rotate(-6deg);
  }
  .hydrangea--experience {
    inset-inline-end: 0;
    inset-block-start: 6rem;
    inline-size: clamp(12rem, 18vw, 17rem);
    transform: scaleX(-1);
  }

'''
c = c.replace(anchor, block + anchor, 1)
css.write_text(c, encoding="utf-8", newline="\n")
print("ok: sprite", len(MOPHEAD) + len(BIGPETAL) + len(SPRIG), "bytes; five placements, three styles")
