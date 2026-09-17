#!/usr/bin/env node
/**
 * Builds the posts section from writing/*.md.
 *
 *   writing/2026-09-18-my-post.md  ->  posts/my-post/index.html  (served at /posts/my-post/)
 *                                      posts/index.html          (archive, /posts/)
 *                                      public/feed.xml           (Atom)
 *                                      index.html                (the Writing block, latest three)
 *
 * Every generated path is git-ignored except index.html, whose marked region
 * is rewritten in place. Runs under Node 24 with native type stripping, like
 * build-tokens.ts. A post that breaks a rule (missing alt text, skipped
 * heading level, bad front matter) stops the build with the file name and
 * the reason.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  archivePage,
  atomFeed,
  landingBlock,
  parseFrontMatter,
  postPage,
  PostError,
  publishable,
  readingMinutes,
  renderMarkdown,
  slugFromFilename,
  toMeta,
  type Post,
} from "./posts-lib.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "writing");
const outDir = join(root, "posts");
const feedPath = join(root, "public", "feed.xml");
const indexPath = join(root, "index.html");

const START = "<!-- posts:start -->";
const END = "<!-- posts:end -->";

let files: string[] = [];
try {
  files = readdirSync(srcDir).filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md");
} catch {
  files = [];
}

const posts: Post[] = [];
const slugs = new Set<string>();
for (const file of files) {
  try {
    const { meta, body } = parseFrontMatter(readFileSync(join(srcDir, file), "utf8"));
    const typed = toMeta(meta);
    const slug = slugFromFilename(file);
    if (slugs.has(slug)) throw new PostError(`Duplicate slug "${slug}".`);
    slugs.add(slug);
    const { html, words } = renderMarkdown(body);
    posts.push({ ...typed, slug, html, words, minutes: readingMinutes(words) });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`\nwriting/${file}: ${reason}\n`);
    process.exit(1);
  }
}

const live = publishable(posts);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const post of live) {
  const dir = join(outDir, post.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), postPage(post));
}
writeFileSync(join(outDir, "index.html"), archivePage(live));

mkdirSync(dirname(feedPath), { recursive: true });
writeFileSync(feedPath, atomFeed(live, new Date().toISOString()));

const index = readFileSync(indexPath, "utf8");
const a = index.indexOf(START);
const b = index.indexOf(END);
if (a === -1 || b === -1 || b < a) {
  console.error(`index.html needs ${START} and ${END} markers around the Writing list.`);
  process.exit(1);
}
const next = `${index.slice(0, a + START.length)}\n${landingBlock(live)}\n        ${index.slice(b)}`;
if (next !== index) writeFileSync(indexPath, next);

const drafts = posts.length - live.length;
console.log(
  `posts: ${live.length} published${drafts ? `, ${drafts} draft${drafts === 1 ? "" : "s"} skipped` : ""}. Wrote posts/, public/feed.xml, and the Writing block in index.html.`,
);
