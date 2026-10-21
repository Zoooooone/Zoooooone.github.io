# Project guide

Personal blog built with Astro, TypeScript and plain CSS. Package manager: pnpm.

## Commands

- `pnpm dev` — thumbnails + dev server at `localhost:4321`
- `pnpm dev:mock` — the same, with a fake stats Worker and made-up visits, to try `/stats/` (any token works)
- `pnpm test` — unit tests (Vitest); `pnpm test:e2e` — browser smoke tests (Playwright, needs a build and Chrome)
- `pnpm verify` — format check, ESLint, Stylelint, `astro check`, knip, unit tests, build, link check, browser tests. Run before committing.
- `pnpm format` — Prettier over the whole repo

## Conventions

- Source, comments and commit messages are in English; commits follow Conventional Commits.
- Comments only for non-obvious reasons (pitfalls, magic numbers, compatibility), never for what the code already says.
- Browser scripts live in `src/scripts/<feature>/` and register page logic with `onPage()` from `src/scripts/core/lifecycle.ts`, because navigation uses Astro's ClientRouter.
- Styles are plain CSS in `src/styles/`, organised in cascade layers: the order is declared in `layers.css` and each file is imported with `layer(...)` in `index.css`. A later layer beats an earlier one regardless of specificity, so put a rule in the layer it belongs to rather than raising its specificity. Colors, sizes and weights come from `tokens.css`.
- Theme and wallpaper switching fades only surfaces (`background-color`, borders, shadows) through `html[data-switching]`; text colors change at once. Do not animate the color variables or use view transitions for it: both caused flicker and clashed with the page-change transition.
- Post URLs must stay `/posts/<slug>/`; they match the previous Jekyll site and the stored Waline comments.
- MP3 files are hosted on Cloudflare R2 and are not in the repo; the base URL is `audioBase` in `src/config/site.ts`.
- On Windows open the folder with the exact casing it has on disk: building from a path with different letter case silently drops the CSS link from every page.
- Do not edit generated output: `dist/`, `.astro/`, `public/assets/thumbs/`.

## Documentation

- Astro: https://docs.astro.build
