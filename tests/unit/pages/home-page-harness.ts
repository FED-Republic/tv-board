import type { TestingPinia } from '@pinia/testing';
import { createTestingPinia } from '@pinia/testing';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { HttpResponse, http } from 'msw';
import { setActivePinia } from 'pinia';
import { vi } from 'vitest';
import { nextTick } from 'vue';
import { createMemoryHistory, type Router } from 'vue-router';
import { type Genre, GRID_PAGE_SIZE, OTHER_GENRE, ROW_MIN_SHOWS } from '@/domain/genre';
import HomePage from '@/pages/HomePage.vue';
import { createAppRouter } from '@/router';
import { INDEX_PAGE_COUNT } from '@/services/tvmaze/config';
import { GENRE_CACHE_KEY } from '@/stores/shows-cache';
import { TEST_IDS } from '@/testing/test-ids';
import { server } from '../../msw/server';
import pageZeroPayload from '../../resources/shows-page-0.2026-09-16.json';

const INDEX_URL = 'https://api.tvmaze.com/shows';
/** Long enough for every background page timer to run out before the timers go back to real. */
const BACKGROUND_WINDOW_MS = 10_000;

/** The head of the captured page 0: real payloads, small enough to render every row quickly. */
export const FIRST_SHOWS = pageZeroPayload.slice(0, 30);

/** Rows the dashboard mounts on first paint; the rest wait for the reader to scroll near. */
export const EAGER_ROW_COUNT = 6;

/**
 * The rows `FIRST_SHOWS` fills, in row order: the genres `ROW_MIN_SHOWS` of those shows carry,
 * and `Other` last for every show that also lists a genre under the bar.
 */
export const INDEX_ROW_GENRES: readonly Genre[] = [
  'Drama',
  'Action',
  'Science-Fiction',
  'Horror',
  'Thriller',
  'Crime',
  'Supernatural',
  OTHER_GENRE,
];

export const INDEX_ROW_COUNT = INDEX_ROW_GENRES.length;

/** The seventh row `FIRST_SHOWS` fills, so it is the first one below the fold. */
export const SEVENTH_ROW_GENRE: Genre = 'Supernatural';

/** One show of the captured index page, as the API sends it. */
type PageShow = (typeof pageZeroPayload)[number];

/** The genre the paging payloads fill; the one the captured page carries most shows of. */
export const PAGED_GENRE: Genre = 'Drama';

/** Shows of `PAGED_GENRE` a first page carries when the grid should page through them. */
const CROWDED_GENRE_COUNT = 30;

/** Shows of `PAGED_GENRE` in `FIRST_SHOWS`; one grid page still holds every one of them. */
const NARROW_GENRE_COUNT = 23;

/** Shows of `PAGED_GENRE` once the page a reader asks for has landed. */
const WIDENED_GENRE_COUNT = 40;

/** The show's genres as plain strings; the JSON import types each list as its own literal tuple. */
const genreNames = (show: PageShow): readonly string[] => show.genres;

const showsCarrying = (genre: Genre): readonly PageShow[] =>
  pageZeroPayload.filter((show) => genreNames(show).includes(genre));

/** A first page whose `PAGED_GENRE` outgrows one grid page, so the grid can show more at once. */
export const CROWDED_FIRST_SHOWS: readonly PageShow[] = showsCarrying(PAGED_GENRE).slice(
  0,
  CROWDED_GENRE_COUNT,
);

/** A first page holding exactly one grid page of `PAGED_GENRE`: the grid opens on its boundary. */
export const BOUNDARY_FIRST_SHOWS: readonly PageShow[] = showsCarrying(PAGED_GENRE).slice(
  0,
  GRID_PAGE_SIZE,
);

/** Shows of `PAGED_GENRE` that `FIRST_SHOWS` does not carry: what one page more adds to a grid. */
export const EXTRA_GENRE_PAGE: readonly PageShow[] = showsCarrying(PAGED_GENRE).slice(
  NARROW_GENRE_COUNT,
  WIDENED_GENRE_COUNT,
);

const firstShowsCarrying = (genre: Genre): readonly PageShow[] =>
  FIRST_SHOWS.filter((show) => genreNames(show).includes(genre));

function listsOnly(show: PageShow, genre: Genre): boolean {
  const names = genreNames(show);

  return names.length === 1 && names[0] === genre;
}

/** A genre `FIRST_SHOWS` leaves one show short of `ROW_MIN_SHOWS`, so `Other` holds its shows. */
export const THIN_GENRE: Genre = 'Adventure';

