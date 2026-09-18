import type { TestingPinia } from '@pinia/testing';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { HttpResponse, delay, http } from 'msw';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MaybeRefOrGetter } from 'vue';
import { nextTick, ref } from 'vue';
import { useSavedShows } from '@/composables/useSavedShows';
import { HttpError } from '@/domain/api-error';
import type { AsyncState } from '@/domain/async-state';
import type { SavedKind } from '@/domain/saved';
import type { Show, ShowId } from '@/domain/show';
import { toShowId } from '@/domain/show';
import { RETRY_BASE_DELAY_MS } from '@/services/http/client';
import { useSavedStore } from '@/stores/saved';
import { useShowsStore } from '@/stores/shows';
import { showPayloadWithId } from '../../msw/handlers';
import { server } from '../../msw/server';
import breakingBadPayload from '../../resources/show-169.2026-09-16.json';
import { createTestRouter } from './test-router';
import { withSetup } from './with-setup';

const SHOW_URL = 'https://api.tvmaze.com/shows/:id';
/** The client tries a 5xx twice; both have to fail before the load itself fails. */
const SERVER_ERROR_ATTEMPTS = 2;
const UNDER_THE_DOME = toShowId(1);
const PERSON_OF_INTEREST = toShowId(2);
const BREAKING_BAD = toShowId(169);
/** An id no index page carries, so only a request can settle it. */
const DELETED_SHOW = toShowId(4242);

type SavedShows = ReturnType<typeof useSavedShows>;
type Harness = {
  readonly saved: SavedShows;
  readonly unmount: () => void;
};

let pinia: TestingPinia;

const namesOf = (state: AsyncState<readonly Show[], Error>): readonly string[] =>
  state.status === 'success' ? state.data.map((show) => show.name) : [];

const errorOf = (state: AsyncState<readonly Show[], Error>): Error | null =>
  state.status === 'error' ? state.error : null;

async function mountSavedShows(kind: MaybeRefOrGetter<SavedKind>): Promise<Harness> {
  const router = await createTestRouter('/bookmarked');
  const { result, unmount } = withSetup(() => useSavedShows(kind), [pinia, router]);

  return { saved: result, unmount };
}

/** Page 0 of the captured index; it already holds ids 1, 2 and 169. */
const loadIndex = (): Promise<void> => useShowsStore().loadIndex();

const bookmark = (id: ShowId): void => useSavedStore().toggle('bookmarks', id);

const bookmarkAll = (ids: readonly ShowId[]): void => ids.forEach(bookmark);

/** Records every detail request and answers each one as the show it asked for. */
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

/** Every show resolves as itself, except `brokenId`, which answers 500 on every attempt. */
function serveShowsExcept(brokenId: ShowId): void {
  server.use(
    http.get(SHOW_URL, ({ params }) => {
      const id = Number(params['id']);

      if (id === brokenId) {
        return new HttpResponse(null, { status: 500 });
      }

      return HttpResponse.json(showPayloadWithId(id));
    }),
  );
}

function serveMissingShow(): void {
  server.use(http.get(SHOW_URL, () => new HttpResponse(null, { status: 404 })));
}

const serveBrokenApi = (): void => {
  server.use(http.get(SHOW_URL, () => new HttpResponse(null, { status: 500 })));
};

