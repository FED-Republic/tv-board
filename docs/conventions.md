# Conventions

The contract for this codebase: short and checkable. The `reviewer` agent cites these sections.
Decisions and their reasons live in `DECISIONS.md`; TVmaze specifics in `docs/tvmaze-api.md`.

## Architecture

Dependencies point inward only; `no-restricted-imports` blocks in `eslint.config.js` (`app/layers-*`,
`app/dto-boundary`) enforce it:

```
pages → components → composables → stores → domain
                                              ↑
                                   services ──┘
```

Target layout (folders appear as the items in `PROGRESS.md` land):

```
src/
  main.ts, App.vue
  router/       explicit route records; detail, search and saved-show pages lazy-loaded
  styles/       tokens.css (the only file with literal values), global.css
  lib/          platform helpers with no app imports: scroll-behavior.ts, typing-target.ts
  domain/       pure TypeScript: show.ts (Show, ShowDetail), genre.ts, rating.ts, summary.ts, show-facts.ts, show-count.ts, dashboard-copy.ts, saved.ts, async-state.ts, api-error.ts, load-error.ts, not-found-error.ts, assert-never.ts; no Vue, Pinia or HTTP imports
  services/     http/ (client)  tvmaze/ (schema, endpoints, mappers)
  stores/       shows.ts (+ shows-cache.ts, shows-scheduler.ts), saved.ts (Pinia setup stores)
  composables/  useAsyncResource, useRowScroll, useDragScroll, useNearViewport, useRevealOnMount, useRevealInPlace, useTheme, useGenreFilter, useGenreView, useGenreGrid, useFrozenGenreLayout, useSearchQuery, useSearchResults, useSavedShows, useShowDetail, useElementListeners
  components/   ui/ (generic; no domain types, no store)  show/ (plus eager-posters.ts, one constant)  search/  app/ (shell: header, nav, theme toggle)
  pages/        one file per route (`SavedShowsPage.vue` serves both `/bookmarked` and `/liked`); orchestration only, no business logic
  testing/      test-ids.ts
tests/          mirrors src/ (see Testing)
```

- A DTO never leaves `services/`; `mappers.ts` converts it to a domain model at the boundary.
- Components never call HTTP and never see a DTO. `components/ui/` sees no domain types and no store.
- A store exists only for state fetched once, or chosen by the user, and read by more than one route. Everything else stays local: a composable may call an endpoint in `services/tvmaze/endpoints.ts` for route-local data (search), never `services/http/` and never a schema or mapper.
- `lib/` holds platform helpers that import nothing from the app; every layer may use it.
- No SSR, meta-framework, UI kit or carousel library. A new runtime dependency needs a line in `DECISIONS.md`.

## TypeScript

Flags beyond `strict`: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
`noFallthroughCasesInSwitch`, `erasableSyntaxOnly`, `verbatimModuleSyntax`. Type-check covers `src/` and `tests/`.

- Wire types are inferred from Zod schemas with `z.infer`. Never a hand-written DTO interface.
- Ids are branded: `type ShowId = number & { readonly __brand: 'ShowId' }`, minted only by
  `toShowId()` in `domain/show.ts`, which narrows through the `isShowId` type predicate (positive
  integer) and throws otherwise. No cast and no Zod in `domain/`.
- Loading and error state is `AsyncState<T>` from `domain/async-state.ts`. Never separate booleans.
- `assertNever(x)` closes every `switch` over a union.
- Closed sets are `as const` arrays with a derived union (`GENRES`, `TEST_IDS`). No `enum`.
- `readonly` on every array or object prop and on every domain collection.
- Router meta is typed through `declare module 'vue-router'`; env through `src/env.d.ts`. No `as string`.
- Forbidden: `any`, `@ts-ignore`, `@ts-expect-error`, the `Function` and `object` types, and in `src/` also non-null `!` and `as` casts other than `as const` (a value narrows through a type guard or a schema instead). Specs may use `!` after an assertion and a cast to feed a deliberately wrong value into a guard. Lint enforces all of these (`no-explicit-any`, `ban-ts-comment`, `no-non-null-assertion`, `consistent-type-assertions`).

## API layer

