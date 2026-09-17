---
title: Accessibility is a build error, not a review comment
date: 2026-09-18
description: I made this site refuse to compile when a color pair fails WCAG contrast. Here is why, and what it caught on day one.
tags: design tokens, WCAG, tooling
---

I have written the same finding hundreds of times: insufficient contrast, secondary text, dark mode, 1.4.3, fails. I have written it for enterprise clients, for a state agency, and for freelance clients who paid me to find it. Every time, somebody fixed it, and every time, it came back a release later.

I am done writing that finding. On this site, it cannot exist.

## The rule

Every color in my design tokens can say what it sits on and the ratio it owes:

```json
"textMuted": {
  "value": "#4A5561",
  "$contrastAgainst": ["bg", "surface", "bgSubtle"],
  "$minRatio": 4.5
}
```

When the tokens compile, a script checks every pair with the WCAG 2.x formula. If one pair is short, the script prints the pair, the ratio it got, and the ratio it needed, and it exits. No CSS is written. The site does not build. Eighty-one pairs, three themes, every push.

## What it caught on day one

I asked the focus ring to hit 3:1 against the page and against the primary button. The build stopped me: 1.55:1 against the button in the light theme.

The build was right. The ring sits two pixels outside the control, so the color next to it is the page, not the button. I had written a requirement that does not exist in WCAG, and the build would not let me ship it. Nobody reviewed that mistake. Nobody had to.

## Why tokens and not a linter

A linter looks at a rendered page. It cannot see the theme that is not active, the state nobody triggered, or the component that is not on the page it was pointed at. I know this because I run linters for a living, and then I test by hand, because the linter missed something.

A token file is the one place where every color and every background exist together before any of them is drawn. Check there, and you have checked all of it, in milliseconds, before a human looks.

I apply the same rule to anything a machine can decide. On this site, a post with an image and no alt text does not build. A post whose headings skip a level does not build. If a machine can decide it, the machine decides it first.

## What is left for me

The audit still has work in it: focus that lands on the body after a dialog closes, a live region that mounts with its message already inside and never speaks, a carousel that moves because nobody stopped it. Those need a person with a screen reader. I am that person.

Contrast never needed me. It needed a build step.
