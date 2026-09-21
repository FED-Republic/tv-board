import type { TestingPinia } from '@pinia/testing';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  releaseTimers,
  serveIndexPages,
  settleBackgroundPages,
} from '../stores/background-harness';
import { createTestRouter } from './test-router';
import { withSetup } from './with-setup';

type GenreGrid = ReturnType<typeof useGenreGrid>;
type Harness = {
  readonly grid: GenreGrid;
  readonly router: Router;
};

const DRAMA_GRID = '/?genre=Drama';
const COMEDY_GRID = '/?genre=Comedy';
/** The page past the automatic budget: the one a reader's press asks for. */
const EXTRA_PAGE = String(INDEX_PAGE_COUNT);
const EXTRA_SHOW_COUNT = 10;
/** Ids past everything the first page carries, so a made-up page only ever widens the index. */
const FIRST_EXTRA_ID = 9500;

/** Page 0: Drama at the row minimum beside a Comedy short of it. */
const FIRST_PAGE_SHOWS = [...DRAMA_AT_THE_BAR, ...COMEDY_UNDER_THE_BAR];

const repeatsTheFirstPage = (): Response => pageOf(FIRST_PAGE_SHOWS);

/** A page that never answers, so a spec can read what the reader sees while it is on its way. */
const neverAnswers = (): Promise<Response> => new Promise<Response>(() => undefined);

/**
 * The whole automatic budget from page 0's shows, then `extra` for the page a press asks for.
 * The pages between repeat page 0, so only the press ever widens the index.
 */
const budgetThen =
  (extra: PageResponder): PageResponder =>
  (page) =>
    page === EXTRA_PAGE ? extra(page) : repeatsTheFirstPage();

/** Page 0 answers and TVmaze has nothing after it, so a press has no page to start. */
const endsAfterTheFirstPage: PageResponder = (page) =>
  page === '0' ? repeatsTheFirstPage() : notFound();

/** Page 0 answers and the background loop's next page never does. */
const firstPageThenSilence: PageResponder = (page) =>
  page === '0' ? repeatsTheFirstPage() : neverAnswers();

let pinia: TestingPinia;

/** The grid on `location` with page 0 landed; the background loop is still on its way. */
async function mountGridAt(location: string, respond: PageResponder): Promise<Harness> {
  serveIndexPages(respond);
  const store = useShowsStore();

  await store.loadIndex();

  const router = await createTestRouter(location);
  const { result } = withSetup(() => useGenreGrid(), [pinia, router]);

  return { grid: result, router };
}

/** The same grid with the automatic budget spent, so only a press loads another page. */
async function mountSettledGrid(respond: PageResponder): Promise<Harness> {
  const harness = await mountGridAt(DRAMA_GRID, respond);

  await settleBackgroundPages();

  return harness;
}

/** The reader's press and the request it starts, up to the answer TVmaze gives it. */
async function pressAndSettle(grid: GenreGrid): Promise<void> {
  grid.askForPage();
  await flushPromises();
}

/** The report a settled grid holds once the page its press asked for has answered. */
async function reportAfterPressing(extra: PageResponder): Promise<PageReport | null> {
  const { grid } = await mountSettledGrid(budgetThen(extra));

  await pressAndSettle(grid);

  return grid.pageReport.value;
}

beforeEach(() => {
  vi.useFakeTimers();
  pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  setActivePinia(pinia);
});

afterEach(releaseTimers);

