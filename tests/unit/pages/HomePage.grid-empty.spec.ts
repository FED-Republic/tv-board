import type { TestingPinia } from '@pinia/testing';
import { screen, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOADED_WHOLE_INDEX_TEXT } from '@/domain/dashboard-copy';
import { TEST_IDS } from '@/testing/test-ids';
import {
  budgetThen,
  buttonNamed,
  createDashboardPinia,
  emptyState,
  EXTRA_PAGE,
  gridCardCount,
  gridHeadingFor,
  loadSettledDashboardAt,
  moreShowsButton,
  moreShowsEndNote,
  notFound,
  pressAndSettle,
  servePage,
  settleBackgroundLoading,
  UNLOADED_GENRE,
  UNLOADED_GENRE_PAGE,
} from './home-page-harness';

const LOAD_MORE_LABEL = 'Load more shows from TVmaze';
const EMPTY_GRID_LOCATION = `/?genre=${UNLOADED_GENRE}`;
/** Medical shows the captured index carries; the page a reader asks for brings all of them. */
const UNLOADED_GENRE_COUNT = 6;

let pinia: TestingPinia;

/** The dashboard on a genre no loaded page fills, with its automatic budget already spent. */
const loadEmptyGenre = (page = servePage(UNLOADED_GENRE_PAGE)) =>
  loadSettledDashboardAt(pinia, EMPTY_GRID_LOCATION, budgetThen(page));

beforeEach(() => {
  vi.useFakeTimers();
  pinia = createDashboardPinia();
});

afterEach(async () => {
  await settleBackgroundLoading();
  vi.useRealTimers();
});

describe('HomePage', () => {
  describe('when the genre has no loaded show at all', () => {
    it('given ?genre=Medical, when the budget is spent, then the empty state offers a page', async () => {
      await loadEmptyGenre();

      expect(within(emptyState()).getByRole('button', { name: LOAD_MORE_LABEL })).toBeDefined();
    });

    it('given ?genre=Medical, when the budget is spent, then the QA hook is on the offered button', async () => {
      await loadEmptyGenre();

      expect(moreShowsButton()).toBe(buttonNamed(LOAD_MORE_LABEL));
    });

    it('given the empty state, when Load more is pressed, then the next index page is requested', async () => {
      const { requestedPages } = await loadEmptyGenre();

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(requestedPages.at(-1)).toBe(EXTRA_PAGE);
    });
  });

  describe('when the page a reader asked for fills the empty genre', () => {
    it('given the empty state, when the page brings Medical shows, then the empty state is gone', async () => {
      await loadEmptyGenre();

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(screen.queryByTestId(TEST_IDS.emptyState)).toBeNull();
    });

    it('given the empty state, when the page brings Medical shows, then the grid renders every one', async () => {
      await loadEmptyGenre();

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(gridCardCount()).toBe(UNLOADED_GENRE_COUNT);
    });

    it('given a press from the empty state, when the grid replaces it, then its heading takes focus', async () => {
      await loadEmptyGenre();

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(document.activeElement).toBe(gridHeadingFor(UNLOADED_GENRE));
    });
  });

  describe('when the press from the empty state spends the last page', () => {
    it('given no page left at TVmaze, when the page answers 404, then the button is gone', async () => {
      await loadEmptyGenre(notFound);

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(screen.queryByTestId(TEST_IDS.moreShowsButton)).toBeNull();
    });

    it('given no page left at TVmaze, when the page answers 404, then the note says the index is loaded', async () => {
      await loadEmptyGenre(notFound);

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(moreShowsEndNote().textContent?.trim()).toBe(LOADED_WHOLE_INDEX_TEXT);
    });

    it('given no page left at TVmaze, when the page answers 404, then the note takes focus', async () => {
      await loadEmptyGenre(notFound);

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(document.activeElement).toBe(moreShowsEndNote());
    });

    it('given no page left at TVmaze, when the page answers 404, then the note stands in the empty state', async () => {
      await loadEmptyGenre(notFound);

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(within(emptyState()).getByTestId(TEST_IDS.moreShowsEnd)).toBeDefined();
    });
  });
});
