import { describe, expect, it } from "vitest";
import {
  archivePage,
  atomFeed,
  landingBlock,
  parseFrontMatter,
  postPage,
  publishable,
  readingMinutes,
  renderMarkdown,
  slugFromFilename,
  toMeta,
  type Post,
} from "../../scripts/posts-lib.ts";

const FM = `---
title: A title
date: 2026-09-18
description: One sentence.
tags: a, b
---
Body text.`;

describe("front matter", () => {
  it("parses key: value lines and returns the body", () => {
    const { meta, body } = parseFrontMatter(FM);
    expect(meta).toEqual({ title: "A title", date: "2026-09-18", description: "One sentence.", tags: "a, b" });
    expect(body).toBe("Body text.");
  });

  it("requires the block", () => {
    expect(() => parseFrontMatter("no front matter")).toThrow(/Missing front matter/);
  });

  it("types and validates every field with a named error", () => {
    const meta = toMeta(parseFrontMatter(FM).meta);
    expect(meta).toEqual({ title: "A title", date: "2026-09-18", description: "One sentence.", tags: ["a", "b"], draft: false });
    expect(() => toMeta({ date: "2026-09-18", description: "x" })).toThrow(/needs a title/);
    expect(() => toMeta({ title: "t", date: "18 Sep 2026", description: "x" })).toThrow(/YYYY-MM-DD/);
    expect(() => toMeta({ title: "t", date: "2026-13-45", description: "x" })).toThrow(/YYYY-MM-DD/);
    expect(() => toMeta({ title: "t", date: "2026-09-18" })).toThrow(/needs a description/);
    expect(() => toMeta({ title: "t", date: "2026-09-18", description: "x".repeat(201) })).toThrow(/200 characters/);
    expect(toMeta({ title: "t", date: "2026-09-18", description: "x", draft: "true" }).draft).toBe(true);
  });
});

describe("slugs", () => {
  it("drops the date prefix and normalises", () => {
    expect(slugFromFilename("2026-09-18-Build Errors!.md")).toBe("build-errors");
    expect(slugFromFilename("plain.md")).toBe("plain");
    expect(() => slugFromFilename("2026-09-18-.md")).toThrow(/slug/);
  });
});

describe("renderMarkdown enforces the site's rules", () => {
  it("renders headings from h2 with ids, and counts words", () => {
    const { html, words } = renderMarkdown("## First thing\n\nSome words here.\n\n### Detail\n\nMore.");
    expect(html).toContain('<h2 id="first-thing">First thing</h2>');
    expect(html).toContain('<h3 id="detail">Detail</h3>');
    expect(words).toBe(9);
  });

  it("rejects an h1 in the body", () => {
    expect(() => renderMarkdown("# Nope")).toThrow(/only h1/);
  });

  it("rejects a skipped heading level", () => {
    expect(() => renderMarkdown("## Two\n\n#### Four")).toThrow(/skipped: h2 to h4/);
  });

  it("rejects an image without alt text and keeps one with it", () => {
    expect(() => renderMarkdown("![](pic.png)")).toThrow(/without alt text: pic.png/);
    const { html } = renderMarkdown('![A braille display on a desk](pic.png "Mantis Q40")');
    expect(html).toContain('<img src="pic.png" alt="A braille display on a desk" title="Mantis Q40" loading="lazy" />');
  });

  it("does not count fenced code as words", () => {
    expect(renderMarkdown("one two\n\n```\nlots of code words here\n```\n\nthree").words).toBe(3);
  });
});

describe("reading time and ordering", () => {
  it("rounds to whole minutes with a floor of one", () => {
    expect(readingMinutes(10)).toBe(1);
    expect(readingMinutes(440)).toBe(2);
  });

  it("publishable drops drafts and sorts newest first without mutating", () => {
    const mk = (date: string, draft = false): Post => ({ title: date, date, description: "d", tags: [], draft, slug: date, html: "", words: 1, minutes: 1 });
    const input = [mk("2026-01-01"), mk("2026-03-01", true), mk("2026-02-01")];
    const out = publishable(input);
    expect(out.map((p) => p.date)).toEqual(["2026-02-01", "2026-01-01"]);
    expect(input[0]!.date).toBe("2026-01-01");
  });
});

describe("generated pages", () => {
  const post: Post = {
    title: 'Quotes & <angles>',
    date: "2026-09-18",
    description: "A description.",
    tags: ["tokens"],
    draft: false,
    slug: "quotes",
    html: "<h2 id=\"x\">X</h2>\n<p>Body</p>\n",
    words: 300,
    minutes: 1,
  };

  it("post page has one h1, escaped title, time element, canonical, feed link, and the shared shell", () => {
    const html = postPage(post);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("<title>Quotes &amp; &lt;angles&gt;, by Meredith Boyce</title>");
    expect(html).toContain('<h1 id="post-h">Quotes &amp; &lt;angles&gt;</h1>');
    expect(html).toContain('<time datetime="2026-09-18">September 18, 2026</time>');
    expect(html).toContain('<link rel="canonical" href="https://meredithb104.github.io/posts/quotes/" />');
    expect(html).toContain('type="application/atom+xml"');
    expect(html).toContain('<a class="skip-link" href="#main">');
    expect(html).toContain('<main id="main" tabindex="-1"');
    expect(html).toContain('href="/posts/" data-nav="posts" aria-current="page"');
    expect(html).toContain('<script type="module" src="/src/main.ts"></script>');
  });

  it("archive and landing block list posts; empty states are sentences", () => {
    expect(archivePage([post])).toContain('<h2 class="post-item-title"><a href="/posts/quotes/">Quotes &amp; &lt;angles&gt;</a></h2>');
    expect(landingBlock([post])).toContain('<h3 class="post-item-title">');
    expect(archivePage([])).toContain("Nothing is published yet.");
    expect(landingBlock([post, post, post, post]).match(/<li class="post-item">/g)).toHaveLength(3);
    expect(landingBlock([])).toContain("The first post is on its way.");
  });

  it("atom feed escapes content and carries the full post", () => {
    const xml = atomFeed([post], "2026-09-18T00:00:00Z");
    expect(xml).toContain("<title>Quotes &amp; &lt;angles&gt;</title>");
    expect(xml).toContain('<content type="html">&lt;h2 id=&quot;x&quot;&gt;X&lt;/h2&gt;');
    expect(xml).toContain("<id>https://meredithb104.github.io/posts/quotes/</id>");
  });
});
