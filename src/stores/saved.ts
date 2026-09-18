import { defineStore } from 'pinia';
import { shallowRef } from 'vue';
import type { SavedKind } from '@/domain/saved';
import { isShowId, type ShowId } from '@/domain/show';

export const STORAGE_KEYS = {
  bookmarks: 'tv-board.bookmarks',
  likes: 'tv-board.likes',
} as const;

/**
 * Bookmarked and liked show ids. Ids only, never show data, so nothing saved can go stale;
 * persisted to `localStorage` on every change and restored on creation.
 */
export const useSavedStore = defineStore('saved', () => {
  const bookmarkIds = shallowRef<ReadonlySet<ShowId>>(readIds(STORAGE_KEYS.bookmarks));
  const likeIds = shallowRef<ReadonlySet<ShowId>>(readIds(STORAGE_KEYS.likes));

  const idsOf = (kind: SavedKind): ReadonlySet<ShowId> => refOf(kind).value;

  function toggle(kind: SavedKind, id: ShowId): void {
    const ids = refOf(kind);
    const next = new Set(ids.value);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    ids.value = next;
    writeIds(STORAGE_KEYS[kind], next);
  }

  function refOf(kind: SavedKind): typeof bookmarkIds {
    return kind === 'bookmarks' ? bookmarkIds : likeIds;
  }

  return { idsOf, toggle };
});

/** Whatever is unreadable or not a valid id loads as nothing; the user never sees an error. */
function readIds(key: string): ReadonlySet<ShowId> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');

    return new Set(Array.isArray(parsed) ? parsed.filter(isShowId) : []);
  } catch {
    return new Set();
  }
}

function writeIds(key: string, ids: ReadonlySet<ShowId>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {
    // A full or blocked storage keeps the in-memory choice; it is lost on reload, not now.
  }
}
