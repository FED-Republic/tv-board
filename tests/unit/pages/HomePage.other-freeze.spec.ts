import type { TestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import type { Router } from 'vue-router';
import { type Genre, OTHER_GENRE } from '@/domain/genre';
import {
  type AnimationFrameStub,
  installAnimationFrameStub,
} from '../composables/animation-frame-stub';
import {
  buttonNamed,
  createDashboardPinia,
  gridCardCount,
  gridShowIds,
  INDEX_ROW_GENRES,
  leaveDashboard,
  loadDashboardAt,
  OTHER_SHOW_COUNT,
  placeholderRowGenres,
  PROMOTED_SHOW_ID,
  promotingSoleRowGenre,
  promotingThinGenre,
  renderDashboardAt,
  rowGenres,
  rowHeadingFor,
  rowShowIds,
  settleBackgroundLoading,
  SOLE_ROW_GENRE,
  STANDING_ROW_GENRE,
  THIN_GENRE,
} from './home-page-harness';

const CLOSE_OTHER_LABEL = `Close ${OTHER_GENRE} grid`;
const OTHER_GRID_LOCATION = `/?genre=${OTHER_GENRE}`;
/** A genre far over the row minimum, so its grid is one no promotion can take shows from. */
const SETTLED_GENRE: Genre = 'Drama';

let pinia: TestingPinia;
let frames: AnimationFrameStub;

/** The genre chosen somewhere else than the dashboard, such as the header select. */
async function selectGenre(router: Router, genre: Genre): Promise<void> {
  await router.replace({ query: { genre } });
  await nextTick();
  await flushPromises();
}

/** Clicks, lets the navigation settle and paints the frame a close waits for. */
async function clickAndSettle(name: string): Promise<void> {
  await fireEvent.click(buttonNamed(name));
  await flushPromises();
  frames.runFrame();
  await flushPromises();
}

/** Every row the dashboard holds behind the grid: the rows it had mounted, then the deferred. */
const rowsBehindTheGrid = (): readonly string[] => [...rowGenres(), ...placeholderRowGenres()];

/** The `Other` grid opened over the loaded rows, before any background page has landed. */
async function openOtherGridOverTheRows(): Promise<void> {
  const { router } = await loadDashboardAt(pinia, '/', promotingThinGenre);

  await selectGenre(router, OTHER_GENRE);
}

beforeEach(() => {
  vi.useFakeTimers();
  frames = installAnimationFrameStub();
  pinia = createDashboardPinia();
});

afterEach(async () => {
  await settleBackgroundLoading();
  vi.useRealTimers();
});

describe('HomePage', () => {
  describe('when a page promotes a genre under an open Other grid', () => {
    it('given the Other grid open, when the page takes the genre over the bar, then the cards it held are still there', async () => {
      await openOtherGridOverTheRows();
      const cardsBeforeThePage = [...gridShowIds()];

      await settleBackgroundLoading();

      expect(gridShowIds()).toEqual(expect.arrayContaining(cardsBeforeThePage));
    });

    it('given the Other grid open, when the page takes the genre over the bar, then the show it brought joins the grid', async () => {
      await openOtherGridOverTheRows();

      await settleBackgroundLoading();

      expect(gridShowIds()).toContain(PROMOTED_SHOW_ID);
    });

    it('given the Other grid open, when the page takes the genre over the bar, then the rows behind the grid are unchanged', async () => {
      await openOtherGridOverTheRows();

      await settleBackgroundLoading();

      expect(rowsBehindTheGrid()).toEqual(INDEX_ROW_GENRES);
    });
  });

  describe('when the reader closes the grid the promotion waited for', () => {
    /** The grid that held the promotion back, closed the way its own button closes it. */
    async function closeTheOtherGrid(): Promise<void> {
      await openOtherGridOverTheRows();
      await settleBackgroundLoading();

      await clickAndSettle(CLOSE_OTHER_LABEL);
    }

    it('given a promotion held back, when the grid is closed, then the promoted genre has a row', async () => {
      await closeTheOtherGrid();

      expect(rowGenres()).toContain(THIN_GENRE);
    });

    it('given a promotion held back, when the grid is closed, then the show that promoted it is in that row', async () => {
      await closeTheOtherGrid();

      expect(rowShowIds(THIN_GENRE)).toContain(PROMOTED_SHOW_ID);
    });

    it('given a promotion held back, when the grid is closed, then the Other row has let that show go', async () => {
      await closeTheOtherGrid();

      expect(rowShowIds(OTHER_GENRE)).not.toContain(PROMOTED_SHOW_ID);
    });
  });

  describe('when the reader lands on the Other grid before the first page', () => {
    /** A link straight to the grid: the freeze is on before a single show has loaded. */
    const loadColdOtherGrid = () => loadDashboardAt(pinia, OTHER_GRID_LOCATION, promotingThinGenre);

    it('given a cold ?genre=Other link, when page 0 lands, then the rows behind the grid are the ones it fills', async () => {
      await loadColdOtherGrid();

      expect(placeholderRowGenres()).toEqual(INDEX_ROW_GENRES);
    });

    it('given a cold ?genre=Other link, when page 0 lands, then the grid holds only what those rows left behind', async () => {
      await loadColdOtherGrid();

      expect(gridCardCount()).toBe(OTHER_SHOW_COUNT);
    });

    it('given a cold ?genre=Other link, when the page after it promotes a genre, then no row for it appears', async () => {
      await loadColdOtherGrid();

      await settleBackgroundLoading();

      expect(placeholderRowGenres()).toEqual(INDEX_ROW_GENRES);
    });
  });

  describe('when the open grid is any genre but Other', () => {
    it('given the Drama grid open, when a page promotes a genre, then its row is there behind the grid', async () => {
      const { router } = await loadDashboardAt(pinia, '/', promotingThinGenre);
      await selectGenre(router, SETTLED_GENRE);

      await settleBackgroundLoading();

      expect(rowsBehindTheGrid()).toContain(THIN_GENRE);
    });
  });

  describe('when the release leaves no Other row for the closing grid', () => {
    /** The `Other` grid closed once its last shows have earned a row of their own. */
    async function closeTheEmptiedOtherGrid(): Promise<void> {
      await loadDashboardAt(pinia, OTHER_GRID_LOCATION, promotingSoleRowGenre);
      await settleBackgroundLoading();

      await clickAndSettle(CLOSE_OTHER_LABEL);
    }

    it('given every show promoted, when the Other grid is closed, then only the earned rows are left', async () => {
      await closeTheEmptiedOtherGrid();

      expect(rowGenres()).toEqual([STANDING_ROW_GENRE, SOLE_ROW_GENRE]);
    });

    it('given every show promoted, when the Other grid is closed, then the first row takes focus', async () => {
      await closeTheEmptiedOtherGrid();

      expect(document.activeElement).toBe(rowHeadingFor(STANDING_ROW_GENRE));
    });
  });

  describe('when the reader leaves the dashboard with the Other grid open', () => {
    it('given a promotion held back, when the dashboard is mounted again, then the promoted genre has a row', async () => {
      await openOtherGridOverTheRows();
      await settleBackgroundLoading();

      leaveDashboard();
      await renderDashboardAt(pinia, '/');

      expect(rowGenres()).toContain(THIN_GENRE);
    });

    it('given a promotion held back, when the same grid is opened again, then the promoted row stands behind it', async () => {
      await openOtherGridOverTheRows();
      await settleBackgroundLoading();

      leaveDashboard();
      await renderDashboardAt(pinia, OTHER_GRID_LOCATION);

      expect(placeholderRowGenres()).toContain(THIN_GENRE);
    });
  });
});
