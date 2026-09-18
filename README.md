# TV Board

**Live: [tv-board.fed-republic.com](https://tv-board.fed-republic.com/)**

TV shows grouped by genre in horizontal rows, sorted by rating, with search, a detail page, and
bookmarked and liked shows saved on the device. Built on the
[TVmaze API](https://www.tvmaze.com/api) with Vue 3, TypeScript and Vite — no UI kit, no
carousel library.

## Features

- **Dashboard** — one horizontal row per genre, top 25 by rating. Scroll arrows on pointer
  devices, drag-to-scroll, keyboard navigation (arrows, Home, End), `scroll-snap` paging with
  dots that follow the scroll position. Page 0 of the TVmaze index renders immediately; later
  pages stream in behind a progress bar and rows re-sort as they land. The first six rows mount
  eagerly, the rest as you scroll near them. Each row expands into a grid and returns in place.
- **Show detail** — poster, rating, genre chips, facts (status, premiere, language, runtime,
  network, schedule), sanitised summary, bookmark and like, and a link back to TVmaze.
- **Search** — debounced, aborted on change, mirrored to `?q=`, always live against the API;
  `/` focuses the field from anywhere.
- **Bookmarked / Liked** — ids in `localStorage`, shown as grids resolved against the loaded
  index with the remainder fetched.
- **Genre filter** — a header select mirrored to `?genre=`, narrowing the dashboard, search
  results and saved grids.
- **Theme** — follows the system, with a header toggle that remembers the choice.
- Responsive from 320 px up, and accessible: landmarks, skip link, focus moved on navigation,
  `aria-pressed` toggles, WCAG 2.2 AA contrast in both themes.

## Run

Built and tested on Node 24.15.0 and npm 11.12.1 (`.nvmrc` pins the major, `packageManager` the
npm version). No environment variables are required; `.env.example` lists optional overrides.

```bash
nvm use
npm ci
npm run dev
```

```bash
npm test           # unit tests
npm run validate   # type-check + lint + format check + unit tests with coverage + build
npm run test:e2e   # Playwright smoke suite (npx playwright install chromium once)
npm run build && npm run preview
```


## Architecture

Dependencies point inward only, enforced by `no-restricted-imports` rules in `eslint.config.js`:

```
pages → components → composables → stores → domain ← services
```

```
src/
  router/       explicit routes; detail, search and saved pages lazy-loaded
  styles/       tokens.css (the only file with literal values), global.css
  lib/          platform helpers with no app imports
  domain/       pure TypeScript: models, rating, genre, summary, async state, errors
  services/     http/ (client, retry, abort)  tvmaze/ (Zod schema, endpoints, mappers)
  stores/       Pinia setup stores: shows index (+ cache, scheduler), saved ids
  composables/  16 units of reusable behaviour (async resource, row scroll, theme, filters…)
  components/   ui/ (generic)  show/  search/  app/ (shell)
  pages/        one file per route, orchestration only
tests/          mirrors src/
```

A DTO never leaves `services/`; a component never fetches; `components/ui/` sees no domain type
and no store.

## Why these choices

- **Vue 3, Composition API, `<script setup>` only.** Logic lives in typed functions that tests
  import directly, so most of the app is testable without mounting a component.
- **Vite SPA, no meta-framework.** Nothing here needs server rendering or a server at all; a
  static bundle deploys to the edge and stays cheap to reason about.
- **No UI kit, no Tailwind, no carousel.** Plain CSS with design tokens (OKLCH, `light-dark()`,
  container queries) covers the UI, and `scroll-snap` does the rows natively — fewer dependencies
  than a carousel library, and the horizontal rows behave the way the platform already does.
  Typefaces (Bebas Neue, Hanken Grotesk) are self-hosted via Fontsource, so nothing loads from a
  third party at runtime.
- **The rating is drawn, not badged.** Each card carries an accent numeral and a bar whose length
  is `(rating − 5) / 5`, so a row of twelve cards ranks at a glance. It is the one bold element.
- **Genres derived client-side from the show index**, because TVmaze has no genre endpoint. The
  index is 378 pages, so the dashboard loads the first five (about 1,200 shows) and re-sorts as
  they arrive; the index is cached in `sessionStorage` for a day, so a reload costs no request.
  Search always hits the API, never the local slice.
- **Zod at the API boundary.** TVmaze publishes no schema, so every response is validated once
  inside `services/` and wire types are inferred, never hand-written. List pages validate item by
  item, so one malformed show never empties the dashboard.
- **Two show models.** Cards, rows, search and the cache carry a light `Show`; the detail page
  fetches the full `ShowDetail` once per session. The cache stays small, and a `Show` field change
  versions the cache key.
- **Pinia only for state read by more than one route** (the index, saved ids). Everything else is
  component-local. The genre filter and search query live in the URL, the only place a
  bookmarkable, shareable filter can live.
- **Async state is one discriminated union** (`idle | loading | success | error`), mirrored to a
  `data-state` attribute — impossible states are unrepresentable, and tests wait on a real signal
  instead of a timeout.
- **Bookmarks and likes are ids**, never copies of show data, so saved shows never go stale. A
  single-device feature by design.
- **No `any`, no `@ts-ignore`, no non-null `!`, no casts, no `enum`** — enforced by lint, not by
  discipline.

## Testing

Vitest with Testing Library and Vue Test Utils, 122 spec files mirroring `src/`. HTTP is mocked
with MSW only, against captured TVmaze payloads, so retries, aborts and error mapping are
exercised for real. Domain logic is tested exhaustively (null ratings, ties, empty genres,
duplicates). Coverage is gated at 95 % statements and 90 % branches. A Playwright smoke suite
runs the production build in Chromium at phone and desktop widths.

## Assumptions and trade-offs

- "Sorted by rating" means highest first, unrated last, ties broken by id, so rows never shuffle
  between loads or visits.
- A show belongs to every genre it lists; shows without genres go to an "Other" row.
- Summaries are HTML from TVmaze, rendered through one sanitising component with a tag allow-list.
- The rate limit (20 requests / 10 s) is handled with back-off and retry, never surfaced as an
  error on first failure.
- Posters use TVmaze's 210 × 295 `medium` on cards and 2:3 `original` on the detail page, each box
  matching its image so nothing is cropped.
- Loading five index pages is a deliberate ceiling. A small backend-for-frontend that crawls the
  index and serves genre lists would remove it.
- Index pages are parsed on the main thread while the dashboard is visible, which costs LCP on
  slow connections (see [`docs/lighthouse.md`](docs/lighthouse.md)). Parsing in a worker, or
  deferring background pages until after the first interaction, is the next step.

## Docs

- [`docs/conventions.md`](docs/conventions.md) — the rules of the codebase, one checkable line each
- [`docs/tvmaze-api.md`](docs/tvmaze-api.md) — API shape, rate limit, loading and search strategy
- [`docs/lighthouse.md`](docs/lighthouse.md) — browser check and Lighthouse results
