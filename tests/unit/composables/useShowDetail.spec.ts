import type { TestingPinia } from '@pinia/testing';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { HttpResponse, delay, http } from 'msw';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MaybeRefOrGetter } from 'vue';
import { ref } from 'vue';
import { useShowDetail } from '@/composables/useShowDetail';
import type { AsyncState } from '@/domain/async-state';
import { NotFoundError } from '@/domain/not-found-error';
import type { Show, ShowId } from '@/domain/show';
import { toShowId } from '@/domain/show';
import { useShowsStore } from '@/stores/shows';
import { showPayloadWithId } from '../../msw/handlers';
import { server } from '../../msw/server';
import breakingBadPayload from '../../resources/show-169.2026-09-16.json';
import { withSetup } from './with-setup';

const SHOW_URL = 'https://api.tvmaze.com/shows/:id';
const RETRY_WINDOW_MS = 5_000;
const SLOW_RESPONSE_MS = 1_000;
const UNDER_THE_DOME = toShowId(1);
const PERSON_OF_INTEREST = toShowId(2);
const BREAKING_BAD = toShowId(169);

type ShowDetail = ReturnType<typeof useShowDetail>;
type Harness = {
  readonly detail: ShowDetail;
  readonly unmount: () => void;
};

let pinia: TestingPinia;

const nameOf = (state: AsyncState<Show, Error>): string | null =>
  state.status === 'success' ? state.data.name : null;

const errorOf = (state: AsyncState<Show, Error>): Error | null =>
  state.status === 'error' ? state.error : null;

function mountShowDetail(id: MaybeRefOrGetter<ShowId | null>): Harness {
  const { result, unmount } = withSetup(() => useShowDetail(id), [pinia]);

  return { detail: result, unmount };
}

/** Warms the session's details the way a first visit to the detail page does. */
const fetchDetailOnce = (id: ShowId): Promise<unknown> => useShowsStore().loadShowDetail(id);

function trackShowRequests(): string[] {
  const requestedIds: string[] = [];

  server.use(
    http.get(SHOW_URL, ({ params }) => {
      const id = String(params['id']);

      requestedIds.push(id);

      return HttpResponse.json(showPayloadWithId(Number(id)));
    }),
  );

  return requestedIds;
}

const serveShowsById = (): void => {
  server.use(
    http.get(SHOW_URL, ({ params }) => HttpResponse.json(showPayloadWithId(Number(params.id)))),
  );
};

/** Show 1 answers late, so a reply for an abandoned id would be visible if it landed. */
function serveSlowFirstShow(): void {
  server.use(
    http.get(SHOW_URL, async ({ params }) => {
      const id = Number(params.id);

      if (id === UNDER_THE_DOME) {
        await delay(SLOW_RESPONSE_MS);
      }

      return HttpResponse.json(showPayloadWithId(id));
    }),
  );
}

const serveMissingShow = (): void => {
  server.use(http.get(SHOW_URL, () => new HttpResponse(null, { status: 404 })));
};

const serveBrokenApi = (): void => {
  server.use(http.get(SHOW_URL, () => new HttpResponse(null, { status: 500 })));
};

function serveShowAfterOneFailure(): void {
  let hasFailed = false;

  server.use(
    http.get(SHOW_URL, () => {
      if (hasFailed) {
        return HttpResponse.json(breakingBadPayload);
      }

      hasFailed = true;
      return new HttpResponse(null, { status: 404 });
    }),
  );
}

function serveNeverEndingShow(): void {
  server.use(
    http.get(SHOW_URL, async () => {
      await delay('infinite');

      return HttpResponse.json(breakingBadPayload);
    }),
  );
}

async function settleThroughRetries(): Promise<void> {
  await vi.advanceTimersByTimeAsync(RETRY_WINDOW_MS);
  await flushPromises();
}