- `services/http/client.ts` is a thin `fetch` wrapper. It accepts an `AbortSignal`, times out each attempt with `AbortSignal.timeout`, and maps failures to `NetworkError | HttpError(status) | ValidationError(issues) | AbortError` (`domain/api-error.ts`, so pages can name them).
- Retries: `429` with exponential back-off and jitter, at most 3 attempts, honouring a `Retry-After` of up to 10 s; `5xx` once, on its own counter; other `4xx` never.
- `services/tvmaze/schema.ts` is the only definition of TVmaze shapes: `showListItemSchema` for what a card needs, `showSchema` for the detail page (`GET /shows/:id` without embeds; no cast or seasons in the design). List endpoints parse item by item and drop what does not match, so one odd show never empties a page; a list where nothing matches is a `ValidationError`. `getShow` stays strict. `endpoints.ts` parses each response once (a list body once as a list, then each item once) and returns domain models (`Show` for lists, `ShowDetail` for the detail page); `getShows(ids)` fetches a batch at most four at a time and returns what resolved, the ids that answered `404` (the store stops asking for them) and the first other failure. `mappers.ts` turns nullables into explicit domain values.
- Errors surface as values inside `AsyncState<T, LoadError>` (`domain/load-error.ts`), never as exceptions thrown into components; `describeLoadFailure` turns one into the page copy. Nothing logs to the console.

## State

- Pinia setup stores. They expose `computed` selectors, never raw mutable state; consumers use `storeToRefs`.
- `shows`: `index: Map<ShowId, Show>` (list model only) merged idempotently by id; loader progress; `byGenre` computed through `domain/genre.ts` with `ROW_SHOW_LIMIT` (25) top-rated shows per row and a `total` per genre, the rest staying in the index; persisted to `sessionStorage` under a key that carries a shape version (`tv-board.index.v4`), checked field by field on read, and reused when younger than 24 h. `indexState` carries the loaded shows, so the async root reports what the reader can see. Show details are fetched through `loadShowDetail` and kept in memory for the session. The genre names alone (`knownGenres`) are kept in `localStorage` under `tv-board.genres` and name the placeholder rows while the index loads; storage read and write live in `stores/shows-cache.ts`, the idle and spacing timers in `stores/shows-scheduler.ts` (with a `setTimeout` fallback where `requestIdleCallback` is missing). `genreShows(genre)` returns every loaded show of the genre, uncapped and in rating order, for the genre grid. `hasMorePages` turns false once a page has answered `404`, and that answer is stored in the index cache (`reachedEnd`) rather than inferred from the page count on the next visit. `loadMore()` fetches the next page the index has not asked for when the reader asks for it, through the same loop, retry and persistence rules as a background page, and carries on to the budget if the loop had stopped short of it; it ignores the press while a page is already on its way.
- Row minimum: a genre earns a row of its own only once `ROW_MIN_SHOWS` (5) loaded shows carry it. Below that its shows sit in `Other`, which is never itself measured against the minimum and is omitted only when it holds nothing. A show joins every genre of its own that earns a row, and `Other` as well when one of them does not; an unknown genre string is not one of them, so it sends nothing to `Other`. The genres that earn a row are one explicit `GenreLayout` handed to both `groupByGenre` and `showsInGenre`, so a row and its grid can never disagree.
- The layout freezes while the reader has the `Other` grid open (`setGenreLayoutFrozen(true)`), so a genre that crosses the minimum under them keeps its shows in the grid until it closes. The pin is taken on the first merge that brings a corpus, never before — taken during `setup()` on a cold `?genre=Other` link it would pin an empty layout and drop the whole index into one `Other` row. The genres a pin names are kept out of the genre cache, and the release writes them.
- The background page loop retries a failed page once, `PAGE_RETRY_DELAY_MS` (5 s) later, and gets its budget back on a page that lands or a loop that resumes; without it a reader who never leaves the dashboard keeps the rows the visit opened with, since `loadState` stays `success` behind them and `retry()` only acts on an error. A `404` past the last page means completion and a `429` is left to the HTTP client's own back-off, so neither spends the budget. `isLoadingMore` stays true across the pause so a remount cannot start a second loop, which also keeps a filling row's trailing placeholder for those 5 s. A second failure stops the loop quietly and leaves the rows on screen.
- Search has no store: `useSearchQuery` writes the field's text to `?q=` 300 ms after the last keystroke, `useSearchResults` requests on every query change, aborts the previous request and ignores a stale reply.
- `useAsyncResource(source, load)` is the one way a composable turns a fetch into an `AsyncState`: abort on change, late results ignored, sync results without a loading state.
- Genre filter: the header select mirrors to `?genre=`; the URL is the only source of truth (no store). The dashboard shows that genre as a grid (`GenreGrid`), reached from the select or a row's expand button and left through its close button, which puts the page back at the offset the rows had when the grid opened (`useGenreView`). The grid opens on `GRID_PAGE_SIZE` (25) shows and grows by 25 a press, one page of headroom at most, of its one more-shows control (`MoreShows`, shared with the empty state), which turns into "Load more" and calls `loadMore()` once it holds every loaded show of the genre — a press grows the grid by a page either way, so the shows a page brings render as they land. The grid's count line ("Top 25 of 84 loaded shows") is `role="status"`, so it announces itself whenever the genre widens — on a press, and on a background page that brings the genre shows while the grid is open; a press that brings the genre nothing changes nothing and says nothing, which is the affordance this build deliberately does without. The rows keep their 25-card cap. Saved grids and search results filter by it through `hasGenre`, which stays the plain, corpus-independent rule: the grid of a genre under the row minimum still lists its loaded shows, only `Other`'s grid follows the layout, and closing a grid whose genre earned no row hands focus to the `Other` row instead (`revealTargetOf`).
- `saved`: `bookmarks` and `likes`, each a `ReadonlySet<ShowId>` behind a `toggle(kind, id)` action and one `idsOf(kind)` reader. Ids only, never `Show` objects. Persisted to `localStorage` as JSON arrays under `tv-board.bookmarks` and `tv-board.likes` on every change; an unreadable or malformed value loads as an empty set, and a failed write never reaches the UI.
- Saved-show grids resolve ids against the `shows` index first and fetch the rest with `GET /shows/:id`; the grid is one `AsyncState`, `empty` when nothing is saved. Order comes from `sortByRating` in `domain/genre.ts`.
- `AsyncState` is the only representation of loading and error, mirrored to `data-state` on the async root.