/** The shows of `THIN_GENRE` the first page carries; too few for a row of their own. */
export const THIN_GENRE_SHOWS: readonly PageShow[] = firstShowsCarrying(THIN_GENRE);

/** A genre `FIRST_SHOWS` fills to exactly `ROW_MIN_SHOWS`: the bar includes the show on it. */
export const BAR_GENRE: Genre = SEVENTH_ROW_GENRE;

/** TVmaze's Survivor: the one captured show that lists `THIN_GENRE` and nothing else. */
const PROMOTING_SHOW_ID = 114;

/** A background page that takes `THIN_GENRE` over the bar; its show joins no other row. */
export const PROMOTING_PAGE_SHOWS: readonly PageShow[] = pageZeroPayload.filter(
  (show) => show.id === PROMOTING_SHOW_ID,
);

/** The show the promoting page brings, by the id its card carries. */
export const PROMOTED_SHOW_ID = PROMOTING_SHOW_ID;

/** Shows of `FIRST_SHOWS` that list a genre under the bar: what the `Other` row holds. */
export const OTHER_SHOW_COUNT = 15;

/** The only genre `EARNING_FIRST_SHOWS` fills, and the only row that page puts on screen. */
export const SOLE_ROW_GENRE: Genre = 'Comedy';

/** A first page that leaves `Other` empty: every show lists `SOLE_ROW_GENRE` and nothing else. */
export const EARNING_FIRST_SHOWS: readonly PageShow[] = pageZeroPayload
  .filter((show) => listsOnly(show, SOLE_ROW_GENRE))
  .slice(0, ROW_MIN_SHOWS);

/** A genre no page of the automatic budget fills, so its grid opens as an empty state. */
export const UNLOADED_GENRE: Genre = 'Medical';

/** The shows a page a reader asks for brings for `UNLOADED_GENRE`: what fills its empty grid. */
export const UNLOADED_GENRE_PAGE: readonly PageShow[] = showsCarrying(UNLOADED_GENRE);

/** The page past the automatic budget: the one a reader's Load more asks for. */
export const EXTRA_PAGE = String(INDEX_PAGE_COUNT);

const FIRST_PAGE = '0';

/** A page the store already holds, so a filler page moves the count without widening a row. */
const FILLER_SHOWS = FIRST_SHOWS.slice(0, 1);

export type PageResponder = (page: string) => Response | Promise<Response>;

export const notFound = (): Response => new HttpResponse(null, { status: 404 });

/** Answers page 0 with `shows` and every later page `404`, the way TVmaze ends its index. */
export function onlyFirstPageOf(shows: readonly PageShow[]): PageResponder {
  return (page) => (page === FIRST_PAGE ? HttpResponse.json(shows) : notFound());
}

export const firstPageOnly: PageResponder = onlyFirstPageOf(FIRST_SHOWS);

/** A page that answers with these shows, whichever page it is. */
export function servePage(shows: readonly PageShow[]): PageResponder {
  return () => HttpResponse.json(shows);
}

/** A page that never answers, so a spec can assert what the reader sees while it is on its way. */
export const neverAnswers: PageResponder = () => new Promise<Response>(() => undefined);

/** The page after the first one that TVmaze still has; the background loop asks for it next. */
const PROMOTING_PAGE = '1';

/** The captured first page, then one background page that takes `THIN_GENRE` over the bar. */
export const promotingThinGenre: PageResponder = (page) => {
  if (page === FIRST_PAGE) {
    return HttpResponse.json(FIRST_SHOWS);
  }

  return page === PROMOTING_PAGE ? HttpResponse.json(PROMOTING_PAGE_SHOWS) : notFound();
};

/** The genre whose shows earn a row of their own on page 0, so it heads the dashboard's first. */
export const STANDING_ROW_GENRE: Genre = 'Drama';

/** The captured shows whose only genre is `STANDING_ROW_GENRE`; exactly enough for its row. */
const STANDING_ROW_SHOWS: readonly PageShow[] = pageZeroPayload.filter((show) =>
  listsOnly(show, STANDING_ROW_GENRE),
);

/**
 * Page 0 earns `STANDING_ROW_GENRE` its row and leaves `SOLE_ROW_GENRE` one show short of one,
 * so its shows wait in `Other`; page 1 brings that show. Every show here lists a single genre,
 * so the promotion empties `Other` altogether, leaving a closing `Other` grid with neither a row
 * of its own nor an `Other` row to hand focus to.
 */
