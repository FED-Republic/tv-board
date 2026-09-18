import type { TestingPinia } from '@pinia/testing';
import { screen, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { TEST_IDS } from '@/testing/test-ids';
import {
  installIntersectionObserverStub,
  type IntersectionObserverStub,
} from '../composables/intersection-observer-stub';
import {
  createDashboardPinia,
  EAGER_ROW_COUNT,
  firstPageOnly,
  INDEX_ROW_COUNT,
  renderDashboardAt,
  serveIndexPages,
  settleBackgroundLoading,
  settleFirstPage,
  SEVENTH_ROW_GENRE,
} from './home-page-harness';

const DEFERRED_ROW_COUNT = INDEX_ROW_COUNT - EAGER_ROW_COUNT;
const HEADING_LEVEL = 2;
/** The first row below the fold, the one the reader scrolls to next. */
const SEVENTH_ROW = EAGER_ROW_COUNT;

let pinia: TestingPinia;
let observer: IntersectionObserverStub;

const blocks = (): readonly HTMLElement[] => screen.getAllByTestId(TEST_IDS.deferredBlock);

const blockStates = (): readonly string[] =>
  blocks().map((block) => block.dataset['rendered'] ?? '');

const seventhBlock = (): HTMLElement => {
  const block = blocks()[SEVENTH_ROW];

  if (block === undefined) {
    throw new Error('the fixture should fill more rows than the dashboard mounts eagerly');
  }

  return block;
};

/** Serves page 0 and waits for the rows to replace the loading skeleton. */
async function renderLoadedDashboard(): Promise<void> {
  serveIndexPages(firstPageOnly);
  await renderDashboardAt(pinia, '/');
  await settleFirstPage();
}

/** Fires the observer at the first block below the fold and lets its row render. */
async function scrollNearSeventhRow(): Promise<void> {
  observer.intersect(seventhBlock());
  await nextTick();
}

beforeEach(() => {
  vi.useFakeTimers();
  observer = installIntersectionObserverStub();
  pinia = createDashboardPinia();
});

afterEach(async () => {
  await settleBackgroundLoading();
  vi.useRealTimers();
});

describe('HomePage', () => {
  describe('when the rows first render', () => {
    it('given more rows than the fold holds, when page 0 lands, then only the rows above it are mounted', async () => {
      await renderLoadedDashboard();

      expect(blockStates()).toEqual([
        ...Array(EAGER_ROW_COUNT).fill('true'),
        ...Array(DEFERRED_ROW_COUNT).fill('false'),
      ]);
    });

    it('given a row below the fold, when page 0 lands, then a named placeholder stands in for it', async () => {
      await renderLoadedDashboard();

      expect(within(seventhBlock()).getByTestId(TEST_IDS.genreRowSkeleton)).toBeDefined();
    });

    it('given a row below the fold, when page 0 lands, then its heading is already reachable', async () => {
      await renderLoadedDashboard();

      const heading = screen.getByRole('heading', {
        level: HEADING_LEVEL,
        name: SEVENTH_ROW_GENRE,
      });

      expect(heading).toBeDefined();
    });

    it('given a row below the fold, when page 0 lands, then its row is not mounted', async () => {
      await renderLoadedDashboard();

      expect(within(seventhBlock()).queryByTestId(TEST_IDS.genreRow)).toBeNull();
    });
  });

  describe('when the reader scrolls near a deferred row', () => {
    it('given the seventh block, when it comes near the viewport, then its row mounts', async () => {
      await renderLoadedDashboard();

      await scrollNearSeventhRow();

      expect(within(seventhBlock()).getByTestId(TEST_IDS.genreRow)).toBeDefined();
    });

    it('given the seventh block, when it comes near the viewport, then its placeholder goes', async () => {
      await renderLoadedDashboard();

      await scrollNearSeventhRow();

      expect(within(seventhBlock()).queryByTestId(TEST_IDS.genreRowSkeleton)).toBeNull();
    });

    it('given the seventh block, when it comes near the viewport, then it reports itself as rendered', async () => {
      await renderLoadedDashboard();

      await scrollNearSeventhRow();

      expect(seventhBlock().dataset['rendered']).toBe('true');
    });

    it('given the seventh block, when it comes near the viewport, then the rows below it wait on', async () => {
      await renderLoadedDashboard();

      await scrollNearSeventhRow();

      expect(blockStates().slice(SEVENTH_ROW + 1)).toEqual(
        Array(DEFERRED_ROW_COUNT - 1).fill('false'),
      );
    });
  });
});
