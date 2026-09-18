import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { HttpResponse, http } from 'msw';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Genre, GenreRow } from '@/domain/genre';
import { ROW_MIN_SHOWS, ROW_SHOW_LIMIT } from '@/domain/genre';
import type { Show } from '@/domain/show';
import { toShowId } from '@/domain/show';
import { useShowsStore } from '@/stores/shows';
import { GENRE_CACHE_KEY, INDEX_CACHE_KEY } from '@/stores/shows-cache';
import { server } from '../../msw/server';
import pageZeroPayload from '../../resources/shows-page-0.2026-09-16.json';

const INDEX_URL = 'https://api.tvmaze.com/shows';
const BACKGROUND_WINDOW_MS = 10_000;
const SHOWS_OVER_LIMIT = 30;
const TOP_RATING = 9.9;
const RATING_STEP = 0.1;
const FIRST_DRAMA_ID = 1;
const FIRST_COMEDY_ID = 100;

type ShowsStore = ReturnType<typeof useShowsStore>;
type ShowPayload = (typeof pageZeroPayload)[number];
type PageResponder = (page: string) => Response;

const TEMPLATE_PAYLOAD = pageZeroPayload[0]!;

// A domain show, not a wire payload: the session cache holds mapped list models.
const CACHED_SHOW: Show = {
  id: toShowId(169),
  name: 'Breaking Bad',
  genres: ['Drama', 'Crime', 'Thriller'],
  rating: 9.2,
  poster: null,
  premiered: '2008-01-20',
};

/** The cached corpus at the row minimum, so each genre it lists still earns a row of its own. */
const CACHED_SHOWS: readonly Show[] = Array.from({ length: ROW_MIN_SHOWS }, (_unused, index) => ({
  ...CACHED_SHOW,
  id: toShowId(CACHED_SHOW.id + index),
  name: `Breaking Bad ${index + 1}`,
}));

/** A captured payload with only the fields this spec cares about replaced. */
function showPayload(id: number, genre: Genre, rating: number): ShowPayload {
  return {
    ...TEMPLATE_PAYLOAD,
    id,
    name: `${genre} ${id}`,
    url: `https://www.tvmaze.com/shows/${id}`,
    genres: [genre],
    rating: { average: rating },
  };
}

/** A page of one genre at the row minimum, rated from the top down, so it earns a row. */
function genrePayloads(genre: Genre, firstId: number): readonly ShowPayload[] {
  return Array.from({ length: ROW_MIN_SHOWS }, (_unused, index) =>
    showPayload(firstId + index, genre, TOP_RATING - index * RATING_STEP),
  );
}

const DRAMA_PAGE = genrePayloads('Drama', FIRST_DRAMA_ID);
const COMEDY_PAGE = genrePayloads('Comedy', FIRST_COMEDY_ID);
const MIXED_PAGE = [...COMEDY_PAGE, ...DRAMA_PAGE];
const LONG_DRAMA_PAGE = Array.from({ length: SHOWS_OVER_LIMIT }, (_unused, index) =>
  showPayload(index + 1, 'Drama', TOP_RATING - index * RATING_STEP),
);

const notFound = (): Response => new HttpResponse(null, { status: 404 });

const onlyPageZero =
  (payload: readonly ShowPayload[]): PageResponder =>
  (page) => {
    if (page !== '0') {
      return notFound();
    }

    return HttpResponse.json(payload);
  };

const comedyAfterDrama: PageResponder = (page) => {
  if (page === '0') {
    return HttpResponse.json(DRAMA_PAGE);
  }

  if (page === '1') {
    return HttpResponse.json(COMEDY_PAGE);
  }

  return notFound();
};

function serveIndexPages(respond: PageResponder): void {
  server.use(
    http.get(INDEX_URL, ({ request }) => {
      const page = new URL(request.url).searchParams.get('page') ?? '';

      return respond(page);
    }),
  );
}

async function storeWithFirstPage(respond: PageResponder): Promise<ShowsStore> {
  serveIndexPages(respond);

  const store = useShowsStore();

  await store.loadIndex();
  return store;
}

async function settleBackgroundPages(): Promise<void> {
  await vi.advanceTimersByTimeAsync(BACKGROUND_WINDOW_MS);
  await flushPromises();
}

function seedIndexCache(shows: readonly Show[]): void {
  const cache = { savedAt: Date.now(), pagesLoaded: 5, reachedEnd: false, shows };

  sessionStorage.setItem(INDEX_CACHE_KEY, JSON.stringify(cache));
}

const rememberGenres = (raw: string): void => localStorage.setItem(GENRE_CACHE_KEY, raw);

const rememberedGenres = (): unknown => JSON.parse(localStorage.getItem(GENRE_CACHE_KEY) ?? 'null');

const genresOf = (rows: readonly GenreRow[]): readonly Genre[] => rows.map((row) => row.genre);

