import type { TestingPinia } from '@pinia/testing';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  releaseTimers,
  settleFirstBackgroundPage,
  settleNextBackgroundPage,
} from '../stores/background-harness';
import {
  DRAMA_GRID,
  dramaOnEveryPage,
  EXTRA_SHOW_COUNT,
  type GridHarness,
  mountGridAt,
  pressAndSettle,
} from './genre-grid-page-harness';

/** What one background page of Drama shows brings a Drama grid: every show it carries. */
const ONE_PAGE_OF_DRAMA = { loaded: EXTRA_SHOW_COUNT, inGenre: EXTRA_SHOW_COUNT };

let pinia: TestingPinia;

/** A grid the reader pressed while the background loop was already on its way to a page. */
async function pressDuringTheLoop(): Promise<GridHarness> {
  const harness = await mountGridAt(pinia, DRAMA_GRID, dramaOnEveryPage);

  await pressAndSettle(harness.grid);

  return harness;
}

beforeEach(() => {
  vi.useFakeTimers();
  pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  setActivePinia(pinia);
});

afterEach(releaseTimers);

// One press buys one page: the loop the store was already running answers the press with the
// next page it lands, and carries on past it on its own budget.
describe('useGenreGrid', () => {
  describe('when the reader presses while the background loop is already running', () => {
    it('given a press during the loop, when the next page lands, then the report counts that page', async () => {
      const { grid } = await pressDuringTheLoop();

      await settleFirstBackgroundPage();

      expect(grid.pageReport.value).toEqual(ONE_PAGE_OF_DRAMA);
    });

    it('given a press during the loop, when the next page lands, then no page is awaited any more', async () => {
      const { grid } = await pressDuringTheLoop();

      await settleFirstBackgroundPage();

      expect(grid.isAwaitingPage.value).toBe(false);
    });

    it('given the answer to the press, when it has landed, then the loop carries on', async () => {
      const { store } = await pressDuringTheLoop();

      await settleFirstBackgroundPage();

      expect(store.isLoadingMore).toBe(true);
    });

    it('given the answer to the press, when a later page lands, then the report still counts one', async () => {
      const { grid } = await pressDuringTheLoop();
      await settleFirstBackgroundPage();

      await settleNextBackgroundPage();

      expect(grid.pageReport.value).toEqual(ONE_PAGE_OF_DRAMA);
    });

    it('given the answer to the press, when a later page lands, then the grid holds both pages', async () => {
      const { grid } = await pressDuringTheLoop();
      await settleFirstBackgroundPage();
      const showsAfterTheAnswer = grid.gridShows.value.length;

      await settleNextBackgroundPage();

      expect(grid.gridShows.value.length).toBe(showsAfterTheAnswer + EXTRA_SHOW_COUNT);
    });
  });
});
