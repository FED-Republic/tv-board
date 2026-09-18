import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedKind } from '@/domain/saved';
import { toShowId } from '@/domain/show';
import { STORAGE_KEYS, useSavedStore } from '@/stores/saved';

const BREAKING_BAD = toShowId(169);
const UNDER_THE_DOME = toShowId(1);

function seedStorage(kind: SavedKind, raw: string): void {
  localStorage.setItem(STORAGE_KEYS[kind], raw);
}

const storedIds = (kind: SavedKind): string | null => localStorage.getItem(STORAGE_KEYS[kind]);

function throwOnWrite(): void {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
}

beforeEach(() => {
  setActivePinia(createTestingPinia({ stubActions: false, createSpy: vi.fn }));
});

describe('STORAGE_KEYS', () => {
  describe('when the persistence keys are read', () => {
    it('given the bookmarks kind, when the key is read, then it is tv-board.bookmarks', () => {
      expect(STORAGE_KEYS.bookmarks).toBe('tv-board.bookmarks');
    });

    it('given the likes kind, when the key is read, then it is tv-board.likes', () => {
      expect(STORAGE_KEYS.likes).toBe('tv-board.likes');
    });
  });
});

describe('useSavedStore', () => {
  describe('when nothing is saved yet', () => {
    it('given empty storage, when the store is created, then no show is bookmarked', () => {
      const store = useSavedStore();

      expect(store.idsOf('bookmarks').size).toBe(0);
    });

    it('given empty storage, when the store is created, then no show is liked', () => {
      const store = useSavedStore();

      expect(store.idsOf('likes').size).toBe(0);
    });

    it('given empty storage, when a show is checked, then it is not bookmarked', () => {
      const store = useSavedStore();

      expect(store.idsOf('bookmarks').has(BREAKING_BAD)).toBe(false);
    });
  });

  describe('when a show is toggled', () => {
    it('given an unsaved show, when it is toggled once, then it is bookmarked', () => {
      const store = useSavedStore();

      store.toggle('bookmarks', BREAKING_BAD);

      expect(store.idsOf('bookmarks').has(BREAKING_BAD)).toBe(true);
    });

    it('given a bookmarked show, when it is toggled again, then it is no longer bookmarked', () => {
      const store = useSavedStore();

      store.toggle('bookmarks', BREAKING_BAD);
      store.toggle('bookmarks', BREAKING_BAD);

      expect(store.idsOf('bookmarks').has(BREAKING_BAD)).toBe(false);
    });

    it('given a bookmarked show, when likes are read, then the kinds stay independent', () => {
      const store = useSavedStore();

      store.toggle('bookmarks', BREAKING_BAD);

      expect(store.idsOf('likes').has(BREAKING_BAD)).toBe(false);
    });

    it('given a liked show, when the likes are read through idsOf, then it holds the id', () => {
      const store = useSavedStore();

      store.toggle('likes', BREAKING_BAD);

      expect([...store.idsOf('likes')]).toEqual([BREAKING_BAD]);
    });
  });

  describe('when a toggle is persisted', () => {
    it('given a bookmarked show, when storage is read, then it holds the id array', () => {
      const store = useSavedStore();

      store.toggle('bookmarks', BREAKING_BAD);

      expect(storedIds('bookmarks')).toBe('[169]');
    });

    it('given a removed bookmark, when storage is read, then it holds an empty array', () => {
      const store = useSavedStore();

      store.toggle('bookmarks', BREAKING_BAD);
      store.toggle('bookmarks', BREAKING_BAD);

      expect(storedIds('bookmarks')).toBe('[]');
    });

    it('given a liked show, when storage is read, then the bookmarks key is untouched', () => {
      const store = useSavedStore();

      store.toggle('likes', BREAKING_BAD);

      expect(storedIds('bookmarks')).toBeNull();
    });
  });

  describe('when storage holds saved ids', () => {
    it('given two bookmarked ids, when the store is created, then both are bookmarked', () => {
      seedStorage('bookmarks', '[169,1]');

      const bookmarks = useSavedStore().idsOf('bookmarks');
      const bothRestored = bookmarks.has(BREAKING_BAD) && bookmarks.has(UNDER_THE_DOME);

      expect(bothRestored).toBe(true);
    });

    it('given one liked id, when the store is created, then the show is liked', () => {
      seedStorage('likes', '[169]');

      const store = useSavedStore();

      expect(store.idsOf('likes').has(BREAKING_BAD)).toBe(true);
    });
  });

  describe('when the stored value is malformed', () => {
    it('given a value that is not JSON, when the store is created, then nothing is saved', () => {
      seedStorage('bookmarks', 'nope');

      const store = useSavedStore();

      expect(store.idsOf('bookmarks').size).toBe(0);
    });

    it('given an object instead of an array, when the store is created, then nothing is saved', () => {
      seedStorage('bookmarks', '{"a":1}');

      const store = useSavedStore();

      expect(store.idsOf('bookmarks').size).toBe(0);
    });

    it('given an array of mixed entries, when the store is created, then only show ids load', () => {
      seedStorage('bookmarks', '[1,"x",-3,1.5]');

      const store = useSavedStore();

      expect([...store.idsOf('bookmarks')]).toEqual([UNDER_THE_DOME]);
    });
  });

  describe('when storage cannot be read', () => {
    it('given a getItem that throws, when the store is created, then nothing is saved', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('denied');
      });

      const store = useSavedStore();

      expect(store.idsOf('bookmarks').size).toBe(0);
    });
  });

  describe('when storage cannot be written', () => {
    it('given a setItem that throws, when a show is toggled, then the failure stays inside', () => {
      const store = useSavedStore();

      throwOnWrite();

      expect(() => store.toggle('bookmarks', BREAKING_BAD)).not.toThrow();
    });

    it('given a setItem that throws, when a show is toggled, then it is still bookmarked', () => {
      const store = useSavedStore();

      throwOnWrite();
      store.toggle('bookmarks', BREAKING_BAD);

      expect(store.idsOf('bookmarks').has(BREAKING_BAD)).toBe(true);
    });
  });
});