const namesIn = (rows: readonly GenreRow[], genre: Genre): readonly string[] =>
  rows.find((row) => row.genre === genre)?.shows.map((show) => show.name) ?? [];

function breakStorageWrites(): void {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota exceeded');
  });
}

function breakStorageReads(): void {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('storage is blocked');
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  setActivePinia(createTestingPinia({ stubActions: false, createSpy: vi.fn }));
});

afterEach(async () => {
  await vi.advanceTimersByTimeAsync(BACKGROUND_WINDOW_MS);
  vi.useRealTimers();
});

describe('GENRE_CACHE_KEY', () => {
  describe('when the genre cache key is read', () => {
    it('given the remembered genres, when the key is read, then it is tv-board.genres', () => {
      expect(GENRE_CACHE_KEY).toBe('tv-board.genres');
    });
  });
});

describe('useShowsStore', () => {
  describe('when genres were remembered on an earlier visit', () => {
    it('given a shuffled list, when the store is created, then it reads them in row order', () => {
      rememberGenres('["Comedy","Drama"]');

      expect(useShowsStore().knownGenres).toEqual(['Drama', 'Comedy']);
    });

    it('given the same genre twice, when the store is created, then it appears once', () => {
      rememberGenres('["Drama","Comedy","Drama"]');

      expect(useShowsStore().knownGenres).toEqual(['Drama', 'Comedy']);
    });

    it('given an unknown name, when the store is created, then that name is dropped', () => {
      rememberGenres('["Drama","Talk Show"]');

      expect(useShowsStore().knownGenres).toEqual(['Drama']);
    });

    it('given a value that is not a string, when the store is created, then it is dropped', () => {
      rememberGenres('["Drama",42,null]');

      expect(useShowsStore().knownGenres).toEqual(['Drama']);
    });

    it('given nothing stored, when the store is created, then no genre is known', () => {
      expect(useShowsStore().knownGenres).toEqual([]);
    });

    it('given a stored value that is not JSON, when the store is created, then no genre is known', () => {
      rememberGenres('not json');

      expect(useShowsStore().knownGenres).toEqual([]);
    });

    it('given a stored value that is not an array, when the store is created, then no genre is known', () => {
      rememberGenres('42');

      expect(useShowsStore().knownGenres).toEqual([]);
    });

    it('given a getItem that throws, when the store is created, then no genre is known', () => {
      breakStorageReads();

      expect(useShowsStore().knownGenres).toEqual([]);
    });
  });

  describe('when a page lands', () => {
    it('given a Comedy and a Drama show, when page 0 lands, then the known genres match the rows', async () => {
      const store = await storeWithFirstPage(onlyPageZero(MIXED_PAGE));

      expect(store.knownGenres).toEqual(genresOf(store.byGenre));
    });

    it('given a Comedy and a Drama show, when page 0 lands, then the genres are remembered in row order', async () => {
      await storeWithFirstPage(onlyPageZero(MIXED_PAGE));

      expect(rememberedGenres()).toEqual(['Drama', 'Comedy']);
    });

    it('given a remembered genre the index no longer has, when page 0 lands, then it is forgotten', async () => {
      rememberGenres('["Drama","Comedy","Horror"]');

      const store = await storeWithFirstPage(onlyPageZero(MIXED_PAGE));

      expect(store.knownGenres).toEqual(['Drama', 'Comedy']);
    });

    it('given a background page with a new genre, when it lands, then the genre is remembered too', async () => {
      await storeWithFirstPage(comedyAfterDrama);

      await settleBackgroundPages();

      expect(rememberedGenres()).toEqual(['Drama', 'Comedy']);
    });

    it('given a fresh session cache, when the index is restored, then its genres are remembered', async () => {
      seedIndexCache(CACHED_SHOWS);

      await storeWithFirstPage(onlyPageZero(MIXED_PAGE));

      expect(rememberedGenres()).toEqual(['Drama', 'Thriller', 'Crime']);
    });

    it('given a setItem that throws, when page 0 lands, then the index still loads', async () => {
      breakStorageWrites();

      const store = await storeWithFirstPage(onlyPageZero(MIXED_PAGE));

      expect(store.indexState.status).toBe('success');
    });
  });

  describe('when a row is longer than the limit', () => {
    it('given 30 Drama shows, when page 0 lands, then the row holds the limit', async () => {
      const store = await storeWithFirstPage(onlyPageZero(LONG_DRAMA_PAGE));

      expect(namesIn(store.byGenre, 'Drama')).toHaveLength(ROW_SHOW_LIMIT);
    });

    it('given 30 Drama shows, when page 0 lands, then the row starts with the best rated', async () => {
      const store = await storeWithFirstPage(onlyPageZero(LONG_DRAMA_PAGE));

      expect(namesIn(store.byGenre, 'Drama')[0]).toBe('Drama 1');
    });
  });
});
