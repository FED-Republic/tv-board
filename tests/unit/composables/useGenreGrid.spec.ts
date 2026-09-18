import type { TestingPinia } from '@pinia/testing';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGenreGrid } from '@/composables/useGenreGrid';
import type { Genre } from '@/domain/genre';
import { OTHER_GENRE } from '@/domain/genre';
import type { Show } from '@/domain/show';
import { useShowsStore } from '@/stores/shows';
import {
  comedyIds,
  dramaAlone,
  dramaOverThinComedy,
  type PageResponder,
  serveIndexPages,
} from '../stores/background-harness';
import { type AnimationFrameStub, installAnimationFrameStub } from './animation-frame-stub';
import { createTestRouter } from './test-router';
import { withSetup } from './with-setup';

/** Long enough for the background page loop to run out before the timers go back to real. */
const BACKGROUND_WINDOW_MS = 30_000;

type GenreGrid = ReturnType<typeof useGenreGrid>;
type ShowsStore = ReturnType<typeof useShowsStore>;
type Harness = {
  readonly grid: GenreGrid;
  readonly store: ShowsStore;
};

let pinia: TestingPinia;
let frames: AnimationFrameStub;

const idsOf = (shows: readonly Show[]): readonly number[] => shows.map((show) => show.id);

/** A dashboard whose index has landed, at the location the reader opened. */
async function mountGenreGrid(location: string, respond: PageResponder): Promise<Harness> {
  serveIndexPages(respond);
  const store = useShowsStore();

  await store.loadIndex();

  const router = await createTestRouter(location);
  const { result } = withSetup(() => useGenreGrid(), [pinia, router]);

  return { grid: result, store };
}

/** The row is named a frame after the close, once the rows are in the document again. */
async function closeAfterExpanding(grid: GenreGrid, genre: Genre): Promise<void> {
  await grid.expand(genre);
  await grid.close();
  await flushPromises();

  frames.runFrame();
  await flushPromises();
}

beforeEach(() => {
  vi.useFakeTimers();
  pinia = createTestingPinia({ stubActions: false, createSpy: vi.fn });
  setActivePinia(pinia);
  frames = installAnimationFrameStub();
});

afterEach(async () => {
  await vi.advanceTimersByTimeAsync(BACKGROUND_WINDOW_MS);
  vi.useRealTimers();
});

describe('useGenreGrid', () => {
  describe('when the grid opens on a genre', () => {
    it('given a genre nothing has loaded for, when the grid is read, then it has no genre', async () => {
      const { grid } = await mountGenreGrid('/?genre=Western', dramaOverThinComedy);

      expect(grid.gridGenre.value).toBeNull();
    });

    it('given a genre nothing has loaded for, when the grid is read, then it holds no shows', async () => {
      const { grid } = await mountGenreGrid('/?genre=Western', dramaOverThinComedy);

      expect(grid.gridShows.value).toEqual([]);
    });

    it('given a genre nothing has loaded for, when the grid is read, then it is still grid mode', async () => {
      const { grid } = await mountGenreGrid('/?genre=Western', dramaOverThinComedy);

      expect(grid.isGridMode.value).toBe(true);
    });

    it('given a genre with loaded shows, when the grid is read, then it is that genre', async () => {
      const { grid } = await mountGenreGrid('/?genre=Drama', dramaOverThinComedy);

      expect(grid.gridGenre.value).toBe('Drama');
    });

    it('given a genre under the row minimum, when the grid is read, then it holds its shows', async () => {
      const { grid } = await mountGenreGrid('/?genre=Comedy', dramaOverThinComedy);

      expect(idsOf(grid.gridShows.value)).toEqual(comedyIds());
    });
  });

  describe('when the reader asks for more from an empty grid', () => {
    it('given an empty grid, when nothing has been pressed, then the grid is not revealed', async () => {
      const { grid } = await mountGenreGrid('/?genre=Western', dramaOverThinComedy);

      expect(grid.isRevealedGrid.value).toBe(false);
    });

    it('given an empty grid, when the press lands, then the grid it brings is revealed', async () => {
      const { grid } = await mountGenreGrid('/?genre=Western', dramaOverThinComedy);

      grid.askFromEmpty();

      expect(grid.isRevealedGrid.value).toBe(true);
    });

    it('given an empty grid, when the press lands, then the store is asked for another page', async () => {
      const { grid, store } = await mountGenreGrid('/?genre=Western', dramaOverThinComedy);

      grid.askFromEmpty();

      expect(store.loadMore).toHaveBeenCalledTimes(1);
    });
  });

  describe('when a grid closes', () => {
    it('given a genre with a row of its own, when its grid closes, then that row is revealed', async () => {
      const { grid } = await mountGenreGrid('/', dramaOverThinComedy);

      await closeAfterExpanding(grid, 'Drama');

      expect(grid.revealedRow.value).toBe('Drama');
    });

    it('given a genre under the row minimum, when its grid closes, then Other is revealed', async () => {
      const { grid } = await mountGenreGrid('/', dramaOverThinComedy);

      await closeAfterExpanding(grid, 'Comedy');

      expect(grid.revealedRow.value).toBe(OTHER_GENRE);
    });

    it('given no Other row either, when the grid closes, then the first row is revealed', async () => {
      const { grid } = await mountGenreGrid('/', dramaAlone);

      await closeAfterExpanding(grid, 'Comedy');

      expect(grid.revealedRow.value).toBe('Drama');
    });

    it('given the rows, when no grid has closed, then no row is revealed', async () => {
      const { grid } = await mountGenreGrid('/', dramaOverThinComedy);

      expect(grid.revealedRow.value).toBeNull();
    });
  });
});