export const promotingSoleRowGenre: PageResponder = (page) => {
  if (page === FIRST_PAGE) {
    return HttpResponse.json([...STANDING_ROW_SHOWS, ...EARNING_FIRST_SHOWS.slice(0, -1)]);
  }

  return page === PROMOTING_PAGE ? HttpResponse.json(EARNING_FIRST_SHOWS.slice(-1)) : notFound();
};

export type DeferredPage = {
  /** The page the store asks for; it stays in flight until `answer` is called. */
  readonly respond: PageResponder;
  /** Answers the page and lets everything that waited on it settle. */
  readonly answer: () => Promise<void>;
};

/** A page that answers when the spec says so, so a spec can act while the reader waits for it. */
export function pageAnsweringOnDemand(respondWith: PageResponder): DeferredPage {
  let release = (): void => undefined;
  const asked = new Promise<void>((resolve) => {
    release = resolve;
  });

  async function respond(page: string): Promise<Response> {
    await asked;

    return respondWith(page);
  }

  async function answer(): Promise<void> {
    release();
    await flushPromises();
  }

  return { respond, answer };
}

/** Page 0 lands and the background page after it never answers, so the loop stays in flight. */
export const firstPageThenSilence: PageResponder = (page) =>
  page === FIRST_PAGE ? HttpResponse.json(FIRST_SHOWS) : neverAnswers(page);

/**
 * The whole automatic budget from `firstPage`, then `extra` for the page a Load more asks for.
 * The pages between repeat a show page 0 already carries, so only the first page and the extra
 * one change what a row holds.
 */
export function budgetOf(firstPage: readonly PageShow[], extra: PageResponder): PageResponder {
  return (page) => {
    if (page === FIRST_PAGE) {
      return HttpResponse.json(firstPage);
    }

    if (page === EXTRA_PAGE) {
      return extra(page);
    }

    return Number(page) < INDEX_PAGE_COUNT ? HttpResponse.json(FILLER_SHOWS) : notFound();
  };
}

/** The budget over the captured first page, then `extra` for the page a Load more asks for. */
export const budgetThen = (extra: PageResponder): PageResponder => budgetOf(FIRST_SHOWS, extra);

/** Answers the index endpoint with `respond` and records every page the store asked for. */
export function serveIndexPages(respond: PageResponder): string[] {
  const requestedPages: string[] = [];

  server.use(
    http.get(INDEX_URL, ({ request }) => {
      const page = new URL(request.url).searchParams.get('page') ?? '';

      requestedPages.push(page);
      return respond(page);
    }),
  );

  return requestedPages;
}

export function createDashboardPinia(): TestingPinia {
  const pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });

  setActivePinia(pinia);

  return pinia;
}

/** Mounts the dashboard on `location`; the router comes back for the query assertions. */
export async function renderDashboardAt(pinia: TestingPinia, location: string): Promise<Router> {
  const router = createAppRouter(createMemoryHistory());

  await router.push(location);
  await router.isReady();
  render(HomePage, { global: { plugins: [pinia, router] } });
  await nextTick();

  return router;
}

/** The dashboard with page 0 already landed; background pages are still on their way. */
export async function renderLoadedDashboardAt(
  pinia: TestingPinia,
  location = '/',
): Promise<Router> {
  serveIndexPages(firstPageOnly);

  const router = await renderDashboardAt(pinia, location);

  await settleFirstPage();

  return router;
}

export type LoadedDashboard = {
  /** Every index page the store asked for, in order; the array fills as the requests land. */
  readonly requestedPages: readonly string[];
  readonly router: Router;
};

/** The dashboard on `location` with page 0 landed; the background loop has not started yet. */
export async function loadDashboardAt(
  pinia: TestingPinia,
  location: string,
  respond: PageResponder,
): Promise<LoadedDashboard> {
  const requestedPages = serveIndexPages(respond);
  const router = await renderDashboardAt(pinia, location);

  await settleFirstPage();

  return { requestedPages, router };
}

/** The same dashboard with its automatic budget spent, so only a press loads another page. */
export async function loadSettledDashboardAt(
  pinia: TestingPinia,
  location: string,
  respond: PageResponder,
): Promise<LoadedDashboard> {
  const loaded = await loadDashboardAt(pinia, location, respond);

  await settleBackgroundLoading();

  return loaded;
}

