import type { TestingPinia } from '@pinia/testing';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, render, screen, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { HttpResponse, http } from 'msw';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import SearchPage from '@/pages/SearchPage.vue';
import { createAppRouter } from '@/router';
import { RETRY_BASE_DELAY_MS } from '@/services/http/client';
import { TEST_IDS } from '@/testing/test-ids';
import { server } from '../../msw/server';
import searchFleabagPayload from '../../resources/search-fleabag.2026-09-16.json';

const SEARCH_URL = 'https://api.tvmaze.com/search/shows';
/** The client tries a 5xx twice; both have to fail before the search itself fails. */
const SERVER_ERROR_ATTEMPTS = 2;

let pinia: TestingPinia;

const serveBrokenSearch = (): void =>
  void server.use(http.get(SEARCH_URL, () => new HttpResponse(null, { status: 500 })));

/** Fails the first search outright — both attempts the client makes for a 5xx — then recovers. */
function serveSearchAfterFailedAttempts(): void {
  let attempts = 0;

  server.use(
    http.get(SEARCH_URL, () => {
      attempts += 1;

      if (attempts <= SERVER_ERROR_ATTEMPTS) {
        return new HttpResponse(null, { status: 500 });
      }

      return HttpResponse.json(searchFleabagPayload);
    }),
  );
}

async function renderSearchAt(location: string): Promise<void> {
  const router = createAppRouter(createMemoryHistory());

  await router.push(location);
  await router.isReady();
  render(SearchPage, { global: { plugins: [pinia, router] } });
}

/** The search starts with the navigation; only the request itself is awaited. */
const settleSearch = (): Promise<unknown> => flushPromises();

/** A 5xx costs one back-off before the failure settles. */
async function settleFailedSearch(): Promise<void> {
  await vi.advanceTimersByTimeAsync(RETRY_BASE_DELAY_MS);
  await flushPromises();
}

const page = (): HTMLElement => screen.getByTestId(TEST_IDS.searchPage);

const countText = (): string => screen.getByTestId(TEST_IDS.searchCount).textContent?.trim() ?? '';

const resultCount = (): number => within(screen.getByRole('list')).getAllByRole('listitem').length;

beforeEach(() => {
  vi.useFakeTimers();
  pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  setActivePinia(pinia);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SearchPage', () => {
  describe('when the search is in flight', () => {
    it('given ?q=fleabag, when the page mounts, then the root reports loading', async () => {
      await renderSearchAt('/search?q=fleabag');

      expect(page().dataset['state']).toBe('loading');
    });

    it('given ?q=fleabag, when the page mounts, then the live region announces the search', async () => {
      await renderSearchAt('/search?q=fleabag');

      expect(countText()).toBe('Searching');
    });
  });

  describe('when the results land', () => {
    it('given ?q=fleabag, when the search settles, then the root reports success', async () => {
      await renderSearchAt('/search?q=fleabag');

      await settleSearch();

      expect(page().dataset['state']).toBe('success');
    });

    it('given ?q=fleabag, when the search settles, then the query is the page heading', async () => {
      await renderSearchAt('/search?q=fleabag');

      await settleSearch();

      expect(screen.getByRole('heading', { level: 1 }).textContent?.trim()).toBe('“fleabag”');
    });

    it('given ?q=fleabag, when the search settles, then the live region counts the results', async () => {
      await renderSearchAt('/search?q=fleabag');

      await settleSearch();

      expect(countText()).toBe('2 shows');
    });

    it('given ?q=fleabag, when the search settles, then every result is listed', async () => {
      await renderSearchAt('/search?q=fleabag');

      await settleSearch();

      expect(resultCount()).toBe(2);
    });

    it('given ?q=fleabag, when the search settles, then a result links to its show', async () => {
      await renderSearchAt('/search?q=fleabag');

      await settleSearch();

      expect(
        screen.getByRole('link', { name: 'Fleabag, rated 8.1, 2016' }).getAttribute('href'),
      ).toBe('/shows/16149');
    });
  });

  describe('when the genre filter hides every result', () => {
    it('given ?q=fleabag&genre=Western, when the search settles, then the root reports empty', async () => {
      await renderSearchAt('/search?q=fleabag&genre=Western');

      await settleSearch();

      expect(page().dataset['state']).toBe('empty');
    });

    it('given ?q=fleabag&genre=Western, when the search settles, then the empty state names the genre', async () => {
      await renderSearchAt('/search?q=fleabag&genre=Western');

      await settleSearch();

      expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
        'No shows match “fleabag” in Western.',
      );
    });

    it('given ?q=fleabag&genre=Western, when the search settles, then browsing genres is offered', async () => {
      await renderSearchAt('/search?q=fleabag&genre=Western');

      await settleSearch();

      expect(screen.getByRole('link', { name: 'Browse genres' }).getAttribute('href')).toBe('/');
    });
  });

  describe('when TVmaze knows no matching show', () => {
    it('given ?q=zzzz, when the search settles, then the empty state names the query', async () => {
      await renderSearchAt('/search?q=zzzz');

      await settleSearch();

      expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('No shows match “zzzz”.');
    });
  });

  describe('when the page opens without a query', () => {
    it('given no q, when the page mounts, then the root reports idle', async () => {
      await renderSearchAt('/search');

      expect(page().dataset['state']).toBe('idle');
    });

    it('given no q, when the page mounts, then it invites a search', async () => {
      await renderSearchAt('/search');

      expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Search for a show.');
    });

    it('given no q, when the page mounts, then the heading names the page', async () => {
      await renderSearchAt('/search');

      expect(screen.getByRole('heading', { level: 1 }).textContent?.trim()).toBe('Search');
    });
  });

  describe('when the search fails', () => {
    it('given a 500 on every attempt, when the search settles, then the root reports error', async () => {
      serveBrokenSearch();
      await renderSearchAt('/search?q=fleabag');

      await settleFailedSearch();

      expect(page().dataset['state']).toBe('error');
    });

    it('given a 500 on every attempt, when the search settles, then an alert names the failure', async () => {
      serveBrokenSearch();
      await renderSearchAt('/search?q=fleabag');

      await settleFailedSearch();

      expect(within(screen.getByRole('alert')).getByText("Search didn't finish.")).toBeDefined();
    });

    it('given a 500 on every attempt, when the search settles, then the alert explains the status', async () => {
      serveBrokenSearch();
      await renderSearchAt('/search?q=fleabag');

      await settleFailedSearch();

      expect(
        within(screen.getByRole('alert')).getByText(
          'TVmaze answered with an error (HTTP 500). Retry in a moment.',
        ),
      ).toBeDefined();
    });

    it('given a failed search, when Retry is pressed, then the results land', async () => {
      serveSearchAfterFailedAttempts();
      await renderSearchAt('/search?q=fleabag');
      await settleFailedSearch();

      await fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      await settleSearch();

      expect(resultCount()).toBe(2);
    });
  });
});