## Components

- `<script setup lang="ts">` only. Props typed by a named `Props` type and destructured with defaults; emits, slots and models typed; generics through `generic="T"`.
- `useId()` for ids, `useTemplateRef()` for refs, `onWatcherCleanup()` inside watchers.
- `inheritAttrs: false` plus an explicit `v-bind="$attrs"` when the root is not the interactive element.
- The root carries `data-testid` from `TEST_IDS`; async roots carry `data-state`.
- `SaveToggle.vue` is the only bookmark and like control: an icon button with `aria-pressed`, rendered as a sibling of the card link (never inside it) and as a labelled button on the detail page. It reads and writes the `saved` store; the card itself stays free of store access.
- Styles scoped, tokens only. Component tokens (`--card-w`) declared on the root replace size or variant props.
- One `v-html` in the codebase, in the sanitising `ShowSummary.vue`. ESLint blocks any other.
- Don't: prop-drill more than two levels; `watch` a store to copy state into a ref (the one exception is `useSearchQuery`, whose field text follows an external navigation); `nextTick` without a comment saying why.
- Every component has a spec at the mirrored path.

## Readability

The `readable-code` skill holds the full rules with examples; Prettier and ESLint (`app/readability`) enforce the mechanical part.

- One idea per line: one statement, one declaration, one type member. An element stays on one line while it fits in 100 columns; Prettier breaks it one attribute per line when it does not, and joins it again if broken by hand.
- `Props` is a named `type` with one member per line and `defineProps<Props>()` uses it; `Emits` and `Slots` get the same once they have more than one member.
- `<script setup>` sections in order: imports, macros, composables and stores, local state, computed, functions, effects, `defineExpose`; one blank line between sections, no section comments.
- A template expression is one property access, one call or one comparison; anything longer is a `computed` or a function. Markup branches with `v-if` / `v-else`, never a ternary.
- Guard clauses first, happy path last. Nesting stops at three levels; a function takes at most three parameters; every `if` has braces; no nested ternary.
- `function name()` for a body block, an arrow for a single expression; explicit return type on every export.
- Names are domain words: booleans read as questions, functions start with a verb, handlers with `on`, numbers carry their unit, magic values become `UPPER_SNAKE` constants.
- A function over about 30 lines or a `<script setup>` over about 60 is split.
- Comments say why, never what; no commented-out code, no `TODO`, no `eslint-disable`.

