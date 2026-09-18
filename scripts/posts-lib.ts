/**
 * Pure functions for the posts build: front matter, validation, Markdown to
 * HTML, and the page template. No file system access here, so every rule
 * can be unit-tested. scripts/build-posts.ts does the reading and writing.
 *
 * The rules are the same ones the rest of the site lives by, applied to
 * writing: an image without alt text fails the build, a skipped heading
 * level fails the build, and the post title is the page's only h1.
 */
import { Marked, type Tokens } from "marked";

export interface PostMeta {
  title: string;
  date: string; // YYYY-MM-DD
  description: string;
  tags: string[];
  draft: boolean;
}

export interface Post extends PostMeta {
  slug: string;
  html: string;
  words: number;
  minutes: number;
}

export class PostError extends Error {}

const FRONT = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Split "---" front matter from the body. Keys are lower-case; values are trimmed strings. */
export function parseFrontMatter(source: string): { meta: Record<string, string>; body: string } {
  const m = FRONT.exec(source);
  if (!m) throw new PostError("Missing front matter block (--- ... ---) at the top of the file.");
  const meta: Record<string, string> = {};
  for (const line of (m[1] ?? "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const idx = line.indexOf(":");
    if (idx === -1) throw new PostError(`Front matter line is not "key: value": ${line}`);
    meta[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { meta, body: source.slice(m[0].length) };
}

/** Validate and type the front matter. Every error names the field. */
export function toMeta(raw: Record<string, string>): PostMeta {
  const title = raw["title"] ?? "";
  const date = raw["date"] ?? "";
  const description = raw["description"] ?? "";
  if (!title) throw new PostError("Front matter needs a title.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    throw new PostError(`Front matter date must be YYYY-MM-DD, got "${date}".`);
  }
  if (!description) throw new PostError("Front matter needs a description (one sentence; it is the summary and the meta description).");
  if (description.length > 200) throw new PostError("Description is longer than 200 characters.");
  const tags = (raw["tags"] ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return { title, date, description, tags, draft: raw["draft"] === "true" };
}

/** File name to URL slug: "2026-09-18-build-errors.md" -> "build-errors". */
export function slugFromFilename(name: string): string {
  const base = name.replace(/\.md$/i, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) throw new PostError(`Cannot derive a slug from "${name}".`);
  return slug;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Markdown to HTML with the site's rules enforced:
 *  - headings start at h2 (the post title is the h1) and never skip a level;
 *  - every image has alt text;
 *  - every heading gets an id so it can be linked to;
 *  - table header cells carry scope="col", and tables sit in a focusable scroll region.
 */
export function renderMarkdown(markdown: string): { html: string; words: number } {
  let lastLevel = 1;
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading({ tokens, depth }: Tokens.Heading): string {
        const text = this.parser.parseInline(tokens);
        if (depth === 1) throw new PostError(`Body headings start at "##" (h2); the post title is the only h1. Found: # ${text}`);
        if (depth > lastLevel + 1) throw new PostError(`Heading level skipped: h${lastLevel} to h${depth} at "${text}".`);
        lastLevel = depth;
        const id = text
          .replace(/<[^>]+>/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        return `<h${depth} id="${id}">${text}</h${depth}>\n`;
      },
      tablecell(token: Tokens.TableCell): string {
        const content = this.parser.parseInline(token.tokens);
        const align = token.align ? ` style="text-align:${token.align}"` : "";
        const tag = token.header ? `th scope="col"` : "td";
        return `<${tag}${align}>${content}</${token.header ? "th" : "td"}>\n`;
      },
      image({ href, text, title }: Tokens.Image): string {
        if (!text || !text.trim()) throw new PostError(`Image without alt text: ${href}. Every image needs alt text, or alt="" with a reason in the Markdown.`);
        const t = title ? ` title="${escapeHtml(title)}"` : "";
        return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${t} loading="lazy" />`;
      },
    },
  });
  const html = wrapTables(marked.parse(markdown) as string);
  const words = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return { html, words };
}

/**
 * Data tables may scroll sideways under WCAG 1.4.10. Each table sits in a
 * focusable region so keyboard users can scroll it, named after the heading
 * it follows so that two tables on one page are two distinct landmarks.
 */
export function wrapTables(html: string): string {
  let count = 0;
  const seen = new Map<string, number>();
  return html.replaceAll(/<table>([\s\S]*?)<\/table>/g, (match, _body: string, offset: number) => {
    count += 1;
    const before = html.slice(0, offset);
    const headings = [...before.matchAll(/<h[2-6][^>]*>([\s\S]*?)<\/h[2-6]>/g)];
    const last = headings.at(-1)?.[1]?.replace(/<[^>]+>/g, "").trim();
    let label = last ? `Table: ${last}` : `Table ${count}`;
    const n = (seen.get(label) ?? 0) + 1;
    seen.set(label, n);
    if (n > 1) label = `${label} (${n})`;
    return `<div class="table-scroll" role="region" aria-label="${escapeHtml(label)}. Scrolls sideways on narrow screens." tabindex="0">${match}</div>`;
  });
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 220));
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Newest first; drafts excluded. The sort is stable, so same-day posts keep the order the build passed in (later file name first). */
export function publishable(posts: Post[]): Post[] {
  return posts.filter((p) => !p.draft).toSorted((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

const SITE = "https://meredithb104.github.io";

const NAV = `
      <div class="wrap">
        <a class="brand" href="/"><svg class="brand-mark" aria-hidden="true" viewBox="0 0 64 64" width="32" height="32"><rect width="64" height="64" rx="14" fill="currentColor"/><text x="32" y="43" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="30" font-weight="700" fill="var(--color-text)">MB</text></svg><span>Meredith Boyce</span></a>
        <site-nav class="site-nav">
          <nav aria-label="Site">
            <ul role="list">
              <li><a href="/#work">Work</a></li>
              <li><a href="/#case-studies">Case studies</a></li>
              <li><a href="/posts/" data-nav="posts">Writing</a></li>
              <li><a href="/#lab">Lab</a></li>
              <li><a href="/#contact">Contact</a></li>
            </ul>
          </nav>
        </site-nav>
      </div>`;

const FOOTER = `
    <footer class="site-footer">
      <div class="wrap">
        <ul role="list">
          <li><a href="/">Home</a></li>
          <li><a href="/posts/">All posts</a></li>
          <li><a href="/feed.xml" type="application/atom+xml">Atom feed</a></li>
          <li><a href="/accessibility.html">Accessibility statement</a></li>
          <li><a href="https://github.com/meredithb104/meredithb104.github.io">Source for this site</a></li>
        </ul>
        <p>Built by Meredith Boyce with HTML, CSS, and TypeScript. No analytics, no cookies, no tracking.</p>
      </div>
    </footer>`;

/** The shell every generated page shares with index.html: same head, header, footer, scripts. */
export function page(opts: { title: string; description: string; path: string; main: string; current?: "posts" }): string {
  const nav = opts.current === "posts" ? NAV.replace('data-nav="posts"', 'data-nav="posts" aria-current="page"') : NAV;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(opts.title)}</title>
    <meta name="description" content="${escapeHtml(opts.description)}" />
    <meta name="color-scheme" content="light dark" />
    <meta name="theme-color" content="#F9FBF2" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0E1C36" media="(prefers-color-scheme: dark)" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(opts.title)}" />
    <meta property="og:description" content="${escapeHtml(opts.description)}" />
    <meta property="og:url" content="${SITE}${opts.path}" />
    <meta property="og:image" content="${SITE}/og-card-2026-09c.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="canonical" href="${SITE}${opts.path}" />
    <link rel="alternate" type="application/atom+xml" title="Meredith Boyce: writing" href="/feed.xml" />
    <script>
      try {
        var t = localStorage.getItem("theme");
        if (t === "light" || t === "dark" || t === "high-contrast") document.documentElement.dataset.theme = t;
      } catch (e) {}
    </script>
    <script type="module" src="/src/main.ts"></script>
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to main content</a>

    <header class="site-header">${nav}
    </header>

    <main id="main" tabindex="-1" class="wrap">
${opts.main}
    </main>
${FOOTER}
  </body>
</html>
`;
}

/** One post's page. */
export function postPage(post: Post): string {
  const tags = post.tags.length
    ? `<p class="post-tags"><span class="visually-hidden">Tags: </span>${post.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(" ")}</p>`
    : "";
  const main = `      <article class="post" aria-labelledby="post-h">
        <header class="post-header">
          <p class="eyebrow"><a href="/posts/">Writing</a></p>
          <h1 id="post-h">${escapeHtml(post.title)}</h1>
          <p class="post-meta">
            <time datetime="${post.date}">${formatDate(post.date)}</time> · ${post.minutes} minute read
          </p>
          <p class="lede measure">${escapeHtml(post.description)}</p>
          ${tags}
        </header>
        <div class="post-body prose">
${post.html}
        </div>
        <footer class="post-footer">
          <p><a href="/posts/">All posts</a> · <a href="/">Home</a></p>
        </footer>
      </article>`;
  return page({ title: `${post.title}, by Meredith Boyce`, description: post.description, path: `/posts/${post.slug}/`, main, current: "posts" });
}

/** The archive page, all posts newest first. */
export function archivePage(posts: Post[]): string {
  const list = posts.length ? `<ol class="post-list" role="list">\n${posts.map((p) => postListItem(p, 2)).join("\n")}\n        </ol>` : `<p class="muted">Nothing is published yet.</p>`;
  const main = `      <p class="eyebrow">Writing</p>
      <h1>Posts</h1>
      <p class="lede measure">
        Notes on accessibility engineering: what audits keep finding, how I fix it, and how I keep it fixed. Subscribe
        with the <a href="/feed.xml" type="application/atom+xml">Atom feed</a>.
      </p>
      ${list}`;
  return page({ title: "Writing, by Meredith Boyce", description: "Posts on accessibility engineering by Meredith Boyce: audits, remediation, and the code that keeps it fixed.", path: "/posts/", main, current: "posts" });
}

/** One entry, shared by the archive (h2 under the page h1) and the landing block (h3 under the section h2). */
export function postListItem(post: Post, level: 2 | 3 = 3): string {
  return `          <li class="post-item">
            <h${level} class="post-item-title"><a href="/posts/${post.slug}/">${escapeHtml(post.title)}</a></h${level}>
            <p class="post-item-meta"><time datetime="${post.date}">${formatDate(post.date)}</time> · ${post.minutes} minute read</p>
            <p class="post-item-desc">${escapeHtml(post.description)}</p>
          </li>`;
}

/** The block that replaces the marked region in index.html. */
export function landingBlock(posts: Post[], limit = 3): string {
  const latest = posts.slice(0, limit);
  if (latest.length === 0) return `        <p class="muted">The first post is on its way.</p>`;
  return `        <ol class="post-list" role="list">\n${latest.map((p) => postListItem(p, 3)).join("\n")}\n        </ol>`;
}

/** Atom 1.0 feed. Content is the full HTML so feed readers show the whole post. */
export function atomFeed(posts: Post[], now: string): string {
  const entries = posts
    .map(
      (p) => `  <entry>
    <title>${escapeHtml(p.title)}</title>
    <link href="${SITE}/posts/${p.slug}/" />
    <id>${SITE}/posts/${p.slug}/</id>
    <updated>${p.date}T00:00:00Z</updated>
    <published>${p.date}T00:00:00Z</published>
    <summary>${escapeHtml(p.description)}</summary>
    <content type="html">${escapeHtml(p.html)}</content>
  </entry>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Meredith Boyce: writing</title>
  <subtitle>Notes on accessibility engineering</subtitle>
  <link href="${SITE}/feed.xml" rel="self" />
  <link href="${SITE}/posts/" />
  <id>${SITE}/posts/</id>
  <updated>${now}</updated>
  <author><name>Meredith Boyce</name></author>
${entries}
</feed>
`;
}
