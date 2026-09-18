import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { delay, http, HttpResponse } from 'msw';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AbortError, HttpError } from '@/domain/api-error';
import type { ShowId } from '@/domain/show';
import { toShowId } from '@/domain/show';
import { RETRY_BASE_DELAY_MS } from '@/services/http/client';
import { useShowsStore } from '@/stores/shows';
import { showPayloadWithId } from '../../msw/handlers';
import { server } from '../../msw/server';

const SHOW_URL = 'https://api.tvmaze.com/shows/:id';
const BACKGROUND_WINDOW_MS = 10_000;
const BROKEN_SHOW = toShowId(88888);
/** An id no index page carries, so the batch has to fetch it beside the broken one. */
const LIVE_SHOW = toShowId(4242);
/** An id whose request never answers, so an abort always catches it in flight. */
const HANGING_SHOW = toShowId(4243);

type ShowServer = {
  readonly requestedIds: () => readonly string[];
  readonly forgetRequests: () => void;
  /** Lets the broken id answer with its show, the way a recovered server would. */
  readonly recover: () => void;
};

/** The rejection reason as a value, so the retry window can pass before it is asserted. */
const failureOf = (pending: Promise<unknown>): Promise<unknown> =>
  pending.then(
    () => null,
    (reason: unknown) => reason,
  );

/** Answers `brokenId` with a 500 until it recovers; every other id lands as its own show. */
function serveShowsWithOneBrokenId(brokenId: ShowId): ShowServer {
  let requested: string[] = [];
  let isBroken = true;

  server.use(
    http.get(SHOW_URL, ({ params }) => {
      const id = Number(params['id']);

      requested.push(String(id));

      if (id === brokenId && isBroken) {
        return new HttpResponse(null, { status: 500 });
      }

      return HttpResponse.json(showPayloadWithId(id));
    }),
  );

  return {
    requestedIds: () => requested,
    forgetRequests: () => {
      requested = [];
    },
    recover: () => {
      isBroken = false;
    },
  };
}

/** `id` lands at once; every other id hangs, so a batch is half resolved when the abort comes. */
function serveOneShowAmongHangingOnes(id: ShowId): void {
  server.use(
    http.get(SHOW_URL, async ({ params }) => {
      if (Number(params['id']) !== id) {
        await delay('infinite');
      }

      return HttpResponse.json(showPayloadWithId(id));
    }),
  );
}

function serveNeverEndingShows(): void {
  server.use(
    http.get(SHOW_URL, async () => {
      await delay('infinite');
    }),
  );
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
  describe('when one of the requested shows fails', () => {
    it('given a failing id beside a live one, when ensureShows rejects, then the HTTP failure surfaces', async () => {
      serveShowsWithOneBrokenId(BROKEN_SHOW);
      const store = useShowsStore();

      const failure = failureOf(store.ensureShows([BROKEN_SHOW, LIVE_SHOW]));
      await vi.advanceTimersByTimeAsync(RETRY_BASE_DELAY_MS);

      expect(await failure).toBeInstanceOf(HttpError);
    });

    it('given a failing id beside a live one, when ensureShows rejects, then the live show still joined the index', async () => {
      serveShowsWithOneBrokenId(BROKEN_SHOW);
      const store = useShowsStore();

      const failure = failureOf(store.ensureShows([BROKEN_SHOW, LIVE_SHOW]));
      await vi.advanceTimersByTimeAsync(RETRY_BASE_DELAY_MS);
      await failure;

      expect(store.getShowById(LIVE_SHOW)?.id).toBe(LIVE_SHOW);
    });
  });

  describe('when the caller retries after a failure', () => {
    it('given a recovered server, when ensureShows runs again, then only the missing id is requested', async () => {
      const shows = serveShowsWithOneBrokenId(BROKEN_SHOW);
      const store = useShowsStore();
      const failure = failureOf(store.ensureShows([BROKEN_SHOW, LIVE_SHOW]));
      await vi.advanceTimersByTimeAsync(RETRY_BASE_DELAY_MS);
      await failure;

      shows.recover();
      shows.forgetRequests();
      await store.ensureShows([BROKEN_SHOW, LIVE_SHOW]);

      expect(shows.requestedIds()).toEqual([String(BROKEN_SHOW)]);
    });

    it('given a recovered server, when ensureShows runs again, then both shows come back', async () => {
      const shows = serveShowsWithOneBrokenId(BROKEN_SHOW);
      const store = useShowsStore();
      const failure = failureOf(store.ensureShows([BROKEN_SHOW, LIVE_SHOW]));
      await vi.advanceTimersByTimeAsync(RETRY_BASE_DELAY_MS);
      await failure;

      shows.recover();
      const resolved = await store.ensureShows([BROKEN_SHOW, LIVE_SHOW]);

      expect(resolved.map((show) => show.id)).toEqual([BROKEN_SHOW, LIVE_SHOW]);
    });
  });

  describe('when the caller aborts the batch', () => {
    it('given an abort while the shows are pending, when ensureShows rejects, then it is an AbortError', async () => {
      serveNeverEndingShows();
      const store = useShowsStore();
      const controller = new AbortController();

      const failure = failureOf(store.ensureShows([LIVE_SHOW], controller.signal));
      controller.abort();

      expect(await failure).toBeInstanceOf(AbortError);
    });

    it('given a show that landed first, when ensureShows rejects, then that show stays in the index', async () => {
      serveOneShowAmongHangingOnes(LIVE_SHOW);
      const store = useShowsStore();
      const controller = new AbortController();

      const failure = failureOf(store.ensureShows([LIVE_SHOW, HANGING_SHOW], controller.signal));
      await flushPromises();
      controller.abort();
      await failure;

      expect(store.getShowById(LIVE_SHOW)?.id).toBe(LIVE_SHOW);
    });

    it('given a signal aborted before the call, when ensureShows rejects, then it is an AbortError', async () => {
      serveShowsWithOneBrokenId(BROKEN_SHOW);
      const store = useShowsStore();
      const controller = new AbortController();
      controller.abort();

      const failure = failureOf(store.ensureShows([LIVE_SHOW], controller.signal));

      expect(await failure).toBeInstanceOf(AbortError);
    });

    it('given a signal aborted before the call, when ensureShows rejects, then nothing joined the index', async () => {
      serveShowsWithOneBrokenId(BROKEN_SHOW);
      const store = useShowsStore();
      const controller = new AbortController();
      controller.abort();

      await failureOf(store.ensureShows([LIVE_SHOW], controller.signal));

      expect(store.getShowById(LIVE_SHOW)).toBeNull();
    });
  });
});
