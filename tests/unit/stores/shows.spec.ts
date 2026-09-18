import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { HttpResponse, delay, http } from 'msw';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AsyncState } from '@/domain/async-state';
import type { Genre, GenreRow } from '@/domain/genre';
import type { Show } from '@/domain/show';
import { toShowId } from '@/domain/show';
import type { ApiError } from '@/domain/api-error';
import { PAGE_SPACING_MS, useShowsStore } from '@/stores/shows';
import { server } from '../../msw/server';
import pageZeroPayload from '../../resources/shows-page-0.2026-09-16.json';

const INDEX_URL = 'https://api.tvmaze.com/shows';
const PAGE_ZERO_SHOW_COUNT = 240;
const BACKGROUND_WINDOW_MS = 10_000;
const RETRY_WINDOW_MS = 5_000;
const SLOW_PAGE_MS = 3_000;
const BREAKING_BAD = toShowId(169);

type ShowsStore = ReturnType<typeof useShowsStore>;
type PageResponder = (page: string) => Promise<Response> | Response;

const notFound = (): Response => new HttpResponse(null, { status: 404 });
const serverError = (): Response => new HttpResponse(null, { status: 500 });
const wholePage = (): Response => HttpResponse.json(pageZeroPayload);

const pageZeroOnly: PageResponder = (page) => (page === '0' ? wholePage() : notFound());
const everyPage: PageResponder = () => wholePage();

const slowFirstPage: PageResponder = async (page) => {
  if (page !== '0') {
    return notFound();
  }

  await delay(SLOW_PAGE_MS);
  return wholePage();
};

/** Page 0 takes its time the first time it is asked for, then lands at once. */
function delayPageZeroOnce(): PageResponder {
  let isFirstCall = true;

  return async (page) => {
    if (page !== '0') {
      return notFound();
    }

    if (!isFirstCall) {
      return wholePage();
    }

    isFirstCall = false;
    await delay(SLOW_PAGE_MS);
    return wholePage();
  };
}

function failPageZeroTimes(attempts: number): PageResponder {
  let remaining = attempts;

  return (page) => {
    if (page !== '0') {
      return notFound();
    }

    if (remaining === 0) {
      return wholePage();
    }

    remaining -= 1;
    return serverError();
  };
}

function serveIndexPages(respond: PageResponder): string[] {
  const requestedPages: string[] = [];

  server.use(
    http.get(INDEX_URL, ({ request }) => {
      const page = new URL(request.url).searchParams.get('page') ?? '';

      requestedPages.push(page);
      return respond(page);
    }),
  );

  return requestedPages;
}

async function storeWithFirstPage(respond: PageResponder): Promise<ShowsStore> {
  serveIndexPages(respond);

  const store = useShowsStore();

  await store.loadIndex();
  return store;
}

/** A store whose first page 0 was cancelled while in flight. */
async function storeAfterAbortedFirstPage(): Promise<ShowsStore> {
  const store = useShowsStore();

  void store.loadIndex();
  await flushPromises();
  store.abort();
  await flushPromises();

  return store;
}

const showsOf = (state: AsyncState<readonly Show[], ApiError>): readonly Show[] =>
  state.status === 'success' ? state.data : [];

const genresOf = (rows: readonly GenreRow[]): readonly Genre[] => rows.map((row) => row.genre);

async function settleThroughRetries(load: Promise<void>): Promise<void> {
  await vi.advanceTimersByTimeAsync(RETRY_WINDOW_MS);
  await load;
}

beforeEach(() => {
  vi.useFakeTimers();
  setActivePinia(createTestingPinia({ stubActions: false, createSpy: vi.fn }));
});

afterEach(async () => {
  await vi.advanceTimersByTimeAsync(BACKGROUND_WINDOW_MS);
  vi.useRealTimers();
});

describe('PAGE_SPACING_MS', () => {
  describe('when the background pacing is read', () => {
    it('given the rate limit, when the constant is read, then pages are 600 ms apart', () => {
      expect(PAGE_SPACING_MS).toBe(600);
    });
  });
});