/** Only the first page; the timers stay still, so background loading does not start. */
export async function settleFirstPage(): Promise<void> {
  await flushPromises();
}

/** Lets the background loader finish so its timers never leak into the next test. */
export async function settleBackgroundLoading(): Promise<void> {
  await vi.advanceTimersByTimeAsync(BACKGROUND_WINDOW_MS);
}

/** The page a press starts: its idle callback runs and the request it makes lands. */
export async function settleRequestedPage(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
  await flushPromises();
}

/** Leaves the dashboard the way a route change does, so its scope and its effects are disposed. */
export const leaveDashboard = (): void => cleanup();

export const queryAt = (router: Router): Record<string, unknown> => ({
  ...router.currentRoute.value.query,
});

export const dashboard = (): HTMLElement => screen.getByTestId(TEST_IDS.dashboardPage);

/** The dashboard's own live region, by test id: an open grid puts a second `status` on the page. */
export const statusText = (): string =>
  screen.getByTestId(TEST_IDS.dashboardStatus).textContent?.trim() ?? '';

export const rowGenres = (): readonly string[] =>
  screen.getAllByTestId(TEST_IDS.genreRow).map((row) => row.dataset['genre'] ?? '');

export const rowHeadings = (): readonly string[] =>
  screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent?.trim() ?? '');

export const placeholderRowGenres = (): readonly string[] =>
  screen.getAllByTestId(TEST_IDS.genreRowSkeleton).map((row) => row.dataset['genre'] ?? '');

export const placeholderRowHeadings = (): readonly string[] =>
  screen
    .getAllByTestId(TEST_IDS.genreRowSkeletonHeading)
    .map((heading) => heading.textContent?.trim() ?? '');

/** The row on screen for the genre; a row the reader cannot reach is a failure worth naming. */
export function rowNamed(genre: Genre): HTMLElement {
  const rows = screen.getAllByTestId(TEST_IDS.genreRow);
  const row = rows.find((candidate) => candidate.dataset['genre'] === genre);

  if (row === undefined) {
    throw new Error(`the dashboard should have mounted the ${genre} row`);
  }

  return row;
}

/** The heading of a row on screen, the element a revealed row hands focus to. */
export const rowHeadingFor = (genre: Genre): HTMLElement =>
  within(rowNamed(genre)).getByTestId(TEST_IDS.genreRowHeading);

/** The shows an element renders, by the TVmaze id their cards carry, in the order on screen. */
export const cardIdsIn = (element: HTMLElement): readonly number[] =>
  within(element)
    .queryAllByTestId(TEST_IDS.showCard)
    .map((card) => Number(card.dataset['showId']));

/** The shows a row renders; the cap keeps it to the row's top-rated shows. */
export const rowShowIds = (genre: Genre): readonly number[] => cardIdsIn(rowNamed(genre));

/** The ids of captured shows, to compare with the cards a row or a grid renders. */
export const showIdsOf = (shows: readonly PageShow[]): readonly number[] =>
  shows.map((show) => show.id);

export const grid = (): HTMLElement => screen.getByTestId(TEST_IDS.genreGrid);

export const gridShowIds = (): readonly number[] => cardIdsIn(grid());

export const gridCardCount = (): number => within(grid()).getAllByTestId(TEST_IDS.showCard).length;

export const gridCountLine = (): string =>
  screen.getByTestId(TEST_IDS.genreGridCount).textContent ?? '';

export const gridHeadingFor = (genre: Genre): HTMLElement =>
  screen.getByRole('heading', { level: 2, name: genre });

export const emptyState = (): HTMLElement => screen.getByTestId(TEST_IDS.emptyState);

export const buttonNamed = (name: string): HTMLElement => screen.getByRole('button', { name });

/** The one more-shows control, by the hook the QA suite clicks. */
export const moreShowsButton = (): HTMLElement => screen.getByTestId(TEST_IDS.moreShowsButton);

/** The line that stands where the more-shows button stood once TVmaze has no page left. */
export const moreShowsEndNote = (): HTMLElement => screen.getByTestId(TEST_IDS.moreShowsEnd);

/** Presses a control and lets the request or the navigation behind it settle. */
export async function pressAndSettle(name: string): Promise<void> {
  await fireEvent.click(buttonNamed(name));
  await flushPromises();
}

export const rememberGenres = (genres: readonly Genre[]): void =>
  localStorage.setItem(GENRE_CACHE_KEY, JSON.stringify(genres));
