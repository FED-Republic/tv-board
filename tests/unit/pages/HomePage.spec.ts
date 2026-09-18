import type { TestingPinia } from '@pinia/testing';
import { fireEvent, screen, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Genre } from '@/domain/genre';
import { GENRES, OTHER_GENRE, PLACEHOLDER_ROW_MAX } from '@/domain/genre';
import { RETRY_BASE_DELAY_MS } from '@/services/http/client';
import { TEST_IDS } from '@/testing/test-ids';
import {
  createDashboardPinia,
  dashboard,
  EAGER_ROW_COUNT,
  firstPageOnly,
  INDEX_ROW_COUNT,
  INDEX_ROW_GENRES,
  type PageResponder,
  placeholderRowGenres,
  placeholderRowHeadings,
  rememberGenres,
  renderDashboardAt,
  renderLoadedDashboardAt,
  rowGenres,
  rowHeadings,
  serveIndexPages,
  settleBackgroundLoading,
  settleFirstPage,
  SEVENTH_ROW_GENRE,
  statusText,
} from './home-page-harness';

/** The client retries a `5xx` once, so a failure needs two answers. */
const FAILED_ATTEMPTS = 2;

/** Every genre the app knows: the 28 row genres plus `Other`, more than the placeholder cap. */
const EVERY_GENRE: readonly Genre[] = [...GENRES, OTHER_GENRE];

let pinia: TestingPinia;

const serverError = (): Response => new HttpResponse(null, { status: 500 });

/** Fails until the retry budget is spent, then serves the page the user asked for again. */
function brokenUntilRetry(): PageResponder {
  let failures = 0;

  return (page) => {
    if (page !== '0' || failures === FAILED_ATTEMPTS) {
      return firstPageOnly(page);
    }

    failures += 1;
    return serverError();
  };
}

async function settleFailedIndex(): Promise<void> {
  await vi.advanceTimersByTimeAsync(RETRY_BASE_DELAY_MS);
  await flushPromises();
}

beforeEach(() => {
  vi.useFakeTimers();
  pinia = createDashboardPinia();
});

afterEach(async () => {
  await settleBackgroundLoading();
  vi.useRealTimers();
});