describe('useGenreGrid', () => {
  describe('when no page has been asked for', () => {
    it('given a settled grid, when it is read, then no page is awaited', async () => {
      const { grid } = await mountSettledGrid(budgetThen(neverAnswers));

      expect(grid.isAwaitingPage.value).toBe(false);
    });

    it('given a settled grid, when it is read, then it has no report', async () => {
      const { grid } = await mountSettledGrid(budgetThen(neverAnswers));

      expect(grid.pageReport.value).toBeNull();
    });
  });

  describe('when the reader asks for a page', () => {
    it('given a page the store started, when it is on its way, then the page is awaited', async () => {
      const { grid } = await mountSettledGrid(budgetThen(neverAnswers));

      await pressAndSettle(grid);

      expect(grid.isAwaitingPage.value).toBe(true);
    });

    it('given a page the store started, when it is on its way, then there is no report yet', async () => {
      const { grid } = await mountSettledGrid(budgetThen(neverAnswers));

      await pressAndSettle(grid);

      expect(grid.pageReport.value).toBeNull();
    });

    it('given the background loop already loading, when the reader presses, then the page is awaited', async () => {
      const { grid } = await mountGridAt(DRAMA_GRID, firstPageThenSilence);

      await pressAndSettle(grid);

      expect(grid.isAwaitingPage.value).toBe(true);
    });

    it('given no page left at TVmaze, when the reader presses, then nothing is awaited', async () => {
      const { grid } = await mountSettledGrid(endsAfterTheFirstPage);

      await pressAndSettle(grid);

      expect(grid.isAwaitingPage.value).toBe(false);
    });

    it('given no page left at TVmaze, when the reader presses, then nothing is reported', async () => {
      const { grid } = await mountSettledGrid(endsAfterTheFirstPage);

      await pressAndSettle(grid);

      expect(grid.pageReport.value).toBeNull();
    });
  });

  describe('when the page the reader asked for answers', () => {
    it('given a page of Drama shows, when it lands, then the report counts what it brought', async () => {
      const report = await reportAfterPressing(() =>
        genrePage('Drama', EXTRA_SHOW_COUNT, FIRST_EXTRA_ID),
      );

      expect(report).toEqual({ loaded: EXTRA_SHOW_COUNT, inGenre: EXTRA_SHOW_COUNT });
    });

    it('given a page without a Drama show, when it lands, then the report counts none for the genre', async () => {
      const report = await reportAfterPressing(() =>
        genrePage('Horror', EXTRA_SHOW_COUNT, FIRST_EXTRA_ID),
      );

      expect(report).toEqual({ loaded: EXTRA_SHOW_COUNT, inGenre: 0 });
    });

    it('given a page of shows the index holds, when it lands, then the report counts nothing', async () => {
      const report = await reportAfterPressing(repeatsTheFirstPage);

      expect(report).toEqual({ loaded: 0, inGenre: 0 });
    });

    it('given a page that answers 404, when the index ends, then the report counts nothing', async () => {
      const report = await reportAfterPressing(notFound);

      expect(report).toEqual({ loaded: 0, inGenre: 0 });
    });

    it('given a page that landed, when the report arrives, then no page is awaited any more', async () => {
      const { grid } = await mountSettledGrid(
        budgetThen(() => genrePage('Drama', EXTRA_SHOW_COUNT, FIRST_EXTRA_ID)),
      );

      await pressAndSettle(grid);

      expect(grid.isAwaitingPage.value).toBe(false);
    });

    it('given a report on screen, when the reader presses again, then it is cleared at once', async () => {
      const { grid } = await mountSettledGrid(budgetThen(repeatsTheFirstPage));
      await pressAndSettle(grid);

      grid.askForPage();

      expect(grid.pageReport.value).toBeNull();
    });
  });

  describe('when the reader moves to another genre', () => {
    it('given a report on the Drama grid, when the genre changes, then the report is cleared', async () => {
      const { grid, router } = await mountSettledGrid(budgetThen(repeatsTheFirstPage));
      await pressAndSettle(grid);

      await router.push(COMEDY_GRID);

      expect(grid.pageReport.value).toBeNull();
    });

    it('given a page on its way, when the genre changes, then nothing is awaited any more', async () => {
      const { grid, router } = await mountSettledGrid(budgetThen(neverAnswers));
      await pressAndSettle(grid);

      await router.push(COMEDY_GRID);

      expect(grid.isAwaitingPage.value).toBe(false);
    });
  });
});
