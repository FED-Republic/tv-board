import type { TestingPinia } from '@pinia/testing';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, render, screen, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { HttpResponse, http } from 'msw';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import type { ShowId } from '@/domain/show';
import { toShowId } from '@/domain/show';
import SavedShowsPage from '@/pages/SavedShowsPage.vue';
import { createAppRouter } from '@/router';
import { RETRY_BASE_DELAY_MS } from '@/services/http/client';
import { useSavedStore } from '@/stores/saved';
import { TEST_IDS } from '@/testing/test-ids';
import { server } from '../../msw/server';
import breakingBadPayload from '../../resources/show-169.2026-09-16.json';

const SHOW_URL = 'https://api.tvmaze.com/shows/:id';
/** The client tries a 5xx twice; both have to fail before the load itself fails. */
const SERVER_ERROR_ATTEMPTS = 2;
const BREAKING_BAD = toShowId(169);
const DELETED_SHOW = toShowId(99999);

let pinia: TestingPinia;

const bookmark = (id: ShowId): void => useSavedStore().toggle('bookmarks', id);

/** Nothing is in the index here, so every bookmarked id costs a detail request. */
async function renderBookmarkedShows(): Promise<void> {
  const router = createAppRouter(createMemoryHistory());

  await router.push('/bookmarked');
  await router.isReady();
  render(SavedShowsPage, { props: { kind: 'bookmarks' }, global: { plugins: [pinia, router] } });
}

const page = (): HTMLElement => screen.getByTestId(TEST_IDS.savedShowsPage);

/** A card link is named by its own content, so its collapsed text is its accessible name. */
const cardNames = (): readonly string[] =>
  within(screen.getByTestId(TEST_IDS.savedShowsGrid))
    .getAllByRole('link')
    .map((link) => link.textContent?.replace(/\s+/g, ' ').trim() ?? '');

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

/** TVmaze still has Breaking Bad; the other bookmarked id is gone. */
function serveOneDeletedShow(): void {
  server.use(
    http.get(SHOW_URL, ({ params }) => {
      if (String(params['id']) !== String(BREAKING_BAD)) {
        return new HttpResponse(null, { status: 404 });
      }

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

describe('SavedShowsPage', () => {
  describe('when the saved shows fail to load', () => {
    it('given a broken API, when every attempt fails, then the root reports error', async () => {
      serveBrokenApi();
      bookmark(BREAKING_BAD);
      await renderBookmarkedShows();

      await settleFailedLoad();

      expect(page().dataset['state']).toBe('error');
    });

    it('given a broken API, when every attempt fails, then an alert names the failure', async () => {
      serveBrokenApi();
      bookmark(BREAKING_BAD);
      await renderBookmarkedShows();

      await settleFailedLoad();

      expect(
        within(screen.getByRole('alert')).getByText("Your saved shows didn't load."),
      ).toBeDefined();
    });

    it('given a broken API, when every attempt fails, then the alert explains the status', async () => {
      serveBrokenApi();
      bookmark(BREAKING_BAD);
      await renderBookmarkedShows();

      await settleFailedLoad();

      expect(
        within(screen.getByRole('alert')).getByText(
          'TVmaze answered with an error (HTTP 500). Retry in a moment.',
        ),
      ).toBeDefined();
    });

    it('given a failed load, when Retry is pressed, then the shows are listed', async () => {
      serveShowAfterFailedLoad();
      bookmark(BREAKING_BAD);
      await renderBookmarkedShows();
      await settleFailedLoad();

      await fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      await flushPromises();

      expect(cardNames()).toEqual(['Breaking Bad, rated 9.2, 2008']);
    });
  });

  describe('when a bookmarked show no longer exists', () => {
    it('given one deleted id of two, when the requests land, then the other is listed', async () => {
      serveOneDeletedShow();
      bookmark(BREAKING_BAD);
      bookmark(DELETED_SHOW);
      await renderBookmarkedShows();

      await flushPromises();

      expect(cardNames()).toEqual(['Breaking Bad, rated 9.2, 2008']);
    });

    it('given one deleted id of two, when the requests land, then the count names one show', async () => {
      serveOneDeletedShow();
      bookmark(BREAKING_BAD);
      bookmark(DELETED_SHOW);
      await renderBookmarkedShows();

      await flushPromises();

      expect(screen.getByText('1 show')).toBeDefined();
    });
  });
});
