import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useShowsStore } from '@/stores/shows';
import { GENRE_CACHE_KEY, readGenreCache } from '@/stores/shows-cache';

/** The keys earlier builds wrote the dashboard rows under; nothing reads either one now. */
const ROW_CACHE_KEY_V2 = 'tv-board.rows.v2';
const ROW_CACHE_KEY_V1 = 'tv-board.rows.v1';
/** Stored out of row order, so the order a read gives back is the module's own. */
const STORED_GENRES = ['Comedy', 'Drama'];
const ROW_ORDERED_GENRES = ['Drama', 'Comedy'];

const seedGenreCache = (genres: readonly string[]): void =>
  localStorage.setItem(GENRE_CACHE_KEY, JSON.stringify(genres));

/** Rows an earlier build left behind; only that the key is taken matters, never its shape. */
const seedRowCache = (key: string): void => localStorage.setItem(key, JSON.stringify([]));

/** Safari with all cookies blocked, and some WebViews: every write to storage is a `SecurityError`. */
function throwOnRemove(): void {
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
    throw new Error('denied');
  });
}

function throwOnRead(): void {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('denied');
  });
}

beforeEach(() => {
  setActivePinia(createTestingPinia({ stubActions: false, createSpy: vi.fn }));
});

describe('readGenreCache', () => {
  describe('when rows are left under a superseded key', () => {
    it('given rows under the v2 key, when the genre cache is read, then that key is cleared out', () => {
      seedRowCache(ROW_CACHE_KEY_V2);

      readGenreCache();

      expect(localStorage.getItem(ROW_CACHE_KEY_V2)).toBeNull();
    });

    it('given rows under the v1 key, when the genre cache is read, then that key is cleared out', () => {
      seedRowCache(ROW_CACHE_KEY_V1);

      readGenreCache();

      expect(localStorage.getItem(ROW_CACHE_KEY_V1)).toBeNull();
    });

    it('given rows under both keys beside the names, when read, then the names outlive the clean-up', () => {
      seedRowCache(ROW_CACHE_KEY_V2);
      seedRowCache(ROW_CACHE_KEY_V1);
      seedGenreCache(STORED_GENRES);

      expect(readGenreCache()).toEqual(ROW_ORDERED_GENRES);
    });

    it('given a read that already cleared both keys, when it runs again, then it gives the same names', () => {
      seedRowCache(ROW_CACHE_KEY_V2);
      seedGenreCache(STORED_GENRES);
      readGenreCache();

      expect(readGenreCache()).toEqual(ROW_ORDERED_GENRES);
    });
  });

  describe('when storage refuses the call', () => {
    it('given a removeItem that throws, when the genre cache is read, then no genre comes back', () => {
      seedGenreCache(STORED_GENRES);
      throwOnRemove();

      expect(readGenreCache()).toEqual([]);
    });

    it('given a getItem that throws, when the genre cache is read, then no genre comes back', () => {
      seedGenreCache(STORED_GENRES);
      throwOnRead();

      expect(readGenreCache()).toEqual([]);
    });
  });
});

describe('useShowsStore', () => {
  describe('when storage refuses the clean-up the setup body runs', () => {
    it('given a removeItem that throws, when the store is created, then the setup still builds', () => {
      throwOnRemove();

      expect(() => useShowsStore()).not.toThrow();
    });

    it('given a removeItem that throws, when the store is created, then it remembers no genre', () => {
      seedGenreCache(STORED_GENRES);
      throwOnRemove();

      expect(useShowsStore().knownGenres).toEqual([]);
    });
  });
});
