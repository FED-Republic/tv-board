import { flushPromises } from '@vue/test-utils';
import { HttpResponse, delay, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Router } from 'vue-router';
import { useSearchResults } from '@/composables/useSearchResults';
import { HttpError } from '@/domain/api-error';
import type { AsyncState } from '@/domain/async-state';
import type { LoadError } from '@/domain/load-error';
import type { Show } from '@/domain/show';
import { RETRY_BASE_DELAY_MS } from '@/services/http/client';
import { server } from '../../msw/server';
import searchFleabagPayload from '../../resources/search-fleabag.2026-09-16.json';
import { createTestRouter } from './test-router';
import { withSetup } from './with-setup';

const SEARCH_URL = 'https://api.tvmaze.com/search/shows';
const FLEABAG_RESULT_NAMES = ['Fleabag', 'Fleabag Monkeyface'];
const SLOW_RESPONSE_MS = 1_000;
/** The client tries a 5xx twice; both have to fail before the search itself fails. */
const SERVER_ERROR_ATTEMPTS = 2;
/** Fewer shows than a genre needs for a dashboard row, which the search filter never counts. */
const MUSIC_RESULT_COUNT = 3;
const FIRST_MUSIC_ID = 900;
const MUSIC_RESULT_NAMES = ['Music 1', 'Music 2', 'Music 3'];

type QueryResponder = (query: string) => Promise<Response> | Response;
type SearchResults = ReturnType<typeof useSearchResults>;
type Harness = {
  readonly search: SearchResults;
  readonly router: Router;
  readonly unmount: () => void;
};

const namesOf = (state: AsyncState<readonly Show[], LoadError>): readonly string[] =>
  state.status === 'success' ? state.data.map((show) => show.name) : [];

const errorOf = (state: AsyncState<readonly Show[], LoadError>): LoadError | null =>
  state.status === 'error' ? state.error : null;

async function mountSearchResults(location: string): Promise<Harness> {
  const router = await createTestRouter(location);
  const { result, unmount } = withSetup(() => useSearchResults(), [router]);

  return { search: result, router, unmount };
}

const fleabagResults = (): Response => HttpResponse.json(searchFleabagPayload);

/** The captured result under new ids and one genre, so a spec can size that genre by hand. */
function musicResults(): Response {
  const [captured] = searchFleabagPayload;

  if (captured === undefined) {
    throw new Error('the captured Fleabag payload should hold at least one result');
  }

  return HttpResponse.json(
    Array.from({ length: MUSIC_RESULT_COUNT }, (_unused, index) => ({
      ...captured,
      show: {
        ...captured.show,
        id: FIRST_MUSIC_ID + index,
        name: `Music ${index + 1}`,
        genres: ['Music'],
      },
    })),
  );
}

const noResults = (): Response => HttpResponse.json([]);
const serverError = (): Response => new HttpResponse(null, { status: 500 });

/** The half-typed query answers late and empty, so a stale overwrite would be visible. */
const slowPrefixSearch: QueryResponder = async (query) => {
  if (query === 'fleabag') {
    return fleabagResults();
  }

  await delay(SLOW_RESPONSE_MS);

  return noResults();
};

/** Fails the first search outright — both attempts the client makes for a 5xx — then recovers. */
function searchAfterFailedAttempts(): QueryResponder {
  let attempts = 0;

  return () => {
    attempts += 1;

    return attempts <= SERVER_ERROR_ATTEMPTS ? serverError() : fleabagResults();
  };
}

/** Records the signal of every search that reached TVmaze, so a cancelled one is visible. */
function serveSlowSearchesRecordingSignals(): AbortSignal[] {
  const searchSignals: AbortSignal[] = [];

  server.use(
    http.get(SEARCH_URL, async ({ request }) => {
      searchSignals.push(request.signal);
      await delay(SLOW_RESPONSE_MS);

      return noResults();
    }),
  );

  return searchSignals;
}

/** Records every query that reached TVmaze and answers it with `respond`. */
function serveSearch(respond: QueryResponder): string[] {
  const requestedQueries: string[] = [];

  server.use(
    http.get(SEARCH_URL, ({ request }) => {
      const query = new URL(request.url).searchParams.get('q') ?? '';

      requestedQueries.push(query);

      return respond(query);
    }),
  );

  return requestedQueries;
}