/** Fails the first load outright — both attempts the client makes for a 5xx — then recovers. */
function serveShowAfterFailedLoad(): void {
  let attempts = 0;

  server.use(
    http.get(SHOW_URL, () => {
      attempts += 1;

      if (attempts <= SERVER_ERROR_ATTEMPTS) {
        return new HttpResponse(null, { status: 500 });
      }

      return HttpResponse.json(breakingBadPayload);
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

/** A 5xx costs one back-off before the failure settles. */
async function settleFailedLoad(): Promise<void> {
  await vi.advanceTimersByTimeAsync(RETRY_BASE_DELAY_MS);
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

describe('useSavedShows', () => {
  describe('when nothing is saved', () => {
    it('given no saved ids, when resolved, then the shows are an empty success', async () => {
      const { saved } = await mountSavedShows('bookmarks');
      await flushPromises();

      expect(saved.shows.value).toEqual({ status: 'success', data: [] });
    });

    it('given no saved ids, when resolved, then no show is requested', async () => {
      const requestedIds = trackShowRequests();

      await mountSavedShows('bookmarks');
      await flushPromises();

      expect(requestedIds).toEqual([]);
    });
  });

  describe('when every saved id is in the index', () => {
    it('given two bookmarks, when resolved, then the shows come back rated first', async () => {
      await loadIndex();
      bookmark(UNDER_THE_DOME);
      bookmark(PERSON_OF_INTEREST);

      const { saved } = await mountSavedShows('bookmarks');
      await flushPromises();

      expect(namesOf(saved.shows.value)).toEqual(['Person of Interest', 'Under the Dome']);
    });

    it('given two bookmarks, when resolved, then no show is requested', async () => {
      await loadIndex();
      bookmark(UNDER_THE_DOME);
      const requestedIds = trackShowRequests();

      await mountSavedShows('bookmarks');
      await flushPromises();

      expect(requestedIds).toEqual([]);
    });
  });

  describe('when a saved id is missing from the index', () => {
    it('given an unindexed bookmark, when the request is in flight, then the state is loading', async () => {
      bookmark(BREAKING_BAD);

      const { saved } = await mountSavedShows('bookmarks');

      expect(saved.shows.value.status).toBe('loading');
    });

    it('given an unindexed bookmark, when the request lands, then the show is listed', async () => {
      bookmark(BREAKING_BAD);

      const { saved } = await mountSavedShows('bookmarks');
      await flushPromises();

      expect(namesOf(saved.shows.value)).toEqual(['Breaking Bad']);
    });

    it('given a deleted bookmark, when the 404 lands, then it is left out of a successful list', async () => {
      serveMissingShow();
      bookmark(BREAKING_BAD);

      const { saved } = await mountSavedShows('bookmarks');
      await flushPromises();

      expect(saved.shows.value).toEqual({ status: 'success', data: [] });
    });

    it('given a broken API, when every attempt fails, then the HTTP failure surfaces', async () => {
      serveBrokenApi();
      bookmark(BREAKING_BAD);

      const { saved } = await mountSavedShows('bookmarks');
      await settleFailedLoad();

      expect(errorOf(saved.shows.value)).toBeInstanceOf(HttpError);
    });

    it('given a failed load, when retried against a healthy API, then the show is listed', async () => {
      serveShowAfterFailedLoad();
      bookmark(BREAKING_BAD);
      const { saved } = await mountSavedShows('bookmarks');
      await settleFailedLoad();

      await saved.retry();
      await flushPromises();

      expect(namesOf(saved.shows.value)).toEqual(['Breaking Bad']);
    });
  });

  describe('when one of several missing ids fails', () => {
    it('given three unindexed bookmarks, when one answers 500, then the state is an error', async () => {
      serveShowsExcept(PERSON_OF_INTEREST);
      bookmarkAll([UNDER_THE_DOME, PERSON_OF_INTEREST, BREAKING_BAD]);

      const { saved } = await mountSavedShows('bookmarks');
      await settleFailedLoad();

      expect(saved.shows.value.status).toBe('error');
    });

    it('given the other two merged into the index, when retried, then only the failed id is requested', async () => {
      serveShowsExcept(PERSON_OF_INTEREST);
      bookmarkAll([UNDER_THE_DOME, PERSON_OF_INTEREST, BREAKING_BAD]);
      const { saved } = await mountSavedShows('bookmarks');
      await settleFailedLoad();
      const requestedIds = trackShowRequests();

      await saved.retry();
      await flushPromises();

      expect(requestedIds).toEqual(['2']);
    });
  });

  describe('when the saved ids change', () => {
    it('given two bookmarks, when one is removed, then the list shrinks', async () => {
      await loadIndex();
      bookmark(UNDER_THE_DOME);
      bookmark(PERSON_OF_INTEREST);
      const { saved } = await mountSavedShows('bookmarks');
      await flushPromises();

      bookmark(UNDER_THE_DOME);
      await flushPromises();

      expect(namesOf(saved.shows.value)).toEqual(['Person of Interest']);
    });

    it('given two bookmarks, when one is removed, then no show is requested', async () => {
      await loadIndex();
      bookmark(UNDER_THE_DOME);
      bookmark(PERSON_OF_INTEREST);
      await mountSavedShows('bookmarks');
      await flushPromises();
      const requestedIds = trackShowRequests();

      bookmark(UNDER_THE_DOME);
      await flushPromises();

      expect(requestedIds).toEqual([]);
    });
  });

  describe('when a saved show is one TVmaze deleted', () => {
    it('given a deleted bookmark, when another id is saved, then it is not requested again', async () => {
      serveMissingShow();
      await loadIndex();
      bookmark(DELETED_SHOW);
      await mountSavedShows('bookmarks');
      await flushPromises();
      const requestedIds = trackShowRequests();

      bookmark(UNDER_THE_DOME);
      await flushPromises();

      expect(requestedIds).toEqual([]);
    });

    it('given a deleted bookmark, when another id is saved, then the grid resolves without loading', async () => {
      serveMissingShow();
      await loadIndex();
      bookmark(DELETED_SHOW);
      const { saved } = await mountSavedShows('bookmarks');
      await flushPromises();

      bookmark(UNDER_THE_DOME);
      await nextTick();

      expect(saved.shows.value.status).toBe('success');
    });

    it('given a deleted bookmark, when another id is saved, then only the live show is listed', async () => {
      serveMissingShow();
      await loadIndex();
      bookmark(DELETED_SHOW);
      const { saved } = await mountSavedShows('bookmarks');
      await flushPromises();

      bookmark(UNDER_THE_DOME);
      await flushPromises();

      expect(namesOf(saved.shows.value)).toEqual(['Under the Dome']);
    });
  });

  describe('when the kind changes', () => {
    it('given a kind ref, when it turns to likes, then the liked shows are listed', async () => {
      await loadIndex();
      useSavedStore().toggle('bookmarks', UNDER_THE_DOME);
      useSavedStore().toggle('likes', PERSON_OF_INTEREST);
      const kind = ref<SavedKind>('bookmarks');
      const { saved } = await mountSavedShows(kind);
      await flushPromises();

      kind.value = 'likes';
      await flushPromises();

      expect(namesOf(saved.shows.value)).toEqual(['Person of Interest']);
    });
  });

  describe('when the scope is disposed mid-flight', () => {
    it('given a pending request, when unmounted, then the state stops changing', async () => {
      serveNeverEndingShow();
      bookmark(BREAKING_BAD);
      const { saved, unmount } = await mountSavedShows('bookmarks');

      unmount();
      await flushPromises();

      expect(saved.shows.value.status).toBe('loading');
    });
  });
});
