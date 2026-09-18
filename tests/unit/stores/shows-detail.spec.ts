import { createTestingPinia } from '@pinia/testing';
import { delay, http, HttpResponse } from 'msw';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AbortError } from '@/domain/api-error';
import { NotFoundError } from '@/domain/not-found-error';
import { toShowId } from '@/domain/show';
import { useShowsStore } from '@/stores/shows';
import { showPayloadWithId } from '../../msw/handlers';
import { server } from '../../msw/server';
import breakingBadShow from '../../resources/show-169.2026-09-16.json';

const SHOW_URL = 'https://api.tvmaze.com/shows/:id';
const BACKGROUND_WINDOW_MS = 10_000;
const BREAKING_BAD = toShowId(169);
const DELETED_SHOW = toShowId(99999);

/** The rejection reason as a value, so it can be asserted on after the fact. */
const failureOf = (pending: Promise<unknown>): Promise<unknown> =>
  pending.then(
    () => null,
    (reason: unknown) => reason,
  );

/** Serves the captured show under whichever id is asked for, and counts the requests. */
function serveShowDetails(): () => readonly string[] {
  const requestedIds: string[] = [];

  server.use(
    http.get(SHOW_URL, ({ params }) => {
      const id = String(params['id']);

      requestedIds.push(id);

      if (id === String(DELETED_SHOW)) {
        return new HttpResponse(null, { status: 404 });
      }

      return HttpResponse.json(showPayloadWithId(Number(id)));
    }),
  );

  return () => requestedIds;
}

function serveNeverEndingShow(): void {
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
  describe('when no detail has been fetched', () => {
    it('given a new store, when getShowDetailById is called, then it returns null', () => {
      const store = useShowsStore();

      expect(store.getShowDetailById(BREAKING_BAD)).toBeNull();
    });
  });

  describe('when the show detail loads', () => {
    it('given show 169, when loadShowDetail resolves, then the detail is returned', async () => {
      const store = useShowsStore();

      const detail = await store.loadShowDetail(BREAKING_BAD);

      expect(detail).toMatchObject({ id: 169, name: 'Breaking Bad', status: 'Ended' });
    });

    it('given show 169, when loadShowDetail resolves, then the summary html comes with it', async () => {
      const store = useShowsStore();

      const detail = await store.loadShowDetail(BREAKING_BAD);

      expect(detail.summaryHtml).toBe(breakingBadShow.summary);
    });

    it('given show 169, when loadShowDetail resolves, then getShowDetailById finds it', async () => {
      const store = useShowsStore();

      await store.loadShowDetail(BREAKING_BAD);

      expect(store.getShowDetailById(BREAKING_BAD)?.name).toBe('Breaking Bad');
    });

    it('given show 169, when loadShowDetail resolves, then its list fields join the index', async () => {
      const store = useShowsStore();

      await store.loadShowDetail(BREAKING_BAD);

      expect(store.getShowById(BREAKING_BAD)?.name).toBe('Breaking Bad');
    });

    it('given show 169, when loadShowDetail resolves, then the indexed show carries no summary', async () => {
      const store = useShowsStore();

      await store.loadShowDetail(BREAKING_BAD);

      expect(store.getShowById(BREAKING_BAD)).not.toHaveProperty('summaryHtml');
    });
  });

  describe('when the same detail is asked for twice', () => {
    it('given a loaded detail, when loadShowDetail runs again, then the show is requested once', async () => {
      const requestedIds = serveShowDetails();
      const store = useShowsStore();

      await store.loadShowDetail(BREAKING_BAD);
      await store.loadShowDetail(BREAKING_BAD);

      expect(requestedIds()).toEqual([String(BREAKING_BAD)]);
    });

    it('given a loaded detail, when loadShowDetail runs again, then the same detail comes back', async () => {
      serveShowDetails();
      const store = useShowsStore();

      const first = await store.loadShowDetail(BREAKING_BAD);
      const second = await store.loadShowDetail(BREAKING_BAD);

      expect(second).toBe(first);
    });
  });

  describe('when the show is in the index but has no detail yet', () => {
    it('given an indexed show, when loadShowDetail runs, then the detail is still requested', async () => {
      const requestedIds = serveShowDetails();
      const store = useShowsStore();
      await store.ensureShows([BREAKING_BAD]);

      await store.loadShowDetail(BREAKING_BAD);

      expect(requestedIds()).toEqual([String(BREAKING_BAD), String(BREAKING_BAD)]);
    });
  });

  describe('when TVmaze no longer has the show', () => {
    it('given a deleted id, when loadShowDetail rejects, then the reason is a NotFoundError', async () => {
      serveShowDetails();
      const store = useShowsStore();

      const failure = failureOf(store.loadShowDetail(DELETED_SHOW));

      expect(await failure).toBeInstanceOf(NotFoundError);
    });

    it('given a deleted id, when loadShowDetail rejects, then nothing joined the index', async () => {
      serveShowDetails();
      const store = useShowsStore();

      await failureOf(store.loadShowDetail(DELETED_SHOW));

      expect(store.getShowById(DELETED_SHOW)).toBeNull();
    });
  });

  describe('when the caller aborts', () => {
    it('given an abort while the show is pending, when loadShowDetail rejects, then it is an AbortError', async () => {
      serveNeverEndingShow();
      const store = useShowsStore();
      const controller = new AbortController();

      const failure = failureOf(store.loadShowDetail(BREAKING_BAD, controller.signal));
      controller.abort();

      expect(await failure).toBeInstanceOf(AbortError);
    });

    it('given a signal aborted before the call, when loadShowDetail rejects, then it is an AbortError', async () => {
      serveShowDetails();
      const store = useShowsStore();
      const controller = new AbortController();
      controller.abort();

      const failure = failureOf(store.loadShowDetail(BREAKING_BAD, controller.signal));

      expect(await failure).toBeInstanceOf(AbortError);
    });

    it('given a signal aborted before the call, when loadShowDetail rejects, then no detail is kept', async () => {
      serveShowDetails();
      const store = useShowsStore();
      const controller = new AbortController();
      controller.abort();

      await failureOf(store.loadShowDetail(BREAKING_BAD, controller.signal));

      expect(store.getShowDetailById(BREAKING_BAD)).toBeNull();
    });
  });
});
