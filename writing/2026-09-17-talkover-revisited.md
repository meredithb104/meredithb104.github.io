---
title: TalkOver, revisited
date: 2026-09-17
description: Years ago, I wanted to rewrite TalkBack to behave like VoiceOver. I finally read the TalkBack source. Most of the "rewrite" already ships as a settings screen.
tags: TalkBack, VoiceOver, Android, screen readers
---

Once upon a time, long before the age of AI, I proposed rewriting Android's TalkBack code so that it would work more like VoiceOver on Apple devices. My grand invention was to be called "TalkOver."

I never got past the name. The idea stayed with me long enough that I finally asked the question properly: how far apart are these two gesture models? Would TalkOver have needed a rewrite, or was the gap smaller than it looked from the outside?

I did not ask a forum. Google has published TalkBack's source, so I read it. Two files answer the question. `gesture_preferences.xml` defines every gesture slot TalkBack recognizes, from a one-finger swipe to a four-finger triple-tap. `donottranslate.xml` names more than a hundred actions you can bind to any slot, and it records the default binding for each one. That is ground truth, not a summary of ground truth.

## The gap is smaller than TalkOver assumed

Several of VoiceOver's core gestures are already TalkBack's defaults under different names.

| VoiceOver | TalkBack default |
| --- | --- |
| Swipe right or left moves to the next or previous item | Identical: `NEXT` and `PREVIOUS` |
| Swipe up or down adjusts the rotor's current setting | Same idea: `SELECTED_SETTING_NEXT_ACTION` and `SELECTED_SETTING_PREVIOUS_ACTION` |
| Two-finger tap pauses or resumes speech | Identical: `PAUSE_OR_RESUME_FEEDBACK` |
| Two-finger double-tap is the "magic tap" (play, pause, or answer a call) | Identical intent: `MEDIA_CONTROL_OR_VOICE_INPUT` on the same gesture |

The younger engineer who named TalkOver would have rewritten four gestures that needed no rewriting.

## Where they diverge, and what closes the gap

The real differences are narrower than "these are different apps," and most of them are one settings screen away from closing.

| VoiceOver | TalkBack default | What closes it |
| --- | --- | --- |
| Three-finger swipe up or down scrolls the page | Bound to setting selection; scrolling lives on two-finger swipes | Rebind the three-finger swipes to `SCROLL_UP` and `SCROLL_DOWN`. Both are assignable actions. |
| Two-finger swipe up reads the whole screen from the top | Scrolls up | `READ_FROM_TOP` exists as an action. It is not on that gesture by default. |
| Two-finger swipe down reads from the current position | Scrolls down | `READ_FROM_CURRENT` already sits on the two-finger triple-tap. Bind it to the swipe as well if you want the VoiceOver gesture, not only the result. |
| Four-finger tap at the top or bottom jumps to the first or last item | Unbound | `FIRST_IN_SCREEN` and `LAST_IN_SCREEN` exist and sit idle. The four-finger triple-tap slot is unassigned and waiting. |
| Three-finger swipe left or right moves a page | Android has no general page concept | The closest fit is the four-finger swipe left or right, which is already `PREV_CONTAINER` and `NEXT_CONTAINER`. |

Then there is the one gap no settings screen closes. VoiceOver's two-finger scrub, a "z" drawn on the glass, goes back or dismisses whatever is open. TalkBack has no scrub gesture type at all. Its back gesture is a one-finger swipe down and then left, an angle swipe. The intent is the same, the shape is different, and there is no remap for that, because the shape does not exist on the Android side.

## What I would tell that younger engineer

TalkBack did not need a rewrite. It needed someone to open Settings, Accessibility, TalkBack, Customize gestures, and treat it as the fully remappable surface it already is. TalkOver, as I imagined it, mostly ships today. You only have to know which handful of gestures to move.

The one thing it cannot do is invent a gesture type that Android's touch model does not support. That part of the old idea was right, for reasons I could not have articulated at the time.

Every binding in this post comes from `gesture_preferences.xml` and `donottranslate.xml` in the [google/talkback repository](https://github.com/google/talkback). If Google changes a default, those two files will say so before any support article does.
