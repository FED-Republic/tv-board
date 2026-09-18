import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { HttpResponse, http } from 'msw';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROW_MIN_SHOWS } from '@/domain/genre';
import type { Show } from '@/domain/show';
import { toShowId } from '@/domain/show';
import { INDEX_PAGE_COUNT } from '@/services/tvmaze/config';
import { useShowsStore } from '@/stores/shows';
import { INDEX_CACHE_KEY, INDEX_CACHE_MAX_AGE_MS } from '@/stores/shows-cache';
import { server } from '../../msw/server';
import pageZeroPayload from '../../resources/shows-page-0.2026-09-16.json';

const INDEX_URL = 'https://api.tvmaze.com/shows';
const PAGE_ZERO_SHOW_COUNT = 240;
const BACKGROUND_WINDOW_MS = 10_000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const NOW = new Date('2026-09-16T10:00:00.000Z');
const BREAKING_BAD = toShowId(169);

// A domain show, not a wire payload: the cache holds mapped list models. Values come from show 169.
const CACHED_SHOW: Show = {
  id: BREAKING_BAD,
  name: 'Breaking Bad',
  genres: ['Drama', 'Crime', 'Thriller'],
  rating: 9.2,
  poster: null,
  premiered: '2008-01-20',
};

/** Ids past every captured one, so the shows that fill the cache up to the bar are its own. */
const FIRST_FILLER_ID = 900;

/**
 * A cached corpus at the row minimum: one show would leave every genre under the bar and put
 * the whole cache in `Other`, and these specs are about the rows the cache stands for.
 */
const CACHED_SHOWS: readonly Show[] = [
  CACHED_SHOW,
  ...Array.from({ length: ROW_MIN_SHOWS - 1 }, (_unused, index) => ({
    ...CACHED_SHOW,
    id: toShowId(FIRST_FILLER_ID + index),
    name: `Cached show ${index + 1}`,
  })),
];

type CachedIndex = {
  readonly savedAt: number;
  readonly pagesLoaded: number;
  readonly reachedEnd: boolean;
  readonly shows: readonly Show[];
};

/** A cache of the whole page budget that never ran past the last page TVmaze has. */
const cachedIndex = (overrides: Partial<CachedIndex> = {}): CachedIndex => ({
  savedAt: Date.now(),
  pagesLoaded: 5,
  reachedEnd: false,
  shows: CACHED_SHOWS,
  ...overrides,
});

function seedCache(cache: CachedIndex): void {
  sessionStorage.setItem(INDEX_CACHE_KEY, JSON.stringify(cache));
}

function readCache(): CachedIndex {
  return JSON.parse(sessionStorage.getItem(INDEX_CACHE_KEY) ?? 'null') as CachedIndex;
}

function serveIndexPages(): string[] {
  const requestedPages: string[] = [];

  server.use(
    http.get(INDEX_URL, ({ request }) => {
      const page = new URL(request.url).searchParams.get('page') ?? '';

      requestedPages.push(page);
      return HttpResponse.json(pageZeroPayload);
    }),
  );

  return requestedPages;
}

async function settleBackgroundPages(): Promise<void> {
  await vi.advanceTimersByTimeAsync(BACKGROUND_WINDOW_MS);
  await flushPromises();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  setActivePinia(createTestingPinia({ stubActions: false, createSpy: vi.fn }));
});

afterEach(async () => {
  await vi.advanceTimersByTimeAsync(BACKGROUND_WINDOW_MS);
  vi.useRealTimers();
});

describe('INDEX_CACHE_KEY', () => {
  describe('when the cache key is read', () => {
    it('given the current cache shape, when the key is read, then it carries the v4 suffix', () => {
      expect(INDEX_CACHE_KEY).toBe('tv-board.index.v4');
    });

    it('given the cache lifetime, when it is read, then it is 24 hours', () => {
      expect(INDEX_CACHE_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000);
    });
  });
});

describe('useShowsStore', () => {
  describe('when a page lands', () => {
    it('given the page-0 payload, when it lands, then the cache holds its shows', async () => {
      serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(readCache().shows).toHaveLength(PAGE_ZERO_SHOW_COUNT);
    });

    it('given the page-0 payload, when it lands, then the cached shows carry no detail field', async () => {
      serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(readCache().shows[0]).not.toHaveProperty('summaryHtml');
    });

    it('given the page-0 payload, when it lands, then the cache carries the save time', async () => {
      serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(readCache().savedAt).toBe(NOW.getTime());
    });

    it('given pages still to come, when page 0 lands, then the cache holds one page', async () => {
      serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(readCache().pagesLoaded).toBe(1);
    });

    it('given every page, when the background work settles, then the cache holds them all', async () => {
      serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();
      await settleBackgroundPages();

      expect(readCache().pagesLoaded).toBe(INDEX_PAGE_COUNT);
    });
  });

  describe('when a fresh complete cache exists', () => {
    it('given a cache saved just now, when loadIndex runs, then no page is requested', async () => {
      seedCache(cachedIndex());
      const requestedPages = serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(requestedPages).toEqual([]);
    });

    it('given a cache saved just now, when loadIndex runs, then the cached shows load', async () => {
      seedCache(cachedIndex());
      serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(store.getShowById(BREAKING_BAD)?.name).toBe('Breaking Bad');
    });

    it('given a cache saved just now, when loadIndex runs, then the cached show round-trips', async () => {
      seedCache(cachedIndex());
      serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(store.getShowById(BREAKING_BAD)).toEqual(CACHED_SHOW);
    });

    it('given a cache one hour old, when loadIndex runs, then no page is requested', async () => {
      seedCache(cachedIndex({ savedAt: NOW.getTime() - ONE_HOUR_MS }));
      const requestedPages = serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(requestedPages).toEqual([]);
    });
  });

  describe('when a fresh incomplete cache exists', () => {
    it('given one cached page, when loadIndex runs, then the state is success at once', async () => {
      seedCache(cachedIndex({ pagesLoaded: 1 }));
      serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(store.indexState.status).toBe('success');
    });

    it('given one cached page, when the background work settles, then it resumes at page 1', async () => {
      seedCache(cachedIndex({ pagesLoaded: 1 }));
      const requestedPages = serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();
      await settleBackgroundPages();

      expect(requestedPages).toEqual(['1', '2', '3', '4']);
    });
  });
});
