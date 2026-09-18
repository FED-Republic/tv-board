import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MAX_RATE_LIMIT_ATTEMPTS } from '@/services/http/client';
import {
  activateBackgroundPinia,
  notFound,
  type PageResponder,
  rateLimited,
  releaseTimers,
  settleBackgroundPages,
  settleFailureBeforeRetry,
  settleFirstBackgroundPage,
  settleRetryPause,
  storeWithFirstPage,
  unreachable,
  wholePage,
} from './background-harness';

const PAGE_ZERO = '0';
const PAGE_ONE = '1';
const PAGE_TWO = '2';
const PAGE_ZERO_THEN_PAGE_ONE = [PAGE_ZERO, PAGE_ONE];
const TWO_PAGES_LOADED = 2;

/**
 * Fails a page as many times as its budget says before serving it, with a request that never
 * reaches the server: the HTTP client retries a `5xx` on its own, a network error only the store.
 */
function pagesFailing(failuresByPage: ReadonlyMap<string, number>): PageResponder {
  const budgetLeft = new Map(failuresByPage);

  return (page) => {
    const failuresLeft = budgetLeft.get(page) ?? 0;

    if (failuresLeft === 0) {
      return wholePage();
    }

    budgetLeft.set(page, failuresLeft - 1);
    return unreachable();
  };
}

const pageOneFailsOnce = (): PageResponder => pagesFailing(new Map([[PAGE_ONE, 1]]));

const pageOneThenPageTwoFail = (): PageResponder =>
  pagesFailing(
    new Map([
      [PAGE_ONE, 1],
      [PAGE_TWO, 2],
    ]),
  );

const pageOneNeverAnswers: PageResponder = (page) =>
  page === PAGE_ZERO ? wholePage() : unreachable();

/** Page 0 answers and every later page is past the end of the index. */
const pageZeroOnly: PageResponder = (page) => (page === PAGE_ZERO ? wholePage() : notFound());

/** Page 1 is rate limited however often it is asked for, page 0 answers. */
const pageOneRateLimited: PageResponder = (page) =>
  page === PAGE_ZERO ? wholePage() : rateLimited();

/** How many times the store asked the index endpoint for one page. */
const attemptsAt = (requestedPages: readonly string[], page: string): number =>
  requestedPages.filter((requested) => requested === page).length;

beforeEach(activateBackgroundPinia);

afterEach(releaseTimers);

