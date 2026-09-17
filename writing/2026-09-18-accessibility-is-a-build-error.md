---
title: Accessibility is a build error, not a review comment
date: 2026-09-18
description: Why this site refuses to compile when a color pair fails WCAG contrast, and what that changed about how I work.
tags: design tokens, WCAG, tooling
---

Most accessibility work happens after the fact. Someone audits, someone writes a spreadsheet of findings, a team patches for a sprint, and a year later the same findings return. I have written that spreadsheet more times than I can count. This site is my attempt to make one class of finding impossible.

## The rule

Every color in this site's design tokens can declare what it sits on and the ratio it needs:

```json
"textMuted": {
  "value": "#4A5561",
  "$contrastAgainst": ["bg", "surface", "bgSubtle"],
  "$minRatio": 4.5
}
```

When the tokens compile, a script computes every declared pair with the WCAG 2.x relative-luminance formula. If any pair falls below its ratio, the script prints the pair, the ratio it got, and the ratio it needed, and it exits without writing a single line of CSS. The site cannot build. Eighty-one pairs across three themes are checked on every push.

## What the build caught

While I was building the page, the check stopped me. I had asked the focus ring to reach 3:1 against the page background and against the primary button. The build reported 1.55:1 for the button in the light theme and refused to continue.

The build was right, and I was wrong about the requirement. The ring sits two pixels outside the control, so its adjacent color is the page, not the button. I removed the button from the ring's list, the pairs passed, and the mistake never reached a reviewer, a pull request, or a user.

That is the whole argument in one incident. A reviewer might have caught it. A reviewer might also have been tired, or new, or busy. The build is never any of those things.

## Why the token file, and not a linter

Linters run on rendered pages and report what they see. They cannot see a theme that is not active, a state that is not triggered, or a component that is not on the page they were pointed at. A token file is the one place where every color and every background is declared together, before any of them is rendered. Checking there means checking everything, once, in a few milliseconds.

The same principle applies beyond color. On this site, a post with an image that has no alt text does not build. A post whose headings skip a level does not build. The rule is always the same: if a machine can decide it, the machine decides it before a human has to.

## What it changed

I stopped writing a certain kind of finding. "Insufficient contrast on secondary text in dark mode" used to be a line in every audit I delivered. On projects that adopt this pattern, it is not a finding anymore, because it is not possible. That leaves the audit for the problems that need a person: focus that goes nowhere, a live region that mounts with content and never speaks, a carousel that moves when nobody asked.

Those are the findings worth a human's time. Contrast never was.
