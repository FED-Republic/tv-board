import type { TestingPinia } from '@pinia/testing';
import { within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  budgetThen,
  createDashboardPinia,
  emptyState,
  EXTRA_GENRE_PAGE,
  loadSettledDashboardAt,
  moreShowsReportText,
  neverAnswers,
  notFound,
  OFF_GENRE_PAGE,
  PAGED_GENRE,
  pressAndSettle,
  servePage,
  settleBackgroundLoading,
  UNLOADED_GENRE,
} from './home-page-harness';

const LOAD_MORE_LABEL = 'Load more shows from TVmaze';
const PAGED_GRID_LOCATION = `/?genre=${PAGED_GENRE}`;
const EMPTY_GRID_LOCATION = `/?genre=${UNLOADED_GENRE}`;
/** What the page a reader asked for brought the Drama grid: seventeen shows, all of them Drama. */
const WIDENED_REPORT = 'TVmaze sent 17 more shows. 17 of them are Drama.';
/** The same page read from the Medical grid, which none of its sixteen shows carries. */
const OFF_GENRE_REPORT =
  'TVmaze sent 16 more shows, none of them Medical. Load more to keep looking.';
/** The press that spent the last page: no button is left, so the line invites nothing. */
const NOTHING_ARRIVED_REPORT = 'No more shows arrived from TVmaze.';

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
  describe('when the page the reader asked for has landed', () => {
    it('given a page of Drama shows, when it lands, then the report says what it brought', async () => {
      await loadSettledDashboardAt(
        pinia,
        PAGED_GRID_LOCATION,
        budgetThen(servePage(EXTRA_GENRE_PAGE)),
      );

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(moreShowsReportText()).toBe(WIDENED_REPORT);
    });

    it('given a page on its way, when it has not answered, then the report says nothing yet', async () => {
      await loadSettledDashboardAt(pinia, PAGED_GRID_LOCATION, budgetThen(neverAnswers));

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(moreShowsReportText()).toBe('');
    });

    it('given no page left at TVmaze, when the page answers 404, then the report says nothing arrived', async () => {
      await loadSettledDashboardAt(pinia, PAGED_GRID_LOCATION, budgetThen(notFound));

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(moreShowsReportText()).toBe(NOTHING_ARRIVED_REPORT);
    });
  });

  describe('when the page brings the empty genre nothing', () => {
    it('given an empty Medical grid, when the page lands, then the report says none were Medical', async () => {
      await loadSettledDashboardAt(
        pinia,
        EMPTY_GRID_LOCATION,
        budgetThen(servePage(OFF_GENRE_PAGE)),
      );

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(moreShowsReportText()).toBe(OFF_GENRE_REPORT);
    });

    it('given an empty Medical grid, when the page lands, then the empty state still offers a page', async () => {
      await loadSettledDashboardAt(
        pinia,
        EMPTY_GRID_LOCATION,
        budgetThen(servePage(OFF_GENRE_PAGE)),
      );

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(within(emptyState()).getByRole('button', { name: LOAD_MORE_LABEL })).toBeDefined();
    });

    it('given a second press, when the empty grid asks again, then another page is requested', async () => {
      const { requestedPages } = await loadSettledDashboardAt(
        pinia,
        EMPTY_GRID_LOCATION,
        budgetThen(servePage(OFF_GENRE_PAGE)),
      );
      await pressAndSettle(LOAD_MORE_LABEL);
      const pagesAfterTheFirstPress = requestedPages.length;

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(requestedPages.length).toBeGreaterThan(pagesAfterTheFirstPress);
    });
  });
});
