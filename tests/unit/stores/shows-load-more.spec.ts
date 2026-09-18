import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useShowsStore } from '@/stores/shows';
import { INDEX_CACHE_KEY } from '@/stores/shows-cache';
import {
  activateBackgroundPinia,
  genrePage,
  notFound,
  PAGE_ZERO_SHOW_COUNT,
  type PageResponder,
  releaseTimers,
  serveIndexPages,
  settleBackgroundPages,
  settleRetryPause,
  showsOf,
  type StartedIndex,
  storeWithFirstPage,
  unreachable,
  wholePage,
} from './background-harness';

const PAGE_ZERO = '0';
const PAGE_ONE = '1';
/** The pages the dashboard loads on its own; `INDEX_PAGE_COUNT` is five. */
const INDEX_PAGES = [PAGE_ZERO, PAGE_ONE, '2', '3', '4'];
/** The page only `loadMore` ever asks for. */
const PAGE_AFTER_THE_INDEX = '5';
const INDEX_PAGE_COUNT = INDEX_PAGES.length;
const PAGES_AFTER_LOAD_MORE = 6;
const EXTRA_SHOW_COUNT = 10;
/** Ids well past the captured page 0, so a made-up page only ever widens the index. */
const FIRST_EXTRA_ID = 9500;
const ATTEMPTS_WITH_ONE_RETRY = 2;

/** Page 0 answers and every later page is past the end of the index. */
const pageZeroOnly: PageResponder = (page) => (page === PAGE_ZERO ? wholePage() : notFound());

/** The whole index, then one more page of unseen shows for the grid to ask for. */
const indexThenOneMorePage: PageResponder = (page) =>
  INDEX_PAGES.includes(page) ? wholePage() : genrePage('Drama', EXTRA_SHOW_COUNT, FIRST_EXTRA_ID);

/** The whole index, with nothing left past it. */
const indexThenTheEnd: PageResponder = (page) =>
  INDEX_PAGES.includes(page) ? wholePage() : notFound();

/** The whole index, then a page that never reaches the server: the store's own retry covers it. */
const indexThenALostPage: PageResponder = (page) =>
  INDEX_PAGES.includes(page) ? wholePage() : unreachable();

const everyPageUnreachable: PageResponder = () => unreachable();

const storedIndexCache = (): unknown =>
  JSON.parse(sessionStorage.getItem(INDEX_CACHE_KEY) ?? 'null');

/** How many times the store asked the index endpoint for one page. */
const attemptsAt = (requestedPages: readonly string[], page: string): number =>
  requestedPages.filter((requested) => requested === page).length;

/** A store whose background loop has run out, so only `loadMore` asks for anything else. */
async function storeWithWholeIndex(respond: PageResponder): Promise<StartedIndex> {
  const started = await storeWithFirstPage(respond);

  await settleBackgroundPages();

  return started;
}

beforeEach(activateBackgroundPinia);

afterEach(releaseTimers);

