import type { TestingPinia } from '@pinia/testing';
import { fireEvent, screen } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import type { Router } from 'vue-router';
import { TEST_IDS } from '@/testing/test-ids';
import {
  type AnimationFrameStub,
  installAnimationFrameStub,
} from '../composables/animation-frame-stub';
import {
  createDashboardPinia,
  firstPageOnly,
  queryAt,
  renderDashboardAt,
  rowGenres,
  serveIndexPages,
  settleBackgroundLoading,
  settleFirstPage,
  SEVENTH_ROW_GENRE,
} from './home-page-harness';

const EXPAND_DRAMA_LABEL = 'Show the Drama row as a grid';
const CLOSE_DRAMA_LABEL = 'Close Drama grid';
/** The seventh row the fixture fills, so it only mounts once the closing grid reveals it. */
const DEFERRED_GENRE = SEVENTH_ROW_GENRE;
const CLOSE_DEFERRED_LABEL = `Close ${DEFERRED_GENRE} grid`;

let pinia: TestingPinia;
let frames: AnimationFrameStub;

/** Serves page 0 and waits for the dashboard at `location` to settle on its rows or its grid. */
async function loadDashboardAt(location: string): Promise<Router> {
  serveIndexPages(firstPageOnly);

  const router = await renderDashboardAt(pinia, location);

  await settleFirstPage();

  return router;
}

const grid = (): HTMLElement => screen.getByTestId(TEST_IDS.genreGrid);

const headingFor = (genre: string): HTMLElement =>
  screen.getByRole('heading', { level: 2, name: genre });

/** Clicks, lets the navigation settle and paints the frame a close waits for. */
async function clickAndSettle(name: string): Promise<void> {
  await fireEvent.click(screen.getByRole('button', { name }));
  await flushPromises();
  frames.runFrame();
  await flushPromises();
}

/** The genre chosen somewhere else than the dashboard, such as the header select. */
async function selectGenre(router: Router, genre: string): Promise<void> {
  await router.replace({ query: { genre } });
  await nextTick();
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
  describe('when the route asks for one genre', () => {
    it('given ?genre=Comedy, when the index lands, then the Comedy grid takes over the page', async () => {
      await loadDashboardAt('/?genre=Comedy');

      expect(grid().dataset['genre']).toBe('Comedy');
    });

    it('given ?genre=Adult, when the index lands, then the empty state names the genre', async () => {
      await loadDashboardAt('/?genre=Adult');

      expect(screen.getByText('No Adult shows in the loaded index.')).toBeDefined();
    });

    it('given a direct load of ?genre=Drama, when the grid renders, then no focus is moved', async () => {
      await loadDashboardAt('/?genre=Drama');

      expect(document.activeElement).toBe(document.body);
    });
  });

  describe('when the reader expands a row', () => {
    it('given the dashboard, when the Drama row is expanded, then the route carries the genre', async () => {
      const router = await loadDashboardAt('/');

      await clickAndSettle(EXPAND_DRAMA_LABEL);

      expect(queryAt(router)).toEqual({ genre: 'Drama' });
    });

    it('given the dashboard, when the Drama row is expanded, then the Drama grid replaces the rows', async () => {
      await loadDashboardAt('/');

      await clickAndSettle(EXPAND_DRAMA_LABEL);

      expect(grid().dataset['genre']).toBe('Drama');
    });

    it('given the dashboard, when the Drama row is expanded, then the grid heading takes focus', async () => {
      await loadDashboardAt('/');

      await clickAndSettle(EXPAND_DRAMA_LABEL);

      expect(document.activeElement).toBe(headingFor('Drama'));
    });
  });

  describe('when the reader closes the grid', () => {
    it('given the Drama grid, when it is closed, then the route drops the genre', async () => {
      const router = await loadDashboardAt('/');
      await clickAndSettle(EXPAND_DRAMA_LABEL);

      await clickAndSettle(CLOSE_DRAMA_LABEL);

      expect(queryAt(router)).toEqual({});
    });

    it('given the Drama grid, when it is closed, then the Drama row is back as a real row', async () => {
      await loadDashboardAt('/');
      await clickAndSettle(EXPAND_DRAMA_LABEL);

      await clickAndSettle(CLOSE_DRAMA_LABEL);

      expect(rowGenres()[0]).toBe('Drama');
    });

    it('given the Drama grid, when it is closed, then the row heading takes focus', async () => {
      await loadDashboardAt('/');
      await clickAndSettle(EXPAND_DRAMA_LABEL);

      await clickAndSettle(CLOSE_DRAMA_LABEL);

      expect(document.activeElement).toBe(headingFor('Drama'));
    });
  });

  describe('when the reader switches to another genre with a grid open', () => {
    it('given the Drama grid, when the route moves to Comedy, then the Comedy grid replaces it', async () => {
      const router = await loadDashboardAt('/?genre=Drama');

      await selectGenre(router, 'Comedy');

      expect(grid().dataset['genre']).toBe('Comedy');
    });

    it('given the Drama grid, when the route moves to Comedy, then the Comedy heading takes focus', async () => {
      const router = await loadDashboardAt('/?genre=Drama');

      await selectGenre(router, 'Comedy');

      expect(document.activeElement).toBe(headingFor('Comedy'));
    });
  });

  describe('when the reader closes a grid whose row sits below the fold', () => {
    it('given ?genre=Supernatural, when the grid is closed, then that row is mounted as a real row', async () => {
      await loadDashboardAt(`/?genre=${DEFERRED_GENRE}`);

      await clickAndSettle(CLOSE_DEFERRED_LABEL);

      expect(rowGenres()).toContain(DEFERRED_GENRE);
    });

    it('given ?genre=Supernatural, when the grid is closed, then that row heading takes focus', async () => {
      await loadDashboardAt(`/?genre=${DEFERRED_GENRE}`);

      await clickAndSettle(CLOSE_DEFERRED_LABEL);

      expect(document.activeElement).toBe(headingFor(DEFERRED_GENRE));
    });
  });
});
