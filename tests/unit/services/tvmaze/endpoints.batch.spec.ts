import { flushPromises } from '@vue/test-utils';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/domain/api-error';
import type { ShowId } from '@/domain/show';
import { toShowId } from '@/domain/show';
import { RETRY_BASE_DELAY_MS } from '@/services/http/client';
import type { ShowBatch } from '@/services/tvmaze/endpoints';
import { getShows, MAX_CONCURRENT_SHOW_REQUESTS } from '@/services/tvmaze/endpoints';
import { showPayloadWithId } from '../../../msw/handlers';
import { server } from '../../../msw/server';

const SHOW_URL = 'https://api.tvmaze.com/shows/:id';
const RETRY_WINDOW_MS = 5_000;
const DELETED_ID = toShowId(404);
const BROKEN_ID = toShowId(500);

const ids = (...values: readonly number[]): readonly ShowId[] => values.map(toShowId);

const idsOf = (batch: ShowBatch): readonly number[] => batch.found.map((show) => show.id);

/** Twice the concurrency cap, so a second round of requests has to wait for the first. */
const TWICE_THE_CAP = ids(1, 2, 3, 4, 5, 6, 7, 8);

type HeldShows = {
  /** The most requests that were inside the handler at the same moment. */
  readonly peakInFlight: () => number;
  /** Every request the handler has seen, released or not. */
  readonly requestCount: () => number;
  readonly releasePending: () => void;
};

/** Every show resolves, except the ids named after the status they answer with. */
function serveShows(): readonly number[] {
  const requestedIds: number[] = [];

  server.use(
    http.get(SHOW_URL, ({ params }) => {
      const id = Number(params['id']);

      requestedIds.push(id);

      if (id === DELETED_ID) {
        return new HttpResponse(null, { status: 404 });
      }

      if (id === BROKEN_ID) {
        return new HttpResponse(null, { status: 500 });
      }

      return HttpResponse.json(showPayloadWithId(id));
    }),
  );

  return requestedIds;
}

/** Holds every response until it is released, so the requests in flight can be counted. */
function serveHeldShows(): HeldShows {
  let inFlight = 0;
  let peak = 0;
  let requests = 0;
  let waiting: (() => void)[] = [];

  server.use(
    http.get(SHOW_URL, async ({ params }) => {
      inFlight += 1;
      requests += 1;
      peak = Math.max(peak, inFlight);

      await new Promise<void>((resolve) => waiting.push(resolve));

      inFlight -= 1;
      return HttpResponse.json(showPayloadWithId(Number(params['id'])));
    }),
  );

  function releasePending(): void {
    const pending = waiting;

    waiting = [];
    pending.forEach((resolve) => resolve());
  }

  return { peakInFlight: () => peak, requestCount: () => requests, releasePending };
}

/** Waits until the batch has filled its concurrency window, so a whole round is pending. */
async function whenTheWindowIsFull(held: HeldShows): Promise<void> {
  while (held.requestCount() < MAX_CONCURRENT_SHOW_REQUESTS) {
    await flushPromises();
  }
}

/** Releases the held responses round by round until the whole batch has settled. */
async function settleHeld(pending: Promise<ShowBatch>, held: HeldShows): Promise<ShowBatch> {
  let isSettled = false;
  const batch = pending.finally(() => {
    isSettled = true;
  });

  while (!isSettled) {
    await flushPromises();
    held.releasePending();
    await flushPromises();
  }

  return batch;
}

