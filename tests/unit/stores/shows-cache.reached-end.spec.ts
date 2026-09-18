import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INDEX_PAGE_COUNT } from '@/services/tvmaze/config';
import { useShowsStore } from '@/stores/shows';
import { INDEX_CACHE_KEY, type IndexCache } from '@/stores/shows-cache';
import { aShow } from '../components/builders';
import {
  activateBackgroundPinia,
  genrePage,
  notFound,
  type PageResponder,
  releaseTimers,
  serveIndexPages,
  settleBackgroundPages,
  type StartedIndex,
  storeWithFirstPage,
  wholePage,
} from './background-harness';

const PAGE_ZERO = '0';
/** The page a cache of the whole budget leaves for `loadMore`: the index stops one before it. */
const PAGE_AFTER_THE_BUDGET = String(INDEX_PAGE_COUNT);
/** The pages a cache holds when a reader pressed Load more past the budget last visit. */
const PAGES_PAST_THE_BUDGET = INDEX_PAGE_COUNT + 2;
const PAGE_AFTER_THE_STORED_ONES = String(PAGES_PAST_THE_BUDGET);
const EXTRA_SHOW_COUNT = 10;
/** Ids well past the captured page 0, so a made-up page only ever widens the index. */
const FIRST_EXTRA_ID = 9500;

/** Page 0 answers and every later page is past the last page TVmaze has. */
const pageZeroThenTheEnd: PageResponder = (page) => (page === PAGE_ZERO ? wholePage() : notFound());

/** Every page answers, so the loop stops on the page budget and never sees a `404`. */
const everyPageAnswers: PageResponder = () => wholePage();

/** Unseen shows for whichever page is asked for, so a stray request answers and is recorded. */
const onePageOfMoreShows: PageResponder = () =>
  genrePage('Drama', EXTRA_SHOW_COUNT, FIRST_EXTRA_ID);

const storedIndex = (): unknown => JSON.parse(sessionStorage.getItem(INDEX_CACHE_KEY) ?? 'null');

/** A visit whose background loop ran past the last page TVmaze has. */
async function storeThatRanPastTheEnd(): Promise<StartedIndex> {
  const started = await storeWithFirstPage(pageZeroThenTheEnd);

  await settleBackgroundPages();

  return started;
}

/** A visit that spent the page budget without ever being answered `404`. */
async function storeThatSpentTheBudget(): Promise<StartedIndex> {
  const started = await storeWithFirstPage(everyPageAnswers);

  await settleBackgroundPages();

  return started;
}

/** The next tab on the same session storage: a second store over the cache the first one wrote. */
async function reloadTheTab(respond: PageResponder): Promise<StartedIndex> {
  setActivePinia(createTestingPinia({ stubActions: false, createSpy: vi.fn }));
  const requestedPages = serveIndexPages(respond);
  const store = useShowsStore();

  await store.loadIndex();

  return { store, requestedPages };
}

/** A tab whose reader pressed Load more past the page budget last visit, with pages still to come. */
function reloadPastTheBudget(): Promise<StartedIndex> {
  const cache: IndexCache = {
    savedAt: Date.now(),
    pagesLoaded: PAGES_PAST_THE_BUDGET,
    reachedEnd: false,
    shows: [aShow({ id: 9, name: 'Cached Drama', genres: ['Drama'] })],
  };

  sessionStorage.setItem(INDEX_CACHE_KEY, JSON.stringify(cache));

  return reloadTheTab(onePageOfMoreShows);
}

beforeEach(activateBackgroundPinia);

afterEach(releaseTimers);

describe('useShowsStore', () => {
  describe('when the loop has not been past the last page', () => {
    it('given page 0 with pages to come, when it lands, then the cache has not reached the end', async () => {
      await storeWithFirstPage(everyPageAnswers);

      expect(storedIndex()).toMatchObject({ reachedEnd: false });
    });

    it('given every page answered, when the page budget is spent, then the cache has not reached the end', async () => {
      await storeThatSpentTheBudget();

      expect(storedIndex()).toMatchObject({ reachedEnd: false });
    });

    it('given every page answered, when the page budget is spent, then the cache holds them all', async () => {
      await storeThatSpentTheBudget();

      expect(storedIndex()).toMatchObject({ pagesLoaded: INDEX_PAGE_COUNT });
    });
  });

  describe('when a page answers 404', () => {
    it('given a 404 past the last page, when the loop stops, then the cache has reached the end', async () => {
      await storeThatRanPastTheEnd();

      expect(storedIndex()).toMatchObject({ reachedEnd: true });
    });

    it('given a 404 past the last page, when the loop stops, then hasMorePages is false', async () => {
      const { store } = await storeThatRanPastTheEnd();

      expect(store.hasMorePages).toBe(false);
    });
  });

  describe('when a tab reloads over a cache that reached the end', () => {
    it('given a stored end, when the tab reloads, then hasMorePages is false', async () => {
      await storeThatRanPastTheEnd();

      const { store } = await reloadTheTab(everyPageAnswers);

      expect(store.hasMorePages).toBe(false);
    });

    it('given a stored end, when the tab reloads, then no page is requested', async () => {
      await storeThatRanPastTheEnd();

      const { requestedPages } = await reloadTheTab(everyPageAnswers);

      expect(requestedPages).toEqual([]);
    });

    it('given a stored end, when loadMore runs after the reload, then no page is requested', async () => {
      await storeThatRanPastTheEnd();
      const { store, requestedPages } = await reloadTheTab(everyPageAnswers);

      await store.loadMore();

      expect(requestedPages).toEqual([]);
    });
  });

  describe('when a tab reloads over a cache that stopped on the page budget', () => {
    it('given a stored budget, when the tab reloads, then hasMorePages is true', async () => {
      await storeThatSpentTheBudget();

      const { store } = await reloadTheTab(everyPageAnswers);

      expect(store.hasMorePages).toBe(true);
    });

    it('given a stored budget, when the tab reloads, then the index counts as complete', async () => {
      await storeThatSpentTheBudget();

      const { store } = await reloadTheTab(everyPageAnswers);

      expect(store.isIndexComplete).toBe(true);
    });

    it('given a stored budget, when the timers run out, then the loop requests no page', async () => {
      await storeThatSpentTheBudget();
      const { requestedPages } = await reloadTheTab(everyPageAnswers);

      await settleBackgroundPages();

      expect(requestedPages).toEqual([]);
    });

    it('given a stored budget, when loadMore runs after the reload, then the page after it is requested', async () => {
      await storeThatSpentTheBudget();
      const { store, requestedPages } = await reloadTheTab(everyPageAnswers);

      await store.loadMore();

      expect(requestedPages).toEqual([PAGE_AFTER_THE_BUDGET]);
    });
  });

  describe('when a tab reloads over a cache of more pages than the budget', () => {
    it('given more pages than the budget, when the tab reloads, then hasMorePages is true', async () => {
      const { store } = await reloadPastTheBudget();

      expect(store.hasMorePages).toBe(true);
    });

    it('given more pages than the budget, when the tab reloads, then the index counts as complete', async () => {
      const { store } = await reloadPastTheBudget();

      expect(store.isIndexComplete).toBe(true);
    });

    it('given more pages than the budget, when loadMore runs, then the page after them is requested', async () => {
      const { store, requestedPages } = await reloadPastTheBudget();

      await store.loadMore();

      expect(requestedPages).toEqual([PAGE_AFTER_THE_STORED_ONES]);
    });
  });
});
