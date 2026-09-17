/**
 * One polite and one assertive live region, mounted empty at startup.
 * Regions that mount with content are silent in most screen readers, and
 * regions created on demand are missed, so they exist before anything
 * needs them. Text is cleared first so repeating the same message re-announces.
 */

type Channel = "polite" | "assertive";

const regions = new Map<Channel, HTMLElement>();

function region(channel: Channel): HTMLElement {
  let el = regions.get(channel);
  if (el?.isConnected) return el;
  el = document.createElement("div");
  el.setAttribute("aria-live", channel);
  el.setAttribute("aria-atomic", "true");
  el.className = "visually-hidden";
  el.dataset["liveRegion"] = channel;
  document.body.append(el);
  regions.set(channel, el);
  return el;
}

/** Call once, early, so the regions are in the DOM before any announcement. */
export function mountLiveRegions(): void {
  region("polite");
  region("assertive");
}

let pending: number | undefined;

/** Announce text to screen readers without moving focus. */
export function announce(message: string, channel: Channel = "polite"): void {
  const el = region(channel);
  el.textContent = "";
  if (pending !== undefined) window.clearTimeout(pending);
  // A tick later, so the DOM mutation is a real change even for identical text.
  pending = window.setTimeout(() => {
    el.textContent = message;
  }, 50);
}
