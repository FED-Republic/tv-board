import type { TestingPinia } from '@pinia/testing';
import { fireEvent, screen, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { TEST_IDS } from '@/testing/test-ids';
import {
  type AnimationFrameStub,
  installAnimationFrameStub,
} from '../composables/animation-frame-stub';
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
  rowGenres,
  serveIndexPages,
  settleBackgroundLoading,
  settleFirstPage,
} from './home-page-harness';

const EXPAND_DRAMA_LABEL = 'Show the Drama row as a grid';
const CLOSE_DRAMA_LABEL = 'Close Drama grid';
const CLOSE_COMEDY_LABEL = 'Close Comedy grid';
/** The second row the fixture fills, so it is on screen behind a Drama grid. */
const SECOND_ROW_GENRE = 'Action';
/** The first row below the fold, the one the reader scrolls to before opening a grid. */
const SEVENTH_ROW = EAGER_ROW_COUNT;

let pinia: TestingPinia;
let frames: AnimationFrameStub;
let observer: IntersectionObserverStub;

/** Serves page 0 and waits for the dashboard at `location` to settle on its rows or its grid. */
async function loadDashboardAt(location: string): Promise<void> {
  serveIndexPages(firstPageOnly);

  await renderDashboardAt(pinia, location);
  await settleFirstPage();
}

const rows = (): HTMLElement => screen.getByTestId(TEST_IDS.dashboardRows);

const blocks = (): readonly HTMLElement[] => within(rows()).getAllByTestId(TEST_IDS.deferredBlock);

const mountedBlocks = (): readonly string[] =>
  blocks().map((block) => block.dataset['rendered'] ?? '');

const postersBehindTheGrid = (): readonly HTMLElement[] =>
  within(rows()).queryAllByTestId(TEST_IDS.showPosterImage);

const mountedRowGenres = (): readonly string[] =>
  within(rows())
    .getAllByTestId(TEST_IDS.genreRow)
    .map((row) => row.dataset['genre'] ?? '');

function seventhBlock(): HTMLElement {
  const block = blocks()[SEVENTH_ROW];

  if (block === undefined) {
    throw new Error('the fixture should fill more rows than the dashboard mounts eagerly');
  }

  return block;
}

/** Fires the observer at the first block below the fold, as scrolling near it does. */
async function mountSeventhRow(): Promise<void> {
  observer.intersect(seventhBlock());
  await nextTick();
}

/** Clicks, lets the navigation settle and paints the frame a close waits for. */
async function clickAndSettle(name: string): Promise<void> {
  await fireEvent.click(screen.getByRole('button', { name }));
  await flushPromises();
  frames.runFrame();
  await flushPromises();
}

beforeEach(() => {
  vi.useFakeTimers();
  frames = installAnimationFrameStub();
  observer = installIntersectionObserverStub();
  pinia = createDashboardPinia();
});

afterEach(async () => {
  await settleBackgroundLoading();
  vi.useRealTimers();
});

describe('HomePage', () => {
  describe('when a grid is opened from the rows', () => {
    it('given the rows on screen, when the Drama row is expanded, then the rows stay mounted behind the grid', async () => {
      await loadDashboardAt('/');
      const genresBeforeTheGrid = rowGenres();

      await clickAndSettle(EXPAND_DRAMA_LABEL);

      expect(mountedRowGenres()).toEqual(genresBeforeTheGrid);
    });

    it('given the rows on screen, when the Drama row is expanded, then the second row leaves the accessibility tree', async () => {
      await loadDashboardAt('/');

      await clickAndSettle(EXPAND_DRAMA_LABEL);

      expect(screen.queryByRole('region', { name: SECOND_ROW_GENRE })).toBeNull();
    });

    it('given a row mounted below the fold, when the Drama row is expanded, then that row stays mounted', async () => {
      await loadDashboardAt('/');
      await mountSeventhRow();
      const blocksBeforeTheGrid = mountedBlocks();

      await clickAndSettle(EXPAND_DRAMA_LABEL);

      expect(mountedBlocks()).toEqual(blocksBeforeTheGrid);
    });
  });

  describe('when a grid over the rows is closed', () => {
    it('given a grid over the rows, when it is closed, then the second row is in the accessibility tree again', async () => {
      await loadDashboardAt('/');
      await clickAndSettle(EXPAND_DRAMA_LABEL);

      await clickAndSettle(CLOSE_DRAMA_LABEL);

      expect(screen.getByRole('region', { name: SECOND_ROW_GENRE })).toBeDefined();
    });

    it('given a row mounted below the fold, when the grid over it is closed, then it is still mounted', async () => {
      await loadDashboardAt('/');
      await mountSeventhRow();
      await clickAndSettle(EXPAND_DRAMA_LABEL);

      await clickAndSettle(CLOSE_DRAMA_LABEL);

      expect(seventhBlock().dataset['rendered']).toBe('true');
    });
  });

  describe('when the reader lands on a grid', () => {
    it('given a direct load of ?genre=Comedy, when the index lands, then the Drama row behind the grid is out of the accessibility tree', async () => {
      await loadDashboardAt('/?genre=Comedy');

      expect(screen.queryByRole('region', { name: 'Drama' })).toBeNull();
    });

    it('given a direct load of ?genre=Comedy, when the index lands, then no row behind the grid is mounted', async () => {
      await loadDashboardAt('/?genre=Comedy');

      expect(mountedBlocks()).toEqual(Array(INDEX_ROW_COUNT).fill('false'));
    });

    it('given a direct load of ?genre=Comedy, when the index lands, then no row behind the grid asks for a poster', async () => {
      await loadDashboardAt('/?genre=Comedy');

      expect(postersBehindTheGrid()).toEqual([]);
    });

    it('given a direct load of ?genre=Comedy, when the grid is closed, then the rows above the fold mount', async () => {
      await loadDashboardAt('/?genre=Comedy');

      await clickAndSettle(CLOSE_COMEDY_LABEL);

      expect(mountedBlocks().slice(0, EAGER_ROW_COUNT)).toEqual(
        Array(EAGER_ROW_COUNT).fill('true'),
      );
    });
  });
});