describe('useShowsStore', () => {
  describe('when nothing has loaded yet', () => {
    it('given a new store, when byGenre is read, then it holds no row', () => {
      const store = useShowsStore();

      expect(store.byGenre).toEqual([]);
    });

    it('given a new store, when getShowById is called, then it returns null', () => {
      const store = useShowsStore();

      expect(store.getShowById(BREAKING_BAD)).toBeNull();
    });

    it('given a page 0 still in flight, when the state is read, then it is loading', async () => {
      serveIndexPages(slowFirstPage);
      const store = useShowsStore();

      void store.loadIndex();
      await flushPromises();

      expect(store.indexState.status).toBe('loading');
    });
  });

  describe('when the first page has loaded', () => {
    it('given the page-0 payload, when the state is read, then it is success', async () => {
      const store = await storeWithFirstPage(pageZeroOnly);

      expect(store.indexState.status).toBe('success');
    });

    it('given the page-0 payload, when the index is read, then it holds every show', async () => {
      const store = await storeWithFirstPage(pageZeroOnly);

      expect(showsOf(store.indexState)).toHaveLength(PAGE_ZERO_SHOW_COUNT);
    });

    it('given the page-0 payload, when the progress is read, then one page is loaded', async () => {
      const store = await storeWithFirstPage(pageZeroOnly);

      expect(store.pagesLoaded).toBe(1);
    });

    it('given the page-0 payload, when byGenre is read, then it holds a Drama row', async () => {
      const store = await storeWithFirstPage(pageZeroOnly);

      expect(genresOf(store.byGenre)).toContain('Drama');
    });

    it('given the page-0 payload, when getShowById is called with 169, then it finds it', async () => {
      const store = await storeWithFirstPage(pageZeroOnly);

      expect(store.getShowById(BREAKING_BAD)?.name).toBe('Breaking Bad');
    });

    it('given a loaded index, when loadIndex runs again, then page 0 is requested once', async () => {
      const requestedPages = serveIndexPages(pageZeroOnly);
      const store = useShowsStore();

      await store.loadIndex();
      await store.loadIndex();

      expect(requestedPages).toEqual(['0']);
    });
  });

  describe('when the browser has no idle callbacks', () => {
    it('given no requestIdleCallback, when page 0 lands, then the state is success', async () => {
      vi.stubGlobal('requestIdleCallback', undefined);

      const store = await storeWithFirstPage(everyPage);

      expect(store.indexState.status).toBe('success');
    });

    it('given no requestIdleCallback, when the tick comes, then page 1 is requested anyway', async () => {
      vi.stubGlobal('requestIdleCallback', undefined);
      const requestedPages = serveIndexPages(everyPage);
      const store = useShowsStore();

      await store.loadIndex();
      await vi.advanceTimersByTimeAsync(PAGE_SPACING_MS);
      await flushPromises();

      expect(requestedPages).toContain('1');
    });

    it('given no requestIdleCallback, when the background work settles, then every page lands', async () => {
      vi.stubGlobal('requestIdleCallback', undefined);
      serveIndexPages(everyPage);
      const store = useShowsStore();

      await store.loadIndex();
      await vi.advanceTimersByTimeAsync(BACKGROUND_WINDOW_MS);
      await flushPromises();

      expect(store.isIndexComplete).toBe(true);
    });
  });

  describe('when the first page is cancelled', () => {
    it('given page 0 in flight, when abort is called, then the index turns idle at once', async () => {
      serveIndexPages(delayPageZeroOnce());
      const store = useShowsStore();
      void store.loadIndex();
      await flushPromises();

      store.abort();

      expect(store.indexState.status).toBe('idle');
    });

    it('given a cancelled page 0, when loadIndex runs again, then page 0 is requested again', async () => {
      const requestedPages = serveIndexPages(delayPageZeroOnce());
      const store = await storeAfterAbortedFirstPage();

      await store.loadIndex();

      expect(requestedPages).toEqual(['0', '0']);
    });

    it('given a cancelled page 0, when loadIndex runs again, then the index holds every show', async () => {
      serveIndexPages(delayPageZeroOnce());
      const store = await storeAfterAbortedFirstPage();

      await store.loadIndex();

      expect(showsOf(store.indexState)).toHaveLength(PAGE_ZERO_SHOW_COUNT);
    });
  });

  describe('when the first page fails', () => {
    it('given a 500 on every attempt, when loadIndex resolves, then the state is error', async () => {
      serveIndexPages(failPageZeroTimes(2));
      const store = useShowsStore();

      await settleThroughRetries(store.loadIndex());

      expect(store.indexState.status).toBe('error');
    });

    it('given a recovered server, when retry resolves, then the index is loaded', async () => {
      serveIndexPages(failPageZeroTimes(2));
      const store = useShowsStore();
      await settleThroughRetries(store.loadIndex());

      await settleThroughRetries(store.retry());

      expect(showsOf(store.indexState)).toHaveLength(PAGE_ZERO_SHOW_COUNT);
    });
  });
});