describe('useShowsStore', () => {
  describe('when a background page is retried', () => {
    it('given a page that fails once, when the retry delay passes, then two pages are loaded', async () => {
      const { store } = await storeWithFirstPage(pageOneFailsOnce());

      await settleFirstBackgroundPage();
      await settleRetryPause();

      expect(store.pagesLoaded).toBe(TWO_PAGES_LOADED);
    });

    it('given a page that fails once, when the retry delay passes, then it is asked for twice', async () => {
      const { requestedPages } = await storeWithFirstPage(pageOneFailsOnce());

      await settleFirstBackgroundPage();
      await settleRetryPause();

      expect(requestedPages).toEqual([PAGE_ZERO, PAGE_ONE, PAGE_ONE]);
    });

    it('given a page that failed, when its retry is still pending, then loading more is true', async () => {
      const { store } = await storeWithFirstPage(pageOneFailsOnce());

      await settleFailureBeforeRetry();

      expect(store.isLoadingMore).toBe(true);
    });

    it('given a page that failed, when its retry is still pending, then it has been asked for once', async () => {
      const { requestedPages } = await storeWithFirstPage(pageOneFailsOnce());

      await settleFailureBeforeRetry();

      expect(requestedPages).toEqual(PAGE_ZERO_THEN_PAGE_ONE);
    });
  });

  describe('when a background page fails twice', () => {
    it('given a page that never answers, when both attempts are spent, then it is asked for twice', async () => {
      const { requestedPages } = await storeWithFirstPage(pageOneNeverAnswers);

      await settleBackgroundPages();

      expect(requestedPages).toEqual([PAGE_ZERO, PAGE_ONE, PAGE_ONE]);
    });

    it('given a page that never answers, when both attempts are spent, then loading more is over', async () => {
      const { store } = await storeWithFirstPage(pageOneNeverAnswers);

      await settleBackgroundPages();

      expect(store.isLoadingMore).toBe(false);
    });

    it('given a page that never answers, when both attempts are spent, then the index is incomplete', async () => {
      const { store } = await storeWithFirstPage(pageOneNeverAnswers);

      await settleBackgroundPages();

      expect(store.isIndexComplete).toBe(false);
    });
  });

  describe('when a background page is rate limited', () => {
    it('given a 429 on every attempt, when the loop settles, then only the client budget is spent', async () => {
      const { requestedPages } = await storeWithFirstPage(pageOneRateLimited);

      await settleBackgroundPages();

      expect(attemptsAt(requestedPages, PAGE_ONE)).toBe(MAX_RATE_LIMIT_ATTEMPTS);
    });

    it('given a 429 on every attempt, when the loop settles, then loading more is over', async () => {
      const { store } = await storeWithFirstPage(pageOneRateLimited);

      await settleBackgroundPages();

      expect(store.isLoadingMore).toBe(false);
    });
  });

  describe('when a page lands after a failure', () => {
    it('given a page that failed and then landed, when a later page fails, then it is retried too', async () => {
      const { requestedPages } = await storeWithFirstPage(pageOneThenPageTwoFail());

      await settleBackgroundPages();

      expect(requestedPages).toEqual([PAGE_ZERO, PAGE_ONE, PAGE_ONE, PAGE_TWO, PAGE_TWO]);
    });

    it('given a page that failed and then landed, when the later page is spent, then two pages are loaded', async () => {
      const { store } = await storeWithFirstPage(pageOneThenPageTwoFail());

      await settleBackgroundPages();

      expect(store.pagesLoaded).toBe(TWO_PAGES_LOADED);
    });
  });

  describe('when a stopped loop starts again', () => {
    it('given a loop that spent both attempts, when it resumes, then the page is tried twice more', async () => {
      const { store, requestedPages } = await storeWithFirstPage(pageOneNeverAnswers);
      await settleBackgroundPages();

      await store.loadIndex();
      await settleBackgroundPages();

      expect(requestedPages).toEqual([PAGE_ZERO, PAGE_ONE, PAGE_ONE, PAGE_ONE, PAGE_ONE]);
    });
  });

  describe('when a remount runs loadIndex during a retry pause', () => {
    it('given a pending retry, when loadIndex runs again, then nothing more is requested', async () => {
      const { store, requestedPages } = await storeWithFirstPage(pageOneNeverAnswers);
      await settleFailureBeforeRetry();

      await store.loadIndex();

      expect(requestedPages).toEqual(PAGE_ZERO_THEN_PAGE_ONE);
    });

    it('given a pending retry, when loadIndex runs again, then the page is still asked for twice', async () => {
      const { store, requestedPages } = await storeWithFirstPage(pageOneNeverAnswers);
      await settleFailureBeforeRetry();

      await store.loadIndex();
      await settleBackgroundPages();

      expect(requestedPages).toEqual([PAGE_ZERO, PAGE_ONE, PAGE_ONE]);
    });
  });

  describe('when the store aborts during a retry pause', () => {
    it('given a pending retry, when the store aborts, then nothing more is requested', async () => {
      const { store, requestedPages } = await storeWithFirstPage(pageOneFailsOnce());

      await settleFailureBeforeRetry();
      store.abort();
      await settleBackgroundPages();

      expect(requestedPages).toEqual(PAGE_ZERO_THEN_PAGE_ONE);
    });

    it('given a pending retry, when the store aborts, then loading more is over', async () => {
      const { store } = await storeWithFirstPage(pageOneFailsOnce());

      await settleFailureBeforeRetry();
      store.abort();

      expect(store.isLoadingMore).toBe(false);
    });

    it('given an aborted retry, when loadIndex runs again, then the page is tried twice more', async () => {
      const { store, requestedPages } = await storeWithFirstPage(pageOneNeverAnswers);
      await settleFailureBeforeRetry();
      store.abort();

      await store.loadIndex();
      await settleBackgroundPages();

      expect(requestedPages).toEqual([PAGE_ZERO, PAGE_ONE, PAGE_ONE, PAGE_ONE]);
    });
  });

  describe('when the loop runs past the last page', () => {
    it('given a 404 past the last page, when loading stops, then the page is not asked for again', async () => {
      const { requestedPages } = await storeWithFirstPage(pageZeroOnly);

      await settleBackgroundPages();

      expect(requestedPages).toEqual(PAGE_ZERO_THEN_PAGE_ONE);
    });

    it('given a 404 past the last page, when loading stops, then loading more is over', async () => {
      const { store } = await storeWithFirstPage(pageZeroOnly);

      await settleBackgroundPages();

      expect(store.isLoadingMore).toBe(false);
    });
  });
});
