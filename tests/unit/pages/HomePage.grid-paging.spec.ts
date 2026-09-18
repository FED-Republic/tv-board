import type { TestingPinia } from '@pinia/testing';
import { screen, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import type { Router } from 'vue-router';
import { type Genre, GRID_PAGE_SIZE, ROW_SHOW_LIMIT } from '@/domain/genre';
import { TEST_IDS } from '@/testing/test-ids';
import {
  BOUNDARY_FIRST_SHOWS,
  budgetOf,
  budgetThen,
  buttonNamed,
  createDashboardPinia,
  CROWDED_FIRST_SHOWS,
  EXTRA_GENRE_PAGE,
  grid,
  gridCardCount,
  loadDashboardAt,
  loadSettledDashboardAt,
  onlyFirstPageOf,
  PAGED_GENRE,
  pressAndSettle,
  servePage,
  settleBackgroundLoading,
} from './home-page-harness';

const EXPAND_LABEL = 'Show the Drama row as a grid';
const SHOW_MORE_LABEL = 'Show more Drama shows';
const LOAD_MORE_LABEL = 'Load more shows from TVmaze';
const PAGED_GRID_LOCATION = `/?genre=${PAGED_GENRE}`;
/** Shows of `PAGED_GENRE` a crowded first page carries, all of them on screen after one press. */
const CROWDED_GENRE_COUNT = 30;
/** Shows of `PAGED_GENRE` the grid holds once the page a reader asked for has landed. */
const WIDENED_GENRE_COUNT = 40;
/** A second genre the crowded first page fills, so the reader can swap one grid for another. */
const SWAPPED_GENRE: Genre = 'Thriller';

let pinia: TestingPinia;

/** The genre chosen somewhere else than the dashboard, such as the header select. */
async function selectGenre(router: Router, genre: Genre): Promise<void> {
  await router.replace({ query: { genre } });
  await nextTick();
  await flushPromises();
}

/** The row the open grid hides: still mounted, so its card count is still assertable. */
function rowBehindTheGrid(genre: Genre): HTMLElement {
  const rows = within(screen.getByTestId(TEST_IDS.dashboardRows)).getAllByTestId(TEST_IDS.genreRow);
  const row = rows.find((candidate) => candidate.dataset['genre'] === genre);

  if (row === undefined) {
    throw new Error(`the dashboard should keep the ${genre} row mounted behind the grid`);
  }

  return row;
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
  describe('when the open grid holds fewer shows than the index loaded for its genre', () => {
    it('given thirty loaded Drama shows, when the grid opens, then one page of cards is on screen', async () => {
      await loadDashboardAt(pinia, PAGED_GRID_LOCATION, onlyFirstPageOf(CROWDED_FIRST_SHOWS));

      expect(gridCardCount()).toBe(GRID_PAGE_SIZE);
    });

    it('given thirty loaded Drama shows, when the grid opens, then the button offers the rest', async () => {
      await loadDashboardAt(pinia, PAGED_GRID_LOCATION, onlyFirstPageOf(CROWDED_FIRST_SHOWS));

      expect(buttonNamed(SHOW_MORE_LABEL)).toBeDefined();
    });

    it('given the Show more button, when it is pressed, then the rest of the genre joins the grid', async () => {
      await loadDashboardAt(pinia, PAGED_GRID_LOCATION, onlyFirstPageOf(CROWDED_FIRST_SHOWS));

      await pressAndSettle(SHOW_MORE_LABEL);

      expect(gridCardCount()).toBe(CROWDED_GENRE_COUNT);
    });

    it('given the Show more button, when it is pressed, then no page is requested', async () => {
      const { requestedPages } = await loadDashboardAt(
        pinia,
        PAGED_GRID_LOCATION,
        onlyFirstPageOf(CROWDED_FIRST_SHOWS),
      );

      await pressAndSettle(SHOW_MORE_LABEL);

      expect(requestedPages).toEqual(['0']);
    });
  });

  describe('when the open grid sits exactly on a page boundary', () => {
    it('given twenty-five loaded Drama shows, when the grid opens, then the button asks TVmaze', async () => {
      await loadSettledDashboardAt(
        pinia,
        PAGED_GRID_LOCATION,
        budgetOf(BOUNDARY_FIRST_SHOWS, servePage(EXTRA_GENRE_PAGE)),
      );

      expect(buttonNamed(LOAD_MORE_LABEL)).toBeDefined();
    });

    it('given a grid on the boundary, when Load more is pressed, then the shows it brings render at once', async () => {
      await loadSettledDashboardAt(
        pinia,
        PAGED_GRID_LOCATION,
        budgetOf(BOUNDARY_FIRST_SHOWS, servePage(EXTRA_GENRE_PAGE)),
      );

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(gridCardCount()).toBe(WIDENED_GENRE_COUNT);
    });
  });

  describe('when the reader swaps the grid for another genre', () => {
    it('given a Drama grid grown past one page, when Thriller is opened, then the Thriller grid replaces it', async () => {
      const { router } = await loadDashboardAt(
        pinia,
        PAGED_GRID_LOCATION,
        onlyFirstPageOf(CROWDED_FIRST_SHOWS),
      );
      await pressAndSettle(SHOW_MORE_LABEL);

      await selectGenre(router, SWAPPED_GENRE);

      expect(grid().dataset['genre']).toBe(SWAPPED_GENRE);
    });

    it('given a Drama grid grown past one page, when Drama is opened again, then it opens on one page', async () => {
      const { router } = await loadDashboardAt(
        pinia,
        PAGED_GRID_LOCATION,
        onlyFirstPageOf(CROWDED_FIRST_SHOWS),
      );
      await pressAndSettle(SHOW_MORE_LABEL);

      await selectGenre(router, SWAPPED_GENRE);
      await selectGenre(router, PAGED_GENRE);

      expect(gridCardCount()).toBe(GRID_PAGE_SIZE);
    });
  });

  describe('when a page widens the genre behind an open grid', () => {
    it('given the Drama grid over its rows, when a page lands, then the row keeps its cap', async () => {
      await loadSettledDashboardAt(pinia, '/', budgetThen(servePage(EXTRA_GENRE_PAGE)));
      await pressAndSettle(EXPAND_LABEL);

      await pressAndSettle(LOAD_MORE_LABEL);

      expect(within(rowBehindTheGrid(PAGED_GENRE)).getAllByTestId(TEST_IDS.showCard)).toHaveLength(
        ROW_SHOW_LIMIT,
      );
    });
  });
});
