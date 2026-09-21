/** The shared setup for the specs on the page a press of the grid's more-shows control buys. */

import type { TestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import type { Router } from 'vue-router';
import { useGenreGrid } from '@/composables/useGenreGrid';
import type { PageReport } from '@/domain/dashboard-copy';
import { INDEX_PAGE_COUNT } from '@/services/tvmaze/config';
import { useShowsStore } from '@/stores/shows';
import {
  COMEDY_UNDER_THE_BAR,
  DRAMA_AT_THE_BAR,
  genrePage,
  notFound,
  pageOf,
  type PageResponder,
  serveIndexPages,
  settleBackgroundPages,
} from '../stores/background-harness';
import { createTestRouter } from './test-router';
import { withSetup } from './with-setup';

export type GenreGrid = ReturnType<typeof useGenreGrid>;
export type ShowsStore = ReturnType<typeof useShowsStore>;
export type GridHarness = {
  readonly grid: GenreGrid;
  readonly store: ShowsStore;
  readonly router: Router;
};

export const DRAMA_GRID = '/?genre=Drama';
export const COMEDY_GRID = '/?genre=Comedy';
/** The page past the automatic budget: the one a reader's press asks for. */
export const EXTRA_PAGE = String(INDEX_PAGE_COUNT);
export const EXTRA_SHOW_COUNT = 10;
/** Ids past everything the first page carries, so a made-up page only ever widens the index. */
const FIRST_EXTRA_ID = 9500;

/** Page 0: Drama at the row minimum beside a Comedy short of it. */
const FIRST_PAGE_SHOWS = [...DRAMA_AT_THE_BAR, ...COMEDY_UNDER_THE_BAR];

export const repeatsTheFirstPage = (): Response => pageOf(FIRST_PAGE_SHOWS);

/** A page that never answers, so a spec can read what the reader sees while it is on its way. */
export const neverAnswers = (): Promise<Response> => new Promise<Response>(() => undefined);

/**
 * The whole automatic budget from page 0's shows, then `extra` for the page a press asks for.
 * The pages between repeat page 0, so only the press ever widens the index.
 */
export const budgetThen =
  (extra: PageResponder): PageResponder =>
  (page) =>
    page === EXTRA_PAGE ? extra(page) : repeatsTheFirstPage();

/** Page 0 answers and TVmaze has nothing after it, so a press has no page to start. */
export const endsAfterTheFirstPage: PageResponder = (page) =>
  page === '0' ? repeatsTheFirstPage() : notFound();

/** Page 0 answers and the background loop's next page never does. */
export const firstPageThenSilence: PageResponder = (page) =>
  page === '0' ? repeatsTheFirstPage() : neverAnswers();

/** Page 0's corpus, then a page of Drama shows of its own for every page the loop asks for. */
export const dramaOnEveryPage: PageResponder = (page) =>
  page === '0' ? repeatsTheFirstPage() : genrePage('Drama', EXTRA_SHOW_COUNT, firstIdOf(page));

/** Ids no other page uses, so every background page widens the index by its whole count. */
const firstIdOf = (page: string): number => FIRST_EXTRA_ID + Number(page) * EXTRA_SHOW_COUNT;

/** The grid on `location` with page 0 landed; the background loop is still on its way. */
export async function mountGridAt(
  pinia: TestingPinia,
  location: string,
  respond: PageResponder,
): Promise<GridHarness> {
  serveIndexPages(respond);
  const store = useShowsStore();

  await store.loadIndex();

  const router = await createTestRouter(location);
  const { result } = withSetup(() => useGenreGrid(), [pinia, router]);

  return { grid: result, store, router };
}

/** The same grid with the automatic budget spent, so only a press loads another page. */
export async function mountSettledGrid(
  pinia: TestingPinia,
  respond: PageResponder,
): Promise<GridHarness> {
  const harness = await mountGridAt(pinia, DRAMA_GRID, respond);

  await settleBackgroundPages();

  return harness;
}

/** The reader's press and the request it starts, up to the answer TVmaze gives it. */
export async function pressAndSettle(grid: GenreGrid): Promise<void> {
  grid.askForPage();
  await flushPromises();
}

/** The report a settled grid holds once the page its press asked for has answered. */
export async function reportAfterPressing(
  pinia: TestingPinia,
  extra: PageResponder,
): Promise<PageReport | null> {
  const { grid } = await mountSettledGrid(pinia, budgetThen(extra));

  await pressAndSettle(grid);

  return grid.pageReport.value;
}
