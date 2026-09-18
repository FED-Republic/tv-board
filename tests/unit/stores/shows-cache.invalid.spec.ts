import { createTestingPinia } from '@pinia/testing';
import { HttpResponse, http } from 'msw';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Show } from '@/domain/show';
import { toShowId } from '@/domain/show';
import { useShowsStore } from '@/stores/shows';
import { INDEX_CACHE_KEY, INDEX_CACHE_MAX_AGE_MS } from '@/stores/shows-cache';
import { server } from '../../msw/server';
import pageZeroPayload from '../../resources/shows-page-0.2026-09-16.json';

const INDEX_URL = 'https://api.tvmaze.com/shows';
const BACKGROUND_WINDOW_MS = 10_000;
const NOW = new Date('2026-09-16T10:00:00.000Z');
/** The key the build before `reachedEnd` wrote to; its entries must never be restored. */
const OLD_INDEX_CACHE_KEY = 'tv-board.index.v3';
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

type CachedIndex = {
  readonly savedAt: number;
  readonly pagesLoaded: number;
  readonly reachedEnd: boolean;
  readonly shows: readonly Show[];
};

/** A cache the guard accepts, so every case below fails the guard on the one field it breaks. */
const cachedIndex = (overrides: Partial<CachedIndex> = {}): CachedIndex => ({
  savedAt: Date.now(),
  pagesLoaded: 5,
  reachedEnd: false,
  shows: [CACHED_SHOW],
  ...overrides,
});

/** The shape the build before `reachedEnd` wrote: the page count, and a `complete` flag. */
function cacheOfTheOlderShape(): unknown {
  const { savedAt, pagesLoaded, shows } = cachedIndex();

  return { savedAt, pagesLoaded, shows, complete: true };
}

function seedCache(cache: CachedIndex): void {
  sessionStorage.setItem(INDEX_CACHE_KEY, JSON.stringify(cache));
}

/** A cache written past the type system, the way a corrupt or older entry arrives. */
function seedRawCache(value: unknown): void {
  sessionStorage.setItem(INDEX_CACHE_KEY, JSON.stringify(value));
}

function showWithoutName(): unknown {
  const stripped: Record<string, unknown> = { ...CACHED_SHOW };

  delete stripped['name'];

  return stripped;
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

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  setActivePinia(createTestingPinia({ stubActions: false, createSpy: vi.fn }));
});

afterEach(async () => {
  await vi.advanceTimersByTimeAsync(BACKGROUND_WINDOW_MS);
  vi.useRealTimers();
});

describe('useShowsStore', () => {
  describe('when the cached shows do not match the Show shape', () => {
    it('given a cache holding null instead of a show, when loadIndex runs, then page 0 is requested', async () => {
      seedRawCache({ shows: [null] });
      const requestedPages = serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(requestedPages).toEqual(['0']);
    });

    it('given a cached show without a name, when loadIndex runs, then page 0 is requested', async () => {
      seedRawCache({ ...cachedIndex(), shows: [showWithoutName()] });
      const requestedPages = serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(requestedPages).toEqual(['0']);
    });

    it('given one broken show among good ones, when loadIndex runs, then the whole cache is dropped', async () => {
      seedRawCache({ ...cachedIndex(), shows: [CACHED_SHOW, showWithoutName()] });
      serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(store.pagesLoaded).toBe(1);
    });
  });

  describe('when a cache field is wrongly typed', () => {
    it('given savedAt as a string, when loadIndex runs, then page 0 is requested', async () => {
      seedRawCache({ ...cachedIndex(), savedAt: '2026-09-16T10:00:00.000Z' });
      const requestedPages = serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(requestedPages).toEqual(['0']);
    });

    it('given a fractional pagesLoaded, when loadIndex runs, then page 0 is requested', async () => {
      seedRawCache({ ...cachedIndex(), pagesLoaded: 1.5 });
      const requestedPages = serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(requestedPages).toEqual(['0']);
    });

    it('given reachedEnd as a string, when loadIndex runs, then page 0 is requested', async () => {
      seedRawCache({ ...cachedIndex(), reachedEnd: 'true' });
      const requestedPages = serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(requestedPages).toEqual(['0']);
    });

    it('given shows as an object, when loadIndex runs, then page 0 is requested', async () => {
      seedRawCache({ ...cachedIndex(), shows: { '169': CACHED_SHOW } });
      const requestedPages = serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(requestedPages).toEqual(['0']);
    });
  });

  describe('when a cache is missing reachedEnd', () => {
    it('given a cache of the older shape, when loadIndex runs, then page 0 is requested', async () => {
      seedRawCache(cacheOfTheOlderShape());
      const requestedPages = serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(requestedPages).toEqual(['0']);
    });

    it('given a cache of the older shape, when loadIndex runs, then its page count is dropped', async () => {
      seedRawCache(cacheOfTheOlderShape());
      serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(store.pagesLoaded).toBe(1);
    });
  });

  describe('when a cache from an older build is present', () => {
    it('given an entry under the old key, when loadIndex runs, then page 0 is requested', async () => {
      sessionStorage.setItem(OLD_INDEX_CACHE_KEY, JSON.stringify(cachedIndex()));
      const requestedPages = serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(requestedPages).toEqual(['0']);
    });

    it('given an entry under the old key, when loadIndex runs, then its shows are not restored', async () => {
      sessionStorage.setItem(OLD_INDEX_CACHE_KEY, JSON.stringify(cachedIndex({ pagesLoaded: 5 })));
      serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(store.pagesLoaded).toBe(1);
    });
  });

  describe('when the cache cannot be used', () => {
    it('given a cache older than 24 hours, when loadIndex runs, then page 0 is requested', async () => {
      seedCache(cachedIndex({ savedAt: NOW.getTime() - INDEX_CACHE_MAX_AGE_MS - 1000 }));
      const requestedPages = serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(requestedPages).toEqual(['0']);
    });

    it('given a cache older than 24 hours, when loadIndex runs, then the fetched index wins', async () => {
      seedCache(cachedIndex({ savedAt: NOW.getTime() - INDEX_CACHE_MAX_AGE_MS - 1000 }));
      serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(store.pagesLoaded).toBe(1);
    });

    it('given a cache that is not JSON, when loadIndex runs, then page 0 is requested', async () => {
      sessionStorage.setItem(INDEX_CACHE_KEY, 'not json');
      const requestedPages = serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(requestedPages).toEqual(['0']);
    });

    it('given a cache that is not an object, when loadIndex runs, then page 0 is requested', async () => {
      sessionStorage.setItem(INDEX_CACHE_KEY, '42');
      const requestedPages = serveIndexPages();
      const store = useShowsStore();

      await store.loadIndex();

      expect(requestedPages).toEqual(['0']);
    });
  });
});
