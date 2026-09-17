# Writing

One Markdown file per post. The build turns each file into a page at `/posts/<slug>/`, lists the newest three on the landing page, and writes the Atom feed.

File name: `YYYY-MM-DD-slug.md`. The date prefix is dropped from the URL. Posts list newest first; two posts on the same day list in reverse file-name order, so the later name comes first.

Front matter, all required except `tags` and `draft`:

```
---
title: The post title
date: 2026-09-18
description: One sentence. It is the summary on the landing page and the meta description.
tags: accessibility, tokens
draft: true
---
```

Rules the build enforces, with the file name and reason on failure:

- Body headings start at `##`. The title is the page's only `h1`.
- Heading levels never skip.
- Every image has alt text.
- `description` is present and at most 200 characters.
- `draft: true` keeps a post out of every output.

Run `npm run posts` to rebuild, or `npm run dev` to preview.
