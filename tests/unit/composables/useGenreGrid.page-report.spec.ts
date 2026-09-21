import type { TestingPinia } from '@pinia/testing';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageReport } from '@/domain/dashboard-copy';
import {
  genrePage,
  notFound,
  type PageResponder,
  releaseTimers,
} from '../stores/background-harness';
import {
  budgetThen,
  COMEDY_GRID,
  endsAfterTheFirstPage,
  EXTRA_SHOW_COUNT,
  firstPageThenSilence,
  type GenreGrid,
  mountGridAt,
  mountSettledGrid,
  neverAnswers,
  pressAndSettle,
  reportAfterPressing,
  repeatsTheFirstPage,
  DRAMA_GRID,
} from './genre-grid-page-harness';

/** Ids past everything the first page carries, so the page a press asks for widens the index. */
const FIRST_EXTRA_ID = 9500;
/** What a page brought when TVmaze had nothing the index was missing. */
const NOTHING_ARRIVED: PageReport = { loaded: 0, inGenre: 0 };

const dramaPage: PageResponder = () => genrePage('Drama', EXTRA_SHOW_COUNT, FIRST_EXTRA_ID);
const horrorPage: PageResponder = () => genrePage('Horror', EXTRA_SHOW_COUNT, FIRST_EXTRA_ID);

let pinia: TestingPinia;

beforeEach(() => {
  vi.useFakeTimers();
  pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  setActivePinia(pinia);
});

afterEach(releaseTimers);

describe('useGenreGrid', () => {
  describe('when no page has been asked for', () => {
    it('given a settled grid, when it is read, then no page is awaited', async () => {
      const { grid } = await mountSettledGrid(pinia, budgetThen(neverAnswers));

      expect(grid.isAwaitingPage.value).toBe(false);
    });

    it('given a settled grid, when it is read, then it has no report', async () => {
      const { grid } = await mountSettledGrid(pinia, budgetThen(neverAnswers));

      expect(grid.pageReport.value).toBeNull();
    });
  });

  describe('when the reader asks for a page', () => {
    it('given a page the store started, when it is on its way, then the page is awaited', async () => {
      const { grid } = await mountSettledGrid(pinia, budgetThen(neverAnswers));

      await pressAndSettle(grid);

      expect(grid.isAwaitingPage.value).toBe(true);
    });

    it('given a page the store started, when it is on its way, then there is no report yet', async () => {
      const { grid } = await mountSettledGrid(pinia, budgetThen(neverAnswers));

      await pressAndSettle(grid);

      expect(grid.pageReport.value).toBeNull();
    });

    it('given the background loop already loading, when the reader presses, then the page is awaited', async () => {
      const { grid } = await mountGridAt(pinia, DRAMA_GRID, firstPageThenSilence);

      await pressAndSettle(grid);

      expect(grid.isAwaitingPage.value).toBe(true);
    });

    it('given no page left at TVmaze, when the reader presses, then nothing is awaited', async () => {
      const { grid } = await mountSettledGrid(pinia, endsAfterTheFirstPage);

      await pressAndSettle(grid);

      expect(grid.isAwaitingPage.value).toBe(false);
    });

    it('given no page left at TVmaze, when the reader presses, then nothing is reported', async () => {
      const { grid } = await mountSettledGrid(pinia, endsAfterTheFirstPage);

      await pressAndSettle(grid);

      expect(grid.pageReport.value).toBeNull();
    });
  });

  describe('when the page the reader asked for answers', () => {
    it('given a page of Drama shows, when it lands, then the report counts what it brought', async () => {
      const report = await reportAfterPressing(pinia, dramaPage);

      expect(report).toEqual({ loaded: EXTRA_SHOW_COUNT, inGenre: EXTRA_SHOW_COUNT });
    });

    it('given a page without a Drama show, when it lands, then the report counts none for the genre', async () => {
      const report = await reportAfterPressing(pinia, horrorPage);

      expect(report).toEqual({ loaded: EXTRA_SHOW_COUNT, inGenre: 0 });
    });

    it('given a page of shows the index holds, when it lands, then the report counts nothing', async () => {
      const report = await reportAfterPressing(pinia, repeatsTheFirstPage);

      expect(report).toEqual(NOTHING_ARRIVED);
    });

    it('given a page that answers 404, when the index ends, then the report counts nothing', async () => {
      const report = await reportAfterPressing(pinia, notFound);

      expect(report).toEqual(NOTHING_ARRIVED);
    });

    it('given a page that landed, when the report arrives, then no page is awaited any more', async () => {
      const { grid } = await mountSettledGrid(pinia, budgetThen(dramaPage));

      await pressAndSettle(grid);

      expect(grid.isAwaitingPage.value).toBe(false);
    });

    it('given a report on screen, when the reader presses again, then it is cleared at once', async () => {
      const { grid } = await mountSettledGrid(pinia, budgetThen(repeatsTheFirstPage));
      await pressAndSettle(grid);

      grid.askForPage();

      expect(grid.pageReport.value).toBeNull();
    });
  });

  describe('when the store has no page left for the press', () => {
    /** The press that spent the last page, and the press the store has nothing left for. */
    async function pressPastTheLastPage(): Promise<GenreGrid> {
      const { grid } = await mountSettledGrid(pinia, budgetThen(notFound));

      await pressAndSettle(grid);
      await pressAndSettle(grid);

      return grid;
    }

    // A press the store drops brings no page, so nothing can replace the answer it wiped.
    it('given an answer on screen, when a press the store drops follows, then the answer stays', async () => {
      const grid = await pressPastTheLastPage();

      expect(grid.pageReport.value).toEqual(NOTHING_ARRIVED);
    });

    it('given an answer on screen, when a press the store drops follows, then nothing is awaited', async () => {
      const grid = await pressPastTheLastPage();

      expect(grid.isAwaitingPage.value).toBe(false);
    });
  });

  describe('when the reader moves to another genre', () => {
    it('given a report on the Drama grid, when the genre changes, then the report is cleared', async () => {
      const { grid, router } = await mountSettledGrid(pinia, budgetThen(repeatsTheFirstPage));
      await pressAndSettle(grid);

      await router.push(COMEDY_GRID);

      expect(grid.pageReport.value).toBeNull();
    });

    it('given a page on its way, when the genre changes, then nothing is awaited any more', async () => {
      const { grid, router } = await mountSettledGrid(pinia, budgetThen(neverAnswers));
      await pressAndSettle(grid);

      await router.push(COMEDY_GRID);

      expect(grid.isAwaitingPage.value).toBe(false);
    });
  });
});
