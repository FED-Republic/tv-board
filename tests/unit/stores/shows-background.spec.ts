import { delay, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PAGE_SPACING_MS } from '@/stores/shows';
import {
  activateBackgroundPinia,
  notFound,
  PAGE_ZERO_SHOW_COUNT,
  type PageResponder,
  releaseTimers,
  serverError,
  settleBackgroundPages,
  settleFirstBackgroundPage,
  settleNextBackgroundPage,
  showsOf,
  storeWithFirstPage,
  wholePage,
} from './background-harness';
import pageZeroPayload from '../../resources/shows-page-0.2026-09-16.json';

const SLOW_PAGE_MS = 3_000;
const INDEX_PAGE_COUNT = 5;
const ONE_PAGE_OF_FIVE = 1 / INDEX_PAGE_COUNT;
const TWO_PAGES_OF_FIVE = 2 / INDEX_PAGE_COUNT;
const WHOLE_INDEX = 1;

// Later pages are served as slices of the captured page 0: real payloads, disjoint by id.
const FIRST_HALF = pageZeroPayload.slice(0, 120);
const SECOND_HALF = pageZeroPayload.slice(120);

const pageZeroOnly: PageResponder = (page) => (page === '0' ? wholePage() : notFound());
const everyPageRepeated: PageResponder = () => wholePage();
const brokenBackgroundPages: PageResponder = (page) => (page === '0' ? wholePage() : serverError());

const disjointHalves: PageResponder = (page) => {
  if (page === '0') {
    return HttpResponse.json(FIRST_HALF);
  }

  if (page === '1') {
    return HttpResponse.json(SECOND_HALF);
  }

  return notFound();
};

const slowBackgroundPages: PageResponder = async (page) => {
  if (page === '0') {
    return wholePage();
  }

  await delay(SLOW_PAGE_MS);
  return wholePage();
};

beforeEach(activateBackgroundPinia);

afterEach(releaseTimers);

describe('useShowsStore', () => {
  describe('when the background pages load', () => {
    it('given pages 1 to 4, when the idle work settles, then five pages are loaded', async () => {
      const { store } = await storeWithFirstPage(everyPageRepeated);

      await settleBackgroundPages();

      expect(store.pagesLoaded).toBe(5);
    });

    it('given pages 1 to 4, when the idle work settles, then the index is complete', async () => {
      const { store } = await storeWithFirstPage(everyPageRepeated);

      await settleBackgroundPages();

      expect(store.isIndexComplete).toBe(true);
    });

    it('given pages 1 to 4, when the idle work settles, then loading more is over', async () => {
      const { store } = await storeWithFirstPage(everyPageRepeated);

      await settleBackgroundPages();

      expect(store.isLoadingMore).toBe(false);
    });

    it('given a background page in flight, when it is pending, then loading more is true', async () => {
      const { store } = await storeWithFirstPage(slowBackgroundPages);

      await vi.advanceTimersByTimeAsync(PAGE_SPACING_MS);

      expect(store.isLoadingMore).toBe(true);
    });

    it('given page 1 repeating page 0, when both are merged, then no show is duplicated', async () => {
      const { store } = await storeWithFirstPage(everyPageRepeated);

      await settleBackgroundPages();

      expect(showsOf(store.indexState)).toHaveLength(PAGE_ZERO_SHOW_COUNT);
    });

    it('given a page of unseen shows, when it is merged, then the index grows', async () => {
      const { store } = await storeWithFirstPage(disjointHalves);

      await settleBackgroundPages();

      expect(showsOf(store.indexState)).toHaveLength(PAGE_ZERO_SHOW_COUNT);
    });

    it('given a page of unseen shows, when it is merged, then two pages are loaded', async () => {
      const { store } = await storeWithFirstPage(disjointHalves);

      await settleBackgroundPages();

      expect(store.pagesLoaded).toBe(2);
    });
  });

  describe('when the pages arrive one by one', () => {
    it('given page 0 loaded, when the first background page lands, then two pages are loaded', async () => {
      const { store } = await storeWithFirstPage(everyPageRepeated);

      await settleFirstBackgroundPage();

      expect(store.pagesLoaded).toBe(2);
    });

    it('given one background page, when the next one lands, then three pages are loaded', async () => {
      const { store } = await storeWithFirstPage(everyPageRepeated);

      await settleFirstBackgroundPage();
      await settleNextBackgroundPage();

      expect(store.pagesLoaded).toBe(3);
    });
  });

  describe('when the index progress is read', () => {
    it('given only page 0, when the progress is read, then it is a fifth', async () => {
      const { store } = await storeWithFirstPage(everyPageRepeated);

      expect(store.indexProgress).toBe(ONE_PAGE_OF_FIVE);
    });

    it('given two of the five pages, when the progress is read, then it is two fifths', async () => {
      const { store } = await storeWithFirstPage(everyPageRepeated);

      await settleFirstBackgroundPage();

      expect(store.indexProgress).toBe(TWO_PAGES_OF_FIVE);
    });

    it('given every page, when the progress is read, then it is whole', async () => {
      const { store } = await storeWithFirstPage(everyPageRepeated);

      await settleBackgroundPages();

      expect(store.indexProgress).toBe(WHOLE_INDEX);
    });

    it('given a 404 past the last page, when the progress is read, then it is whole', async () => {
      const { store } = await storeWithFirstPage(pageZeroOnly);

      await settleBackgroundPages();

      expect(store.indexProgress).toBe(WHOLE_INDEX);
    });

    it('given a background failure, when the progress is read, then it stays a fifth', async () => {
      const { store } = await storeWithFirstPage(brokenBackgroundPages);

      await settleBackgroundPages();

      expect(store.indexProgress).toBe(ONE_PAGE_OF_FIVE);
    });
  });

  describe('when a background page fails', () => {
    it('given a 404 past the last page, when loading stops, then the index is complete', async () => {
      const { store } = await storeWithFirstPage(pageZeroOnly);

      await settleBackgroundPages();

      expect(store.isIndexComplete).toBe(true);
    });

    it('given a 404 past the last page, when loading stops, then the state stays success', async () => {
      const { store } = await storeWithFirstPage(pageZeroOnly);

      await settleBackgroundPages();

      expect(store.indexState.status).toBe('success');
    });

    it('given a 500 on every attempt, when the retry is spent, then the state stays success', async () => {
      const { store } = await storeWithFirstPage(brokenBackgroundPages);

      await settleBackgroundPages();

      expect(store.indexState.status).toBe('success');
    });

    it('given a 500 on every attempt, when the retry is spent, then the index is incomplete', async () => {
      const { store } = await storeWithFirstPage(brokenBackgroundPages);

      await settleBackgroundPages();

      expect(store.isIndexComplete).toBe(false);
    });

    it('given a 500 on every attempt, when the retry is spent, then loading more is over', async () => {
      const { store } = await storeWithFirstPage(brokenBackgroundPages);

      await settleBackgroundPages();

      expect(store.isLoadingMore).toBe(false);
    });
  });
});