## Styling and responsive

- Three token tiers in `src/styles/tokens.css`: primitives (OKLCH and lengths, only here) → semantic (`--color-surface`) → component (`--card-w`). `--page-gutter` folds the safe-area insets in; `main` pads with it once and the dashboard bleeds out of it so rows reach the edge.
- `color-scheme: dark light` with `light-dark()`; dark is the default. Derived states through `color-mix()`, never a second hand-picked colour. `--color-border` (30 % of text) is for separators; `--color-border-control` (50 %, at least 3:1 in both themes) for the boundary of a field, select or button; `--color-accent-text` for accent words on a surface; `--color-accent-on-poster` pins the light gold for icons over a poster scrim. A browser without `light-dark()` gets the dark palette through one `@supports` block; the floor is Chrome 123, Safari 17.5, Firefox 120.
- Global utilities: `.visually-hidden` and `.heading-display` (the display face for row, grid and page headings); everything else is scoped.
- Fluid type with `clamp()`; `--font-display` (Bebas Neue) for the brand, row headings and the detail rating, `--font-ui` (Hanken Grotesk) for everything else, both self-hosted through Fontsource. Durations are tokens, zeroed under `prefers-reduced-motion`; the row progress bar runs on them.
- Theme: `color-scheme: dark light` on `:root`; the header toggle sets `data-theme` on `<html>` and persists it under `tv-board.theme`. Components never branch on theme; every colour resolves through `light-dark()`.
- Data-driven values through `v-bind()` in `<style>`, not inline styles.
- Mobile-first. Container queries for components; viewport queries only in the page shell and, for a shell-dependent token such as `--header-scroll-margin`, in `tokens.css`. Interaction by capability (`hover: hover`, `pointer: fine`), never by width.
- Rows: `overflow-x: auto`, `scroll-snap-type: x mandatory` (`none` while the row is still filling), `overscroll-behavior-x: contain`, `scrollbar-width: none`. `--card-w: clamp(8.5rem, 37cqw, 13rem)` inside a `75rem` container, so five cards fit at desktop and the next card peeks on phones. Arrows only on pointer devices; scroll distance is `clientWidth`. Page dots under every row on every device, one per `clientWidth` (the count is rounded, so an end sliver shorter than half a viewport joins the last page; any overflowing row has at least two, a row at its end is on its last page, and the last dot scrolls to the end), in a `role="group"`. The expand button is the last control in the heading strip, after the arrows. Mouse drag-to-scroll on pointer devices only, with a 4 px threshold before a drag swallows the click.
- Posters: cards load the `medium` image only (210 × 295 px, so `aspect-ratio: 210 / 295`); the detail page loads `original` at `2 / 3` (`--poster-ratio-original`, keyed off `data-source` in `ShowPoster`). No `srcset`: TVmaze has no size between the two. `loading="lazy"` everywhere except the first row, which gets `fetchpriority="high"`.
- `dvh` units, `env(safe-area-inset-*)`, `content-visibility: auto` on off-screen rows. Rows past the sixth mount through `DeferredBlock` (a named skeleton until `useNearViewport` sees the block within 600 px) and never unmount — not even behind an open grid, which hides them with `v-show` so every block keeps the content it had mounted and the page is exactly as tall as it was once the grid closes; rebuilt from scratch the rows come back deferred and are laid out at their 24 rem intrinsic guess (432 px against a real 485-521 px), and a page short of its real height clamps the scroll offset a close is restoring. No JavaScript in the layout path.

## Accessibility (WCAG 2.2 AA)