describe('getShows', () => {
  describe('when every id resolves', () => {
    it('given three ids, when fetched, then the shows keep the request order', async () => {
      serveShows();

      const batch = await getShows(ids(3, 1, 2));

      expect(idsOf(batch)).toEqual([3, 1, 2]);
    });

    it('given three ids, when fetched, then no failure is reported', async () => {
      serveShows();

      const batch = await getShows(ids(3, 1, 2));

      expect(batch.failure).toBeNull();
    });

    it('given no id, when fetched, then nothing is found and nothing fails', async () => {
      serveShows();

      const batch = await getShows([]);

      expect(batch).toEqual({ found: [], deleted: [], failure: null });
    });

    it('given three live ids, when fetched, then no id is reported as deleted', async () => {
      serveShows();

      const batch = await getShows(ids(3, 1, 2));

      expect(batch.deleted).toEqual([]);
    });
  });

  describe('when TVmaze no longer has a show', () => {
    it('given a deleted id among live ones, when fetched, then it is left out', async () => {
      serveShows();

      const batch = await getShows(ids(1, DELETED_ID, 2));

      expect(idsOf(batch)).toEqual([1, 2]);
    });

    it('given a deleted id among live ones, when fetched, then it is reported as deleted', async () => {
      serveShows();

      const batch = await getShows(ids(1, DELETED_ID, 2));

      expect(batch.deleted).toEqual([DELETED_ID]);
    });

    it('given a deleted id among live ones, when fetched, then no failure is reported', async () => {
      serveShows();

      const batch = await getShows(ids(1, DELETED_ID, 2));

      expect(batch.failure).toBeNull();
    });
  });

  describe('when the caller aborts before the batch starts', () => {
    it('given an aborted signal, when fetched, then no request reaches TVmaze', async () => {
      const requestedIds = serveShows();
      const controller = new AbortController();
      controller.abort();

      await getShows(ids(1, 2), controller.signal);

      expect(requestedIds).toEqual([]);
    });

    it('given an aborted signal, when fetched, then no show is found', async () => {
      serveShows();
      const controller = new AbortController();
      controller.abort();

      const batch = await getShows(ids(1, 2), controller.signal);

      expect(batch.found).toEqual([]);
    });

    it('given an aborted signal, when fetched, then nothing is reported as deleted', async () => {
      serveShows();
      const controller = new AbortController();
      controller.abort();

      const batch = await getShows(ids(1, 2), controller.signal);

      expect(batch.deleted).toEqual([]);
    });
  });

  describe('when the caller aborts while the batch is running', () => {
    it('given an abort after the first responses, when ids are still queued, then they are never requested', async () => {
      const held = serveHeldShows();
      const controller = new AbortController();

      const pending = getShows(TWICE_THE_CAP, controller.signal);
      await whenTheWindowIsFull(held);
      held.releasePending();
      controller.abort();
      await pending;

      expect(held.requestCount()).toBe(MAX_CONCURRENT_SHOW_REQUESTS);
    });
  });

  describe('when more ids are asked for than the concurrency cap', () => {
    it('given eight ids, when fetched, then at most four requests are in flight at once', async () => {
      const held = serveHeldShows();

      await settleHeld(getShows(TWICE_THE_CAP), held);

      expect(held.peakInFlight()).toBe(MAX_CONCURRENT_SHOW_REQUESTS);
    });

    it('given eight ids, when fetched, then every show still comes back in order', async () => {
      const held = serveHeldShows();

      const batch = await settleHeld(getShows(TWICE_THE_CAP), held);

      expect(idsOf(batch)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });
  });
});

describe('getShows when a request fails', () => {
  beforeEach(() => vi.useFakeTimers());

  afterEach(() => vi.useRealTimers());

  describe('when one id answers with a server error', () => {
    it('given a failing id among live ones, when fetched, then the failure is reported', async () => {
      serveShows();

      const pending = getShows(ids(1, BROKEN_ID, 2));
      await vi.advanceTimersByTimeAsync(RETRY_WINDOW_MS);
      const batch = await pending;

      expect(batch.failure).toBeInstanceOf(HttpError);
    });

    it('given a failing id among live ones, when fetched, then the status is carried', async () => {
      serveShows();

      const pending = getShows(ids(1, BROKEN_ID, 2));
      await vi.advanceTimersByTimeAsync(RETRY_WINDOW_MS);
      const batch = await pending;

      expect(batch.failure).toHaveProperty('status', 500);
    });

    it('given a failing id among live ones, when fetched, then the other shows still come back', async () => {
      serveShows();

      const pending = getShows(ids(1, BROKEN_ID, 2));
      await vi.advanceTimersByTimeAsync(RETRY_WINDOW_MS);
      const batch = await pending;

      expect(idsOf(batch)).toEqual([1, 2]);
    });

    it('given a failing id, when fetched, then the one retry waits the base back-off', async () => {
      let requestCount = 0;
      server.use(
        http.get(SHOW_URL, () => {
          requestCount += 1;
          return new HttpResponse(null, { status: 500 });
        }),
      );

      const pending = getShows(ids(BROKEN_ID));
      await vi.advanceTimersByTimeAsync(RETRY_BASE_DELAY_MS);
      await pending;

      expect(requestCount).toBe(2);
    });
  });
});
