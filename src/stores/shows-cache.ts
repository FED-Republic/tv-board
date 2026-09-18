import { type Genre, orderGenres } from '@/domain/genre';
import { isShow, type Show } from '@/domain/show';

/**
 * The suffix changes with the stored shape, and with the rules that built it, so a cache from an
 * older build is never restored.
 */
export const INDEX_CACHE_KEY = 'tv-board.index.v4';
export const INDEX_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const GENRE_CACHE_KEY = 'tv-board.genres';
/** Keys earlier builds wrote dashboard rows under; a visit clears what nothing reads. */
const SUPERSEDED_ROW_CACHE_KEYS: readonly string[] = ['tv-board.rows.v2', 'tv-board.rows.v1'];

export type IndexCache = {
  readonly savedAt: number;
  readonly pagesLoaded: number;
  /** Whether TVmaze answered `404` past the last page: the one fact the page count cannot carry. */
  readonly reachedEnd: boolean;
  readonly shows: readonly Show[];
};

/** The index for this tab, reused for a day; anything unreadable or stale is fetched again. */
export function readIndexCache(): IndexCache | null {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(INDEX_CACHE_KEY) ?? 'null');

    return isFreshCache(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeIndexCache(cache: IndexCache): void {
  try {
    sessionStorage.setItem(INDEX_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // A full or blocked storage only costs the next reload a request.
  }
}

/**
 * The genres seen so far, kept across visits in `localStorage` so a dashboard draws named
 * placeholder rows while the index loads. The visit's one read, so it clears the superseded
 * row keys on its way past; a storage that refuses the whole call costs only the names.
 */
export function readGenreCache(): readonly Genre[] {
  try {
    dropRowCaches();

    const parsed: unknown = JSON.parse(localStorage.getItem(GENRE_CACHE_KEY) ?? '[]');

    return orderGenres(parsed);
  } catch {
    return [];
  }
}

/**
 * Keys the dashboard rows used to live under. Nothing reads them, and a stale one is about 65 KB
 * of the quota the genre names, the bookmarks and the likes share, so a visit clears them out.
 */
function dropRowCaches(): void {
  for (const key of SUPERSEDED_ROW_CACHE_KEYS) {
    localStorage.removeItem(key);
  }
}

export function writeGenreCache(genres: readonly Genre[]): void {
  try {
    localStorage.setItem(GENRE_CACHE_KEY, JSON.stringify(genres));
  } catch {
    // Without the list the next visit shows anonymous placeholders; nothing else is lost.
  }
}

function isFreshCache(value: unknown): value is IndexCache {
  if (!isIndexCache(value)) {
    return false;
  }

  return Date.now() - value.savedAt <= INDEX_CACHE_MAX_AGE_MS;
}

/** Every field is checked, shows included: storage is outside the type system's reach. */
function isIndexCache(value: unknown): value is IndexCache {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (
    'savedAt' in value
    && typeof value.savedAt === 'number'
    && 'pagesLoaded' in value
    && Number.isInteger(value.pagesLoaded)
    && 'reachedEnd' in value
    && typeof value.reachedEnd === 'boolean'
    && 'shows' in value
    && Array.isArray(value.shows)
    && value.shows.every(isShow)
  );
}