- Landmarks `header`, `main`, `nav`, and a skip link. On route change focus moves to `main` and the title updates, unless a text field, select or editable element has focus: typing in the search field navigates, and the reader keeps typing.
- The header `nav` links to All Genres, Bookmarked and Liked; the active link carries `aria-current="page"`. Nothing is colour-only.
- Bookmark and like toggles: `aria-pressed`, accessible name with the show ("Bookmark Breaking Bad", "Like Breaking Bad"); the detail page button reads "Bookmark" and "Like" in either state. State is announced by `aria-pressed` and shown by the filled icon and accent colour, never by a name change.
- A genre row is `<section aria-labelledby>` with `<ul>/<li>`. Cards are links named by their content, so the visible text is always in the name (WCAG 2.5.3); visually hidden separators make it read "Breaking Bad, rated 9.3, 2008" or "Ludwig, Not rated, 2011". The rating is an accent numeral plus a bar along the poster's bottom edge; an unrated card reads "Not rated" and has no bar.
- A scroll container has `tabindex="0"` and `role="group"` (a region per row would be thirty landmarks); arrow keys move between cards, Home and End jump. Arrow buttons have `aria-label` and are `disabled` at the ends. Page dots are buttons named "Page 2 of 5" inside a group named "Drama pages"; the current one carries `aria-current="page"` and stays focusable; past eight pages a plain "Page 3 of 15" replaces the dots. No live region announces the position. The dashboard has one `role="status"` for index loading, and an open grid adds the one on its count line; rows announce nothing themselves.
- The expand button is named "Show the Drama row as a grid" (the grid opens on the same 25 shows and can grow past them), the close button "Close Drama grid". The grid's count line is a `role="status"`, so the answer to a more-shows press reaches a reader who cannot see the grid grow; a background page that widens the open genre announces itself the same way. The grid's one more-shows button is named "Show more Drama shows" while the app holds shows it is not rendering and "Load more shows from TVmaze" once it does not; it is never disabled and never swapped for a second button, so a press cannot cost the reader their focus, and `aria-busy` marks the wait for a page the reader asked for, never for the background loop (the dashboard's one `role="status"` already announces "Loading more shows"). The press that spends TVmaze's last page replaces the button with the line "The whole TVmaze index is loaded." and moves focus there, but only when the removed button was still holding it, and a page that fills an empty genre reveals the grid it brings, so neither answer drops the reader on `<body>`. Opening the grid scrolls it to the top of the page and moves focus to its heading (`tabindex="-1"`); closing it puts the page back at the offset the rows had when the grid opened and only then names the revealed row, so focus lands on a heading that is on screen and nothing scrolls after it. A grid reached by its own `?genre=` link has no such offset and the page stays where it is. A revealed row scrolls itself into view only when its heading is not on screen, counting the band the sticky header covers (`--header-scroll-margin`), so focus is never handed to a heading the reader cannot see and a row they were looking at never moves. Those jumps and every restored history position use `behavior: 'instant'`, so no page-level scroll is ever animated; a direct load of `?genre=` moves no focus. The rows behind an open grid are `display: none`, so they stay out of the accessibility tree. A deferred row's placeholder keeps its `<h2>` in the accessibility tree, so heading navigation reaches every genre; the loading-state placeholders stay `aria-hidden`.
- Search: a `<label>` bound to the input; the result count in `aria-live="polite"`; `/` focuses the field.
- `:focus-visible` ring everywhere; never `outline: none` (a `box-shadow` replacement disappears under forced colours). Every control at least 44 × 44 px, except the row page dots, which may shrink to the 24 px WCAG 2.5.8 minimum when eight share a phone-width row.
- Images have a meaningful `alt`, except the poster inside a card, which is decorative (`alt=""`) because the card title names the show; the "No poster yet" fallback is `aria-hidden` only there. A link that opens a new tab says "(opens in a new tab)" in hidden text. No colour-only meaning. No autoplay.

## Testing

Vitest · Testing Library (Vue) · Vue Test Utils · MSW · jsdom. Explicit imports from `vitest`, no globals.

```
tests/
  setup.ts              MSW server lifecycle, Testing Library cleanup
  msw/handlers.ts       default handlers, reused everywhere
  resources/*.json      captured real TVmaze payloads (added with the API layer)
  unit/<mirror of src>/<Name>.spec.ts
  e2e/                  Playwright smoke suite (`npm run test:e2e`), phone and desktop projects on the production build, TVmaze answered from `resources/` through `page.route`
```

- One spec per source file at the mirrored path, plus `<Name>.<scenario>.spec.ts` companions when a spec outgrows about 200 lines, and `*-harness.ts` or `*-stub.ts` helper modules beside the specs they serve. TypeScript only.
- Nested `describe` per scenario; `it('given …, when …, then …')`.
- Assert behaviour and accessible output. Query by role or label first, `data-testid` second, never CSS classes. No snapshots.
- HTTP through MSW only. Never `vi.mock` a client or spy on `fetch`.
- Fake timers for debounce and retries; `flushPromises()` for reactivity; no `setTimeout` waits.
- `npm run validate` runs the suite with coverage and fails under 95 % statements, lines and functions or 90 % branches (`vite.config.ts`). Domain functions get exhaustive cases: empty input, nulls, ties, duplicates, unknown values.

| Layer                       | Must cover                                                                                                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain/`                   | every rule: null ratings, ties, multi-genre, unknown genre, empty input                                                                                                                                   |
| `services/tvmaze/schema.ts` | a real payload parses; missing field, wrong type, null image → `ValidationError`                                                                                                                          |
| `services/http/client.ts`   | 200, 404, 429 then success, network error, abort, timeout                                                                                                                                                 |
| `stores/`                   | merge idempotent; abort on unmount; cache hit skips the request; stale search ignored; `saved` toggles on and off, restores from `localStorage`, ignores malformed storage, survives a throwing `setItem` |
| `composables/`              | debounce timing; cleanup on change                                                                                                                                                                        |
| `components/`               | null poster fallback, keyboard navigation, empty and error states, emitted events                                                                                                                         |
| `pages/`                    | renders each `AsyncState`; saved-show grids render `empty` and fetch ids missing from the index                                                                                                           |

## QA hooks

- `data-testid` values come from `src/testing/test-ids.ts`, never literals. Naming `<component>-<element>[-<variant>]`, kebab-case, no ids or indexes.
- Identity is a separate attribute: `data-show-id`, `data-genre`, `data-kind="bookmarks|likes"` on saved-show grids.
- Async roots expose `data-state="idle|loading|success|error|empty"`; the dashboard also exposes `data-index-pages-loaded` and `data-index-complete`. A `DeferredBlock` exposes `data-rendered="true|false"`.
- Hooks go on the element that is clicked or asserted, not on a wrapper. They ship in production.

## Quality gates

- `npm run validate` = type-check + lint + format check + unit tests + build. It runs before every commit and again in GitHub Actions (`.github/workflows/validate.yml`) on every push and pull request.
- ESLint flat config with `--max-warnings 0`: `no-console`, `no-explicit-any`, `no-non-null-assertion` and `consistent-type-assertions` (`never`, `as const` exempt; both off in tests), `vue/no-v-html` (one override), script setup and type-based props and emits, `vue/attributes-order` (static before bound), the `eslint-plugin-vuejs-accessibility` recommended set, and the layer and DTO import boundaries. Prettier: 2 spaces, single quotes, semicolons, 100 columns, trailing commas, operators at line start; `format:check` is part of `validate`.
- Conventional Commits, one concern per commit. Work on `feat/*`, `fix/*`, `chore/*`; `main` stays green.
- Before submission: `npm run build && npm run preview` with zero console output; Lighthouse on `/` at Performance ≥ 90 on desktop (mobile is tracked in `docs/lighthouse.md`, 83 on the 2026-09-17 evening run), Accessibility 100, Best practices 100; README instructions verified on a clean clone.
- `index.html` preconnects to the API and poster hosts and preloads `/shows?page=0` only on `/` with no session index; the hosts and the cache key are literals and must match `TVMAZE_BASE_URL` and `INDEX_CACHE_KEY`, pinned by `tests/unit/index-html.spec.ts`.
- `src/main.ts` reloads the page on a stale chunk (`vite:preloadError`), routes uncaught app and router errors through `reportError`, and shows a plain message if the app cannot start.

## Definition of done

- [ ] Follows these conventions, including _Readability_; any new dependency, folder or pattern has a line in `DECISIONS.md`.
- [ ] No `any`, no casts, unions exhaustive, DTOs confined to `services/`.
- [ ] Mirrored spec exists with Given/When/Then titles and behaviour assertions.
- [ ] Components: tokens only, `data-testid` from `TEST_IDS`, `data-state` on async roots, accessibility checks above.
- [ ] `npm run validate` is green (delegate to `verifier`).
- [ ] Manual check: no console output, works at 390 px and 1440 px, keyboard-only pass.
- [ ] Conventional commit; `PROGRESS.md` updated.