beforeEach(() => {
  vi.useFakeTimers();
  pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  setActivePinia(pinia);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useShowDetail', () => {
  describe('when the show was already fetched in this session', () => {
    it('given a fetched detail, when the host mounts, then the show is there without loading', async () => {
      await fetchDetailOnce(BREAKING_BAD);

      const { detail } = mountShowDetail(BREAKING_BAD);

      expect(nameOf(detail.show.value)).toBe('Breaking Bad');
    });

    it('given a fetched detail, when the host mounts, then no show is requested again', async () => {
      await fetchDetailOnce(BREAKING_BAD);
      const requestedIds = trackShowRequests();

      mountShowDetail(BREAKING_BAD);
      await flushPromises();

      expect(requestedIds).toEqual([]);
    });
  });

  describe('when the show is missing from the index', () => {
    it('given an unindexed id, when the request is in flight, then the state is loading', () => {
      const { detail } = mountShowDetail(BREAKING_BAD);

      expect(detail.show.value.status).toBe('loading');
    });

    it('given an unindexed id, when the request lands, then the show is returned', async () => {
      const { detail } = mountShowDetail(BREAKING_BAD);

      await flushPromises();

      expect(nameOf(detail.show.value)).toBe('Breaking Bad');
    });

    it('given an unindexed id, when the request lands, then it is fetched once', async () => {
      const requestedIds = trackShowRequests();

      mountShowDetail(BREAKING_BAD);
      await flushPromises();

      expect(requestedIds).toEqual(['169']);
    });
  });

  describe('when the show does not exist', () => {
    it('given a 404, when the request fails, then the state is an error', async () => {
      serveMissingShow();

      const { detail } = mountShowDetail(BREAKING_BAD);
      await flushPromises();

      expect(detail.show.value.status).toBe('error');
    });

    it('given a 404, when the request fails, then the show reads as not found', async () => {
      serveMissingShow();

      const { detail } = mountShowDetail(BREAKING_BAD);
      await flushPromises();

      expect(detail.isNotFound.value).toBe(true);
    });

    it('given a 404, when the request fails, then the failure is a not-found error', async () => {
      serveMissingShow();

      const { detail } = mountShowDetail(BREAKING_BAD);
      await flushPromises();

      expect(errorOf(detail.show.value)).toBeInstanceOf(NotFoundError);
    });
  });

  describe('when the API is broken', () => {
    it('given a 500, when the request fails, then the state is an error', async () => {
      serveBrokenApi();

      const { detail } = mountShowDetail(BREAKING_BAD);
      await settleThroughRetries();

      expect(detail.show.value.status).toBe('error');
    });

    it('given a 500, when the request fails, then the show does not read as not found', async () => {
      serveBrokenApi();

      const { detail } = mountShowDetail(BREAKING_BAD);
      await settleThroughRetries();

      expect(detail.isNotFound.value).toBe(false);
    });
  });

  describe('when the id is missing', () => {
    it('given a null id, when resolved, then the state is an error', async () => {
      const { detail } = mountShowDetail(null);
      await flushPromises();

      expect(detail.show.value.status).toBe('error');
    });

    it('given a null id, when resolved, then the show reads as not found', async () => {
      const { detail } = mountShowDetail(null);
      await flushPromises();

      expect(detail.isNotFound.value).toBe(true);
    });

    it('given a null id, when resolved, then the failure is a not-found error', async () => {
      const { detail } = mountShowDetail(null);
      await flushPromises();

      expect(errorOf(detail.show.value)).toBeInstanceOf(NotFoundError);
    });

    it('given a null id, when resolved, then no show is requested', async () => {
      const requestedIds = trackShowRequests();

      mountShowDetail(null);
      await flushPromises();

      expect(requestedIds).toEqual([]);
    });
  });

  describe('when the id changes', () => {
    it('given a new id, when it is set, then the other show is returned', async () => {
      serveShowsById();
      const id = ref<ShowId | null>(UNDER_THE_DOME);
      const { detail } = mountShowDetail(id);
      await flushPromises();

      id.value = PERSON_OF_INTEREST;
      await flushPromises();

      expect(nameOf(detail.show.value)).toBe('Show 2');
    });

    it('given a slow first request, when the id changes, then the abandoned reply never lands', async () => {
      serveSlowFirstShow();
      const id = ref<ShowId | null>(UNDER_THE_DOME);
      const { detail } = mountShowDetail(id);

      id.value = PERSON_OF_INTEREST;
      await flushPromises();
      await vi.advanceTimersByTimeAsync(SLOW_RESPONSE_MS);

      expect(nameOf(detail.show.value)).toBe('Show 2');
    });
  });

  describe('when the load is retried', () => {
    it('given a failed load, when retried against a healthy API, then the show is returned', async () => {
      serveShowAfterOneFailure();
      const { detail } = mountShowDetail(BREAKING_BAD);
      await flushPromises();

      await detail.retry();
      await flushPromises();

      expect(nameOf(detail.show.value)).toBe('Breaking Bad');
    });

    it('given a failed load, when retried, then the show is requested again', async () => {
      serveMissingShow();
      const { detail } = mountShowDetail(BREAKING_BAD);
      await flushPromises();
      const requestedIds = trackShowRequests();

      await detail.retry();
      await flushPromises();

      expect(requestedIds).toEqual(['169']);
    });
  });

  describe('when the scope is disposed mid-flight', () => {
    it('given a pending request, when unmounted, then the state stops changing', async () => {
      serveNeverEndingShow();
      const { detail, unmount } = mountShowDetail(BREAKING_BAD);

      unmount();
      await flushPromises();

      expect(detail.show.value.status).toBe('loading');
    });
  });
});
