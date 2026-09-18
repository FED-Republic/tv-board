import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { HttpResponse, delay, http } from 'msw';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Show } from '@/domain/show';
import { toShowId } from '@/domain/show';
import { PAGE_SPACING_MS, useShowsStore } from '@/stores/shows';
import { server } from '../../msw/server';
import pageZeroPayload from '../../resources/shows-page-0.2026-09-16.json';

const INDEX_URL = 'https://api.tvmaze.com/shows';
const SHOW_URL = 'https://api.tvmaze.com/shows/:id';
const BACKGROUND_WINDOW_MS = 10_000;
const SLOW_PAGE_MS = 3_000;
const BREAKING_BAD = toShowId(169);
const UNDER_THE_DOME = toShowId(1);
const DELETED_SHOW = toShowId(99999);

const UNDER_THE_DOME_PAYLOAD = pageZeroPayload[0]!;

type ShowsStore = ReturnType<typeof useShowsStore>;

const namesOf = (shows: readonly Show[]): readonly string[] => shows.map((show) => show.name);

function serveShowDetails(): string[] {
  const requestedIds: string[] = [];

  server.use(
    http.get(SHOW_URL, ({ params }) => {
      const id = String(params['id']);

      requestedIds.push(id);

      if (id !== String(UNDER_THE_DOME)) {
        return new HttpResponse(null, { status: 404 });
      }

      return HttpResponse.json(UNDER_THE_DOME_PAYLOAD);
    }),
  );

  return requestedIds;
}

function servePageZeroOnly(): void {
  server.use(
    http.get(INDEX_URL, ({ request }) => {
      const page = new URL(request.url).searchParams.get('page') ?? '';

      if (page !== '0') {
        return new HttpResponse(null, { status: 404 });
      }

      return HttpResponse.json(pageZeroPayload);
    }),
  );
}

function serveSlowBackgroundPages(): void {
  server.use(
    http.get(INDEX_URL, async ({ request }) => {
      const page = new URL(request.url).searchParams.get('page') ?? '';

      if (page !== '0') {
        await delay(SLOW_PAGE_MS);
      }

      return HttpResponse.json(pageZeroPayload);
    }),
  );
}

async function storeWithIndex(): Promise<ShowsStore> {
  servePageZeroOnly();

  const store = useShowsStore();

  await store.loadIndex();
  return store;
}

beforeEach(() => {
  vi.useFakeTimers();
  setActivePinia(createTestingPinia({ stubActions: false, createSpy: vi.fn }));
});

afterEach(async () => {
  await vi.advanceTimersByTimeAsync(BACKGROUND_WINDOW_MS);
  vi.useRealTimers();
});

describe('useShowsStore', () => {
  describe('when an id is missing from the index', () => {
    it('given an unknown id, when ensureShows resolves, then it returns the fetched show', async () => {
      serveShowDetails();
      const store = useShowsStore();

      const resolved = await store.ensureShows([UNDER_THE_DOME]);

      expect(namesOf(resolved)).toEqual(['Under the Dome']);
    });

    it('given an unknown id, when ensureShows resolves, then the show joins the index', async () => {
      serveShowDetails();
      const store = useShowsStore();

      await store.ensureShows([UNDER_THE_DOME]);

      expect(store.getShowById(UNDER_THE_DOME)?.name).toBe('Under the Dome');
    });

    it('given a fetched show, when ensureShows asks again, then it is requested once', async () => {
      const requestedIds = serveShowDetails();
      const store = useShowsStore();

      await store.ensureShows([UNDER_THE_DOME]);
      await store.ensureShows([UNDER_THE_DOME]);

      expect(requestedIds).toEqual(['1']);
    });

    it('given a deleted id, when ensureShows resolves, then the id is left out', async () => {
      serveShowDetails();
      const store = useShowsStore();

      const resolved = await store.ensureShows([DELETED_SHOW]);

      expect(resolved).toEqual([]);
    });

    it('given a deleted id beside a live one, when ensureShows resolves, then the live show still lands', async () => {
      serveShowDetails();
      const store = useShowsStore();

      const resolved = await store.ensureShows([DELETED_SHOW, UNDER_THE_DOME]);

      expect(namesOf(resolved)).toEqual(['Under the Dome']);
    });

    it('given a deleted id, when ensureShows asks again, then it is requested once', async () => {
      const requestedIds = serveShowDetails();
      const store = useShowsStore();

      await store.ensureShows([DELETED_SHOW]);
      await store.ensureShows([DELETED_SHOW]);

      expect(requestedIds).toEqual([String(DELETED_SHOW)]);
    });
  });

  describe('when a caller asks whether an id has settled', () => {
    it('given an indexed id, when hasSettled is read, then nothing is left to fetch', async () => {
      const store = await storeWithIndex();

      expect(store.hasSettled(BREAKING_BAD)).toBe(true);
    });

    it('given a deleted id, when hasSettled is read, then nothing is left to fetch', async () => {
      serveShowDetails();
      const store = useShowsStore();

      await store.ensureShows([DELETED_SHOW]);

      expect(store.hasSettled(DELETED_SHOW)).toBe(true);
    });

    it('given an id nobody asked for, when hasSettled is read, then it is still open', async () => {
      const store = await storeWithIndex();

      expect(store.hasSettled(DELETED_SHOW)).toBe(false);
    });
  });

  describe('when the ids are already indexed', () => {
    it('given an indexed id, when ensureShows resolves, then no request is made', async () => {
      const store = await storeWithIndex();
      const requestedIds = serveShowDetails();

      await store.ensureShows([BREAKING_BAD]);

      expect(requestedIds).toEqual([]);
    });

    it('given no ids, when ensureShows resolves, then it returns nothing', async () => {
      serveShowDetails();
      const store = useShowsStore();

      const resolved = await store.ensureShows([]);

      expect(resolved).toEqual([]);
    });
  });

  describe('when indexed and missing ids are mixed', () => {
    it('given two ids, when ensureShows resolves, then the result follows the id order', async () => {
      const store = await storeWithIndex();
      serveShowDetails();

      const resolved = await store.ensureShows([BREAKING_BAD, UNDER_THE_DOME]);

      expect(namesOf(resolved)).toEqual(['Breaking Bad', 'Under the Dome']);
    });
  });

  describe('when background loading is aborted', () => {
    it('given a page in flight, when abort is called, then no further page lands', async () => {
      serveSlowBackgroundPages();
      const store = useShowsStore();
      await store.loadIndex();
      await vi.advanceTimersByTimeAsync(PAGE_SPACING_MS);

      store.abort();
      await vi.advanceTimersByTimeAsync(BACKGROUND_WINDOW_MS);
      await flushPromises();

      expect(store.pagesLoaded).toBe(1);
    });

    it('given a page in flight, when abort is called, then loading more is over', async () => {
      serveSlowBackgroundPages();
      const store = useShowsStore();
      await store.loadIndex();
      await vi.advanceTimersByTimeAsync(PAGE_SPACING_MS);

      store.abort();
      await flushPromises();

      expect(store.isLoadingMore).toBe(false);
    });
  });
});
