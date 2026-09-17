/**
 * <site-nav>: marks the in-page link for the section currently in view with
 * aria-current="location". Pure enhancement: the links work without it, and
 * the state is shown with an underline as well as color.
 *
 * IntersectionObserver instead of a scroll listener: no work on the main
 * thread while scrolling, which is most of what "snappy" means here.
 */
export class SiteNav extends HTMLElement {
  private observer: IntersectionObserver | undefined;
  private readonly visible = new Map<string, number>();

  connectedCallback(): void {
    if (!("IntersectionObserver" in window)) return;
    const links = [...this.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
    const targets = links
      .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) this.visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        let best: string | undefined;
        let bestRatio = 0;
        for (const [id, ratio] of this.visible) {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }
        for (const a of links) {
          if (best !== undefined && a.hash === `#${best}`) a.setAttribute("aria-current", "location");
          else a.removeAttribute("aria-current");
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    for (const t of targets) this.observer.observe(t);
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
  }
}

if (!customElements.get("site-nav")) customElements.define("site-nav", SiteNav);
