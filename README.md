# Zone's Blog

English | [简体中文](README.zh-CN.md)

Source of my personal blog, built with [Astro](https://astro.build). Live at **https://zoooooone.github.io**.

![Home page](docs/homepage.png)

## Features

- **Wallpaper-linked theme.** The accent palette is extracted from the current wallpaper at build time, for both light and dark mode, and every pair is checked against WCAG contrast.
- **Music that keeps playing.** The player lives in a persisted shell, so audio is not interrupted when navigating between pages.
- **Command palette.** `Ctrl/⌘ + K` for full-text search, page jumps, and wallpaper / theme switching.
- **Comments and pageviews** through [Waline](https://waline.js.org). The comment widget loads only when it is about to scroll into view.
- **Markdown first.** KaTeX, Mermaid, code blocks with copy buttons, a per-post table of contents, and an image lightbox.
- **Stable URLs.** Post, category and tag URLs match the previous Jekyll / Chirpy site.

## Tech stack

Astro 7 · TypeScript · plain CSS (no framework) · Waline · KaTeX · Mermaid · pnpm

## Getting started

Requires Node.js 22.12 or later and pnpm.

```bash
pnpm install
pnpm dev       # http://localhost:4321
pnpm verify    # format, lint, type-check, knip, build and link check
```

## Project layout

```
src/
├─ config/       site info and wallpaper list
├─ content/      posts (Markdown)
├─ layouts/      page shell
├─ pages/        routes
├─ components/   shell, post, list and ui components
├─ lib/          post queries, theme / palette math, image helpers
├─ scripts/      browser scripts, grouped by feature
├─ styles/       tokens → base → panels → layout → components → pages
└─ plugins/      remark plugin for legacy kramdown syntax
scripts/         build-time tools: thumbnails, contrast check, link check
```

## Notes

- This is a personal site, not a template. Feel free to read the code; there is no setup guide or support.
- MP3 files are not in this repository. They are hosted on Cloudflare R2; the playlist and lyrics are in `public/assets/audio`, and the base URL is set in `src/config/site.ts`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org) and are checked by husky, lint-staged and commitlint. CI runs `pnpm verify`.

## License

The source code is released under the [MIT License](LICENSE).

Posts, photos and other written content under `src/content` and `public/assets` are © Zoooooone, all rights reserved. Wallpapers, album covers, lyrics and music belong to their respective owners and are not covered by the MIT License.
