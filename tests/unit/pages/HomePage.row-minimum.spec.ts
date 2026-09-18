import type { TestingPinia } from '@pinia/testing';
import { fireEvent, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OTHER_GENRE, ROW_MIN_SHOWS } from '@/domain/genre';
import {
  type AnimationFrameStub,
  installAnimationFrameStub,
} from '../composables/animation-frame-stub';
import {
  BAR_GENRE,
  buttonNamed,
  createDashboardPinia,
  EARNING_FIRST_SHOWS,
  emptyState,
  firstPageOnly,
  gridCardCount,
  gridShowIds,
  INDEX_ROW_COUNT,
  INDEX_ROW_GENRES,
  loadDashboardAt,
  onlyFirstPageOf,
  OTHER_SHOW_COUNT,
  placeholderRowGenres,
  rowGenres,
  rowHeadingFor,
  rowHeadings,
  settleBackgroundLoading,
  showIdsOf,
  SOLE_ROW_GENRE,
  statusText,
  THIN_GENRE,
  THIN_GENRE_SHOWS,
  UNLOADED_GENRE,
} from './home-page-harness';

const CLOSE_THIN_GENRE_LABEL = `Close ${THIN_GENRE} grid`;
const OTHER_GRID_LOCATION = `/?genre=${OTHER_GENRE}`;
const THIN_GENRE_GRID_LOCATION = `/?genre=${THIN_GENRE}`;
const UNLOADED_GRID_LOCATION = `/?genre=${UNLOADED_GENRE}`;
/** What an empty `Other` bucket says: it is the opposite of an index holding nothing. */
const EMPTY_OTHER_HEADING = 'Every loaded show is in a genre row.';
const EMPTY_OTHER_BODY = 'Other holds the shows whose genres are too small for a row of their own.';
/** What a genre the loaded pages never mention says, so the two empty states never read alike. */
const UNLOADED_GENRE_BODY =
  'The dashboard shows the first pages of the TVmaze index; this genre has no show there yet.';

let pinia: TestingPinia;
let frames: AnimationFrameStub;

/** The dashboard on `location` with the captured first page landed and no page left to load. */
const loadDashboard = (location: string) => loadDashboardAt(pinia, location, firstPageOnly);

/** Clicks, lets the navigation settle and paints the frame a close waits for. */
async function clickAndSettle(name: string): Promise<void> {
  await fireEvent.click(buttonNamed(name));
  await flushPromises();
  frames.runFrame();
  await flushPromises();
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
  describe('when a genre holds fewer loaded shows than the row minimum', () => {
    it('given a genre under ROW_MIN_SHOWS, when page 0 lands, then no row is headed by it', async () => {
      await loadDashboard('/');

      expect(rowHeadings()).not.toContain(THIN_GENRE);
    });

    it('given a genre under ROW_MIN_SHOWS, when page 0 lands, then the Other row stands last', async () => {
      await loadDashboard('/');

      expect(rowHeadings().at(-1)).toBe(OTHER_GENRE);
    });

    it('given a genre on ROW_MIN_SHOWS, when page 0 lands, then it earns a row of its own', async () => {
      await loadDashboard('/');

      expect(rowHeadings()).toContain(BAR_GENRE);
    });

    it('given the rows the first page fills, when the loading stops, then the status counts them', async () => {
      await loadDashboard('/');

      await settleBackgroundLoading();

      expect(statusText()).toBe(`${INDEX_ROW_COUNT} genre rows loaded`);
    });

    it('given the rows the first page fills, when the loading stops, then the page holds them all', async () => {
      await loadDashboard('/');

      await settleBackgroundLoading();

      expect([...rowGenres(), ...placeholderRowGenres()]).toEqual(INDEX_ROW_GENRES);
    });
  });

  describe('when the reader opens the Other grid', () => {
    it('given ?genre=Other, when page 0 lands, then the grid holds the shows of the genre under the minimum', async () => {
      await loadDashboard(OTHER_GRID_LOCATION);

      expect(gridShowIds()).toEqual(expect.arrayContaining([...showIdsOf(THIN_GENRE_SHOWS)]));
    });

    it('given ?genre=Other, when page 0 lands, then the grid holds every show the rows left behind', async () => {
      await loadDashboard(OTHER_GRID_LOCATION);

      expect(gridCardCount()).toBe(OTHER_SHOW_COUNT);
    });
  });

  describe('when the reader picks a genre under the row minimum', () => {
    it('given ?genre=Adventure, when page 0 lands, then the grid holds its loaded shows', async () => {
      await loadDashboard(THIN_GENRE_GRID_LOCATION);

      expect(gridCardCount()).toBe(ROW_MIN_SHOWS - 1);
    });

    it('given ?genre=Adventure, when the grid is closed, then still no row is headed by the genre', async () => {
      await loadDashboard(THIN_GENRE_GRID_LOCATION);

      await clickAndSettle(CLOSE_THIN_GENRE_LABEL);

      expect(rowHeadings()).not.toContain(THIN_GENRE);
    });

    it('given ?genre=Adventure, when the grid is closed, then the Other row heading takes focus', async () => {
      await loadDashboard(THIN_GENRE_GRID_LOCATION);

      await clickAndSettle(CLOSE_THIN_GENRE_LABEL);

      expect(document.activeElement).toBe(rowHeadingFor(OTHER_GENRE));
    });
  });

  describe('when every loaded show earned a row of its own', () => {
    /** A first page of single-genre shows, enough of them to earn that genre its row. */
    const loadEarningFirstPage = () =>
      loadDashboardAt(pinia, OTHER_GRID_LOCATION, onlyFirstPageOf(EARNING_FIRST_SHOWS));

    it('given nothing left for Other, when ?genre=Other is opened, then the empty state says so', async () => {
      await loadEarningFirstPage();

      expect(within(emptyState()).getByText(EMPTY_OTHER_HEADING)).toBeDefined();
    });

    it('given nothing left for Other, when ?genre=Other is opened, then the empty state explains what Other holds', async () => {
      await loadEarningFirstPage();

      expect(within(emptyState()).getByText(EMPTY_OTHER_BODY)).toBeDefined();
    });

    it('given nothing left for Other, when ?genre=Other is opened, then the genre that earned its row stands behind the grid', async () => {
      await loadEarningFirstPage();

      expect(placeholderRowGenres()).toEqual([SOLE_ROW_GENRE]);
    });
  });

  describe('when the loaded pages hold no show of the genre at all', () => {
    it('given ?genre=Medical, when page 0 lands, then the empty state blames the loaded pages', async () => {
      await loadDashboard(UNLOADED_GRID_LOCATION);

      expect(within(emptyState()).getByText(UNLOADED_GENRE_BODY)).toBeDefined();
    });
  });
});