describe('useShowsStore', () => {
  describe('when the index may still have pages', () => {
    it('given the first page loaded, when hasMorePages is read, then it is true', async () => {
      const { store } = await storeWithFirstPage(indexThenOneMorePage);

      expect(store.hasMorePages).toBe(true);
    });

    it('given the whole index by page count, when hasMorePages is read, then it stays true', async () => {
      const { store } = await storeWithWholeIndex(indexThenOneMorePage);

      expect(store.hasMorePages).toBe(true);
    });

    it('given a 404 past the last page, when hasMorePages is read, then it is false', async () => {
      const { store } = await storeWithWholeIndex(pageZeroOnly);

      expect(store.hasMorePages).toBe(false);
    });
  });

  describe('when the grid asks for one more page', () => {
    it('given the whole index, when loadMore runs, then the page after it is requested', async () => {
      const { store, requestedPages } = await storeWithWholeIndex(indexThenOneMorePage);

      await store.loadMore();

      expect(requestedPages).toEqual([...INDEX_PAGES, PAGE_AFTER_THE_INDEX]);
    });

    it('given the whole index, when loadMore lands, then six pages are loaded', async () => {
      const { store } = await storeWithWholeIndex(indexThenOneMorePage);

      await store.loadMore();

      expect(store.pagesLoaded).toBe(PAGES_AFTER_LOAD_MORE);
    });

    it('given the whole index, when loadMore lands, then its shows join the index', async () => {
      const { store } = await storeWithWholeIndex(indexThenOneMorePage);

      await store.loadMore();

      expect(showsOf(store.indexState)).toHaveLength(PAGE_ZERO_SHOW_COUNT + EXTRA_SHOW_COUNT);
    });

    it('given the whole index, when loadMore lands, then loading more is over', async () => {
      const { store } = await storeWithWholeIndex(indexThenOneMorePage);

      await store.loadMore();

      expect(store.isLoadingMore).toBe(false);
    });

    it('given the whole index, when loadMore lands, then the session cache holds six pages', async () => {
      const { store } = await storeWithWholeIndex(indexThenOneMorePage);

      await store.loadMore();

      expect(storedIndexCache()).toMatchObject({ pagesLoaded: PAGES_AFTER_LOAD_MORE });
    });
  });

  describe('when loadMore has nothing to ask for', () => {
    it('given a page already on its way, when loadMore runs again, then one page is requested', async () => {
      const { store, requestedPages } = await storeWithWholeIndex(indexThenOneMorePage);

      const pageInFlight = store.loadMore();
      await store.loadMore();
      await pageInFlight;

      expect(attemptsAt(requestedPages, PAGE_AFTER_THE_INDEX)).toBe(1);
    });

    it('given an index nobody loaded, when loadMore runs, then nothing is requested', async () => {
      const requestedPages = serveIndexPages(indexThenOneMorePage);
      const store = useShowsStore();

      await store.loadMore();

      expect(requestedPages).toEqual([]);
    });

    it('given a first page that failed, when loadMore runs, then nothing more is requested', async () => {
      const { store, requestedPages } = await storeWithFirstPage(everyPageUnreachable);

      await store.loadMore();

      expect(requestedPages).toEqual([PAGE_ZERO]);
    });

    it('given the end of the index, when loadMore runs, then nothing more is requested', async () => {
      const { store, requestedPages } = await storeWithWholeIndex(pageZeroOnly);

      await store.loadMore();

      expect(requestedPages).toEqual([PAGE_ZERO, PAGE_ONE]);
    });
  });

  describe('when loadMore runs past the last page', () => {
    it('given a 404 on the next page, when loadMore returns, then hasMorePages is false', async () => {
      const { store } = await storeWithWholeIndex(indexThenTheEnd);

      await store.loadMore();

      expect(store.hasMorePages).toBe(false);
    });

    it('given a 404 on the next page, when loadMore returns, then five pages are loaded', async () => {
      const { store } = await storeWithWholeIndex(indexThenTheEnd);

      await store.loadMore();

      expect(store.pagesLoaded).toBe(INDEX_PAGE_COUNT);
    });

    it('given a 404 on the next page, when loadMore returns, then loading more is over', async () => {
      const { store } = await storeWithWholeIndex(indexThenTheEnd);

      await store.loadMore();

      expect(store.isLoadingMore).toBe(false);
    });

    it('given a 404 on the next page, when the timers run out, then it is not asked for again', async () => {
      const { store, requestedPages } = await storeWithWholeIndex(indexThenTheEnd);

      await store.loadMore();
      await settleBackgroundPages();

      expect(attemptsAt(requestedPages, PAGE_AFTER_THE_INDEX)).toBe(1);
    });
  });

  describe('when the page loadMore asked for fails', () => {
    it('given a page that never answers, when loadMore returns, then loading more is still true', async () => {
      const { store } = await storeWithWholeIndex(indexThenALostPage);

      await store.loadMore();

      expect(store.isLoadingMore).toBe(true);
    });

    it('given a page that never answers, when the retry pause passes, then it is asked for twice', async () => {
      const { store, requestedPages } = await storeWithWholeIndex(indexThenALostPage);

      await store.loadMore();
      await settleRetryPause();

      expect(attemptsAt(requestedPages, PAGE_AFTER_THE_INDEX)).toBe(ATTEMPTS_WITH_ONE_RETRY);
    });

    it('given a page that never answers, when both attempts are spent, then loading more is over', async () => {
      const { store } = await storeWithWholeIndex(indexThenALostPage);

      await store.loadMore();
      await settleBackgroundPages();

      expect(store.isLoadingMore).toBe(false);
    });

    it('given a page that never answers, when both attempts are spent, then the state stays success', async () => {
      const { store } = await storeWithWholeIndex(indexThenALostPage);

      await store.loadMore();
      await settleBackgroundPages();

      expect(store.indexState.status).toBe('success');
    });

    it('given a page that never answers, when both attempts are spent, then hasMorePages stays true', async () => {
      const { store } = await storeWithWholeIndex(indexThenALostPage);

      await store.loadMore();
      await settleBackgroundPages();

      expect(store.hasMorePages).toBe(true);
    });
  });
});
