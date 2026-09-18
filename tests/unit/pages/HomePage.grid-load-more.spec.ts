import type { TestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOADED_WHOLE_INDEX_TEXT } from '@/domain/dashboard-copy';
import { TEST_IDS } from '@/testing/test-ids';
import {
  budgetThen,
  buttonNamed,
  createDashboardPinia,
  EXTRA_GENRE_PAGE,
  EXTRA_PAGE,
  firstPageThenSilence,
  gridCountLine,
  loadSettledDashboardAt,
  moreShowsButton,
  moreShowsEndNote,
  neverAnswers,
  notFound,
  pageAnsweringOnDemand,
  PAGED_GENRE,
  pressAndSettle,
  servePage,
  settleBackgroundLoading,
  statusText,
} from './home-page-harness';

const LOAD_MORE_LABEL = 'Load more shows from TVmaze';
const CLOSE_LABEL = `Close ${PAGED_GENRE} grid`;
const PAGED_GRID_LOCATION = `/?genre=${PAGED_GENRE}`;
/** What the count line says while the whole genre fits in the grid. */
const NARROW_COUNT_LINE = '23 shows';
/** What it says once the page a reader asked for has widened the genre past a grid page. */
const WIDENED_COUNT_LINE = '40 shows';
/** What the dashboard's one status region announces while any page is on its way. */
const LOADING_MORE_STATUS = 'Loading more shows';

let pinia: TestingPinia;

beforeEach(() => {
  vi.useFakeTimers();
  pinia = createDashboardPinia();
});

afterEach(async () => {
  await settleBackgroundLoading();
  vi.useRealTimers();
});

describe('HomePage', () => {
  describe('when the open grid holds every loaded show of its genre', () => {
    it('given the budget spent, when the grid opens, then the button asks TVmaze for a page', async () => {
      await loadSettledDashboardAt(
        pinia,
        PAGED_GRID_LOCATION,
        budgetThen(servePage(EXTRA_GENRE_PAGE)),
      );

      expect(buttonNamed(LOAD_MORE_LABEL)).toBeDefined();
    });

    it('given the budget spent, when the grid opens, then the count line holds the whole genre', async () => {
      await loadSettledDashboardAt(
        pinia,
        PAGED_GRID_LOCATION,
        budgetThen(servePage(EXTRA_GENRE_PAGE)),
      );

      expect(gridCountLine()).toBe(NARROW_COUNT_LINE);
    });

    it('given the budget spent, when the grid opens, then the QA hook is on the button itself', async () => {
      await loadSettledDashboardAt(
        pinia,
        PAGED_GRID_LOCATION,
        budgetThen(servePage(EXTRA_GENRE_PAGE)),
      );

      expect(moreShowsButton()).toBe(buttonNamed(LOAD_MORE_LABEL));
    });

    it('given the Load more button, when it is pressed, then the next index page is requested', async () => {
      const { requestedPages } = await loadSettledDashboardAt(
        pinia,
        PAGED_GRID_LOCATION,
        budgetThen(servePage(EXTRA_GENRE_PAGE)),
      );

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(requestedPages.at(-1)).toBe(EXTRA_PAGE);
    });

    it('given the Load more button, when the page lands, then the grid counts the wider genre', async () => {
      await loadSettledDashboardAt(
        pinia,
        PAGED_GRID_LOCATION,
        budgetThen(servePage(EXTRA_GENRE_PAGE)),
      );

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(gridCountLine()).toBe(WIDENED_COUNT_LINE);
    });
  });

  describe('when the page a reader asked for is on its way', () => {
    it('given a page on its way, when it has not answered, then the button still asks for one', async () => {
      await loadSettledDashboardAt(pinia, PAGED_GRID_LOCATION, budgetThen(neverAnswers));

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(buttonNamed(LOAD_MORE_LABEL)).toBeDefined();
    });

    it('given a page on its way, when it has not answered, then the button reports the wait', async () => {
      await loadSettledDashboardAt(pinia, PAGED_GRID_LOCATION, budgetThen(neverAnswers));

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(buttonNamed(LOAD_MORE_LABEL).getAttribute('aria-busy')).toBe('true');
    });

    it('given a page on its way, when it has not answered, then the dashboard announces the wait', async () => {
      await loadSettledDashboardAt(pinia, PAGED_GRID_LOCATION, budgetThen(neverAnswers));

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(statusText()).toBe(LOADING_MORE_STATUS);
    });
  });

  describe('when the background loop is running behind a one-page grid', () => {
    it('given a background page in flight, when the grid is open, then the dashboard announces the wait', async () => {
      await loadSettledDashboardAt(pinia, PAGED_GRID_LOCATION, firstPageThenSilence);

      expect(statusText()).toBe(LOADING_MORE_STATUS);
    });

    it('given a background page in flight, when nobody pressed the button, then it is not waiting', async () => {
      await loadSettledDashboardAt(pinia, PAGED_GRID_LOCATION, firstPageThenSilence);

      expect(buttonNamed(LOAD_MORE_LABEL).getAttribute('aria-busy')).toBe('false');
    });
  });

  describe('when the press spends the last page TVmaze has', () => {
    it('given no page left at TVmaze, when the page answers 404, then the button is gone', async () => {
      await loadSettledDashboardAt(pinia, PAGED_GRID_LOCATION, budgetThen(notFound));

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(screen.queryByTestId(TEST_IDS.moreShowsButton)).toBeNull();
    });

    it('given no page left at TVmaze, when the page answers 404, then the note says the index is loaded', async () => {
      await loadSettledDashboardAt(pinia, PAGED_GRID_LOCATION, budgetThen(notFound));

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(moreShowsEndNote().textContent?.trim()).toBe(LOADED_WHOLE_INDEX_TEXT);
    });

    it('given no page left at TVmaze, when the page answers 404, then the note takes focus', async () => {
      await loadSettledDashboardAt(pinia, PAGED_GRID_LOCATION, budgetThen(notFound));

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(document.activeElement).toBe(moreShowsEndNote());
    });

    it('given the reader moved focus on while the page loaded, when it answers 404, then focus stays where they put it', async () => {
      const lastPage = pageAnsweringOnDemand(notFound);
      await loadSettledDashboardAt(pinia, PAGED_GRID_LOCATION, budgetThen(lastPage.respond));
      await pressAndSettle(LOAD_MORE_LABEL);
      const closeButton = buttonNamed(CLOSE_LABEL);

      closeButton.focus();
      await lastPage.answer();

      expect(document.activeElement).toBe(closeButton);
    });
  });
});