describe('HomePage', () => {
  describe('when the index is still loading', () => {
    it('given a pending first page, when the page mounts, then the root reports loading', async () => {
      serveIndexPages(firstPageOnly);

      await renderDashboardAt(pinia, '/');

      expect(dashboard().dataset['state']).toBe('loading');
    });

    it('given a pending first page, when the page mounts, then a skeleton stands in', async () => {
      serveIndexPages(firstPageOnly);

      await renderDashboardAt(pinia, '/');

      expect(screen.getByTestId(TEST_IDS.dashboardSkeleton)).toBeDefined();
    });
  });

  describe('when genres are remembered', () => {
    it('given Comedy and Drama remembered, when page 0 is pending, then the placeholders follow the row order', async () => {
      rememberGenres(['Comedy', 'Drama']);
      serveIndexPages(firstPageOnly);

      await renderDashboardAt(pinia, '/');

      expect(placeholderRowHeadings()).toEqual(['Drama', 'Comedy']);
    });

    it('given ?genre=Comedy, when page 0 is pending, then only the Comedy placeholder stands in', async () => {
      rememberGenres(['Comedy', 'Drama']);
      serveIndexPages(firstPageOnly);

      await renderDashboardAt(pinia, '/?genre=Comedy');

      expect(placeholderRowGenres()).toEqual(['Comedy']);
    });

    it('given no remembered genre, when page 0 is pending, then three anonymous placeholders stand in', async () => {
      serveIndexPages(firstPageOnly);

      await renderDashboardAt(pinia, '/');

      expect(placeholderRowHeadings()).toEqual(['', '', '']);
    });

    it('given every genre remembered, when page 0 is pending, then six placeholders stand in', async () => {
      rememberGenres(EVERY_GENRE);
      serveIndexPages(firstPageOnly);

      await renderDashboardAt(pinia, '/');

      expect(placeholderRowGenres()).toHaveLength(PLACEHOLDER_ROW_MAX);
    });

    it('given remembered genres, when page 0 lands, then the rows above the fold are real rows', async () => {
      rememberGenres(['Comedy', 'Drama']);
      serveIndexPages(firstPageOnly);
      await renderDashboardAt(pinia, '/');

      await settleFirstPage();

      expect(rowGenres()).toHaveLength(EAGER_ROW_COUNT);
    });

    it('given remembered genres, when page 0 lands, then the next row waits as a named placeholder', async () => {
      rememberGenres(['Comedy', 'Drama']);
      serveIndexPages(firstPageOnly);
      await renderDashboardAt(pinia, '/');

      await settleFirstPage();

      expect(placeholderRowGenres()[0]).toBe(SEVENTH_ROW_GENRE);
    });
  });

  describe('when the first page lands', () => {
    it('given page 0, when it resolves, then the root reports success', async () => {
      await renderLoadedDashboardAt(pinia);

      expect(dashboard().dataset['state']).toBe('success');
    });

    it('given page 0, when it resolves, then the skeleton is gone', async () => {
      await renderLoadedDashboardAt(pinia);

      expect(screen.queryByTestId(TEST_IDS.dashboardSkeleton)).toBeNull();
    });

    it('given page 0, when it resolves, then the rows follow the genre order', async () => {
      await renderLoadedDashboardAt(pinia);

      expect(rowHeadings()).toEqual(INDEX_ROW_GENRES);
    });

    it('given page 0, when it resolves, then every row, mounted or deferred, is headed by its genre', async () => {
      await renderLoadedDashboardAt(pinia);

      // The mounted rows sit above the deferred placeholders, so the two lists read in row order.
      const genresInRowOrder = [...rowGenres(), ...placeholderRowGenres()];

      expect(genresInRowOrder).toEqual(rowHeadings());
    });

    it('given page 0, when it resolves, then the page keeps its heading', async () => {
      await renderLoadedDashboardAt(pinia);

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('All Genres');
    });
  });

  describe('when the reader is told what is loading', () => {
    it('given a pending first page, when the page mounts, then the status names the index', async () => {
      serveIndexPages(firstPageOnly);

      await renderDashboardAt(pinia, '/');

      expect(statusText()).toBe('Loading the show index');
    });

    it('given page 0 landed, when the later pages are on their way, then the status says so', async () => {
      await renderLoadedDashboardAt(pinia);

      expect(statusText()).toBe('Loading more shows');
    });

    it('given no page past the first, when the loading stops, then the status counts the rows', async () => {
      await renderLoadedDashboardAt(pinia);

      await settleBackgroundLoading();

      expect(statusText()).toBe(`${INDEX_ROW_COUNT} genre rows loaded`);
    });
  });

  describe('when the index fails to load', () => {
    it('given a 500 on every attempt, when the load settles, then the root reports error', async () => {
      serveIndexPages(serverError);
      await renderDashboardAt(pinia, '/');

      await settleFailedIndex();

      expect(dashboard().dataset['state']).toBe('error');
    });

    it('given a 500 on every attempt, when the load settles, then an alert names the failure', async () => {
      serveIndexPages(serverError);
      await renderDashboardAt(pinia, '/');

      await settleFailedIndex();

      expect(
        within(screen.getByRole('alert')).getByText("The show index didn't load."),
      ).toBeDefined();
    });

    it('given a 500 on every attempt, when the load settles, then the alert explains the status', async () => {
      serveIndexPages(serverError);
      await renderDashboardAt(pinia, '/');

      await settleFailedIndex();

      expect(
        within(screen.getByRole('alert')).getByText(
          'TVmaze answered with an error (HTTP 500). Retry in a moment.',
        ),
      ).toBeDefined();
    });

    it('given a failed load, when Retry is pressed, then the index is requested again', async () => {
      const requestedPages = serveIndexPages(brokenUntilRetry());
      await renderDashboardAt(pinia, '/');
      await settleFailedIndex();

      await fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      await settleFirstPage();

      expect(requestedPages).toEqual(['0', '0', '0']);
    });

    it('given a failed load, when the retry succeeds, then the rows replace the alert', async () => {
      serveIndexPages(brokenUntilRetry());
      await renderDashboardAt(pinia, '/');
      await settleFailedIndex();

      await fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      await settleFirstPage();

      expect(rowHeadings()[0]).toBe('Drama');
    });
  });
});