/** A 5xx costs one back-off before the failure settles. */
async function settleFailedSearch(): Promise<void> {
  await vi.advanceTimersByTimeAsync(RETRY_BASE_DELAY_MS);
  await flushPromises();
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSearchResults', () => {
  describe('when the page opens with a query', () => {
    it('given ?q=fleabag, when the search is in flight, then the state is loading', async () => {
      const { search } = await mountSearchResults('/search?q=fleabag');

      expect(search.shows.value.status).toBe('loading');
    });

    it('given ?q=fleabag, when the page mounts, then the query is sent once', async () => {
      const requestedQueries = serveSearch(fleabagResults);

      await mountSearchResults('/search?q=fleabag');
      await flushPromises();

      expect(requestedQueries).toEqual(['fleabag']);
    });

    it('given ?q=fleabag, when the search settles, then every match is listed', async () => {
      const { search } = await mountSearchResults('/search?q=fleabag');

      await flushPromises();

      expect(namesOf(search.shows.value)).toEqual(FLEABAG_RESULT_NAMES);
    });

    it('given ?q=fleabag, when the search settles, then the query is exposed', async () => {
      const { search } = await mountSearchResults('/search?q=fleabag');

      await flushPromises();

      expect(search.query.value).toBe('fleabag');
    });
  });

  describe('when the route filters by genre', () => {
    it('given &genre=Drama, when the search settles, then only Drama matches are listed', async () => {
      const { search } = await mountSearchResults('/search?q=fleabag&genre=Drama');

      await flushPromises();

      expect(namesOf(search.shows.value)).toEqual(['Fleabag']);
    });

    it('given &genre=Western, when the search settles, then the list is an empty success', async () => {
      const { search } = await mountSearchResults('/search?q=fleabag&genre=Western');

      await flushPromises();

      expect(search.shows.value).toEqual({ status: 'success', data: [] });
    });
  });

  describe('when the filtered genre is too small for a dashboard row', () => {
    it('given three Music matches, when &genre=Music, then every one of them is listed', async () => {
      serveSearch(musicResults);

      const { search } = await mountSearchResults('/search?q=music&genre=Music');
      await flushPromises();

      expect(namesOf(search.shows.value)).toEqual(MUSIC_RESULT_NAMES);
    });

    it('given three Music matches, when &genre=Other, then none of them is listed', async () => {
      serveSearch(musicResults);

      const { search } = await mountSearchResults('/search?q=music&genre=Other');
      await flushPromises();

      expect(namesOf(search.shows.value)).toEqual([]);
    });
  });

  describe('when the page opens without a query', () => {
    it('given no q, when the page mounts, then the state is idle', async () => {
      const { search } = await mountSearchResults('/search');

      await flushPromises();

      expect(search.shows.value.status).toBe('idle');
    });

    it('given no q, when the page mounts, then nothing is sent', async () => {
      const requestedQueries = serveSearch(fleabagResults);

      await mountSearchResults('/search');
      await flushPromises();

      expect(requestedQueries).toEqual([]);
    });
  });

  describe('when the query in the URL changes', () => {
    it('given a new q, when the navigation settles, then the new results are listed', async () => {
      const { search, router } = await mountSearchResults('/search?q=zzzz');
      await flushPromises();

      await router.push('/search?q=fleabag');
      await flushPromises();

      expect(namesOf(search.shows.value)).toEqual(FLEABAG_RESULT_NAMES);
    });

    it('given a slow first query, when a newer one has answered, then the stale reply loses', async () => {
      serveSearch(slowPrefixSearch);
      const { search, router } = await mountSearchResults('/search?q=flea');

      await router.push('/search?q=fleabag');
      await flushPromises();
      await vi.advanceTimersByTimeAsync(SLOW_RESPONSE_MS);

      expect(namesOf(search.shows.value)).toEqual(FLEABAG_RESULT_NAMES);
    });

    it('given a search in flight, when the query is emptied, then the state returns to idle', async () => {
      const { search, router } = await mountSearchResults('/search?q=fleabag');
      await flushPromises();

      await router.push('/search');
      await flushPromises();

      expect(search.shows.value.status).toBe('idle');
    });
  });

  describe('when the search fails', () => {
    it('given a 500 on every attempt, when the search settles, then the failure surfaces', async () => {
      serveSearch(serverError);

      const { search } = await mountSearchResults('/search?q=fleabag');
      await settleFailedSearch();

      expect(errorOf(search.shows.value)).toBeInstanceOf(HttpError);
    });

    it('given a failed search, when retried against a healthy API, then the results are listed', async () => {
      serveSearch(searchAfterFailedAttempts());
      const { search } = await mountSearchResults('/search?q=fleabag');
      await settleFailedSearch();

      search.retry();
      await flushPromises();

      expect(namesOf(search.shows.value)).toEqual(FLEABAG_RESULT_NAMES);
    });
  });

  describe('when the page is left', () => {
    it('given a search in flight, when the scope is disposed, then the request is aborted', async () => {
      const searchSignals = serveSlowSearchesRecordingSignals();
      const { unmount } = await mountSearchResults('/search?q=flea');
      await flushPromises();

      unmount();
      await flushPromises();

      expect(searchSignals.map((signal) => signal.aborted)).toEqual([true]);
    });
  });
});
