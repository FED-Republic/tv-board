import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import type { Router } from 'vue-router';
import { useGenreView } from '@/composables/useGenreView';
import type { Genre } from '@/domain/genre';
import { type AnimationFrameStub, installAnimationFrameStub } from './animation-frame-stub';
import { createTestRouter } from './test-router';
import { withSetup } from './with-setup';

type GenreView = ReturnType<typeof useGenreView>;
type Harness = {
  readonly router: Router;
  readonly view: GenreView;
  readonly unmount: () => void;
};

/** Where the rows stood when the reader opened the first grid, and where they stood on the second. */
const FIRST_ROWS_OFFSET_PX = 640;
const SECOND_ROWS_OFFSET_PX = 1280;
/** The grid opens at the top of the page, so the rows' offset is gone while it is up. */
const GRID_OFFSET_PX = 0;

let frames: AnimationFrameStub;

async function viewAt(location: string): Promise<Harness> {
  const router = await createTestRouter(location);
  const { result, unmount } = withSetup(() => useGenreView(), [router]);

  return { router, view: result, unmount };
}

/** jsdom never scrolls, so the page offset the composable reads is set by hand. */
function scrollPageTo(offsetPx: number): void {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: offsetPx });
}

const watchPageScroll = () => vi.spyOn(window, 'scrollTo');

/** The rows come back a frame after the close, once they are in the document again. */
async function whenRowsAreBack(): Promise<void> {
  await flushPromises();
  frames.runFrame();
  await flushPromises();
}

/** One round through a grid: the rows stand at `offsetPx`, a row expands and the grid closes. */
async function openAndCloseGrid(view: GenreView, genre: Genre, offsetPx: number): Promise<void> {
  scrollPageTo(offsetPx);
  await view.expand(genre);
  scrollPageTo(GRID_OFFSET_PX);
  await view.close();
  await whenRowsAreBack();
}

/** A grid closed from rows at 640 px, with the frame that restores them still pending. */
async function aCloseWaitingForItsFrame(): Promise<Harness> {
  const harness = await viewAt('/');

  scrollPageTo(FIRST_ROWS_OFFSET_PX);
  await harness.view.expand('Drama');
  await harness.view.close();
  await flushPromises();

  return harness;
}

/** A genre chosen somewhere else than a row, such as the header's genre select. */
async function selectGenreElsewhere(router: Router, genre: string): Promise<void> {
  await router.replace({ query: { genre } });
  await nextTick();
  await flushPromises();
}

beforeEach(() => {
  frames = installAnimationFrameStub();
});

afterEach(() => {
  scrollPageTo(GRID_OFFSET_PX);
});

describe('useGenreView', () => {
  describe('when a second grid is opened from a new offset', () => {
    it('given a round already closed, when a row at 1280 px is expanded and closed, then the page goes back to the new offset', async () => {
      const { view } = await viewAt('/');
      await openAndCloseGrid(view, 'Drama', FIRST_ROWS_OFFSET_PX);
      const scrollTo = watchPageScroll();

      await openAndCloseGrid(view, 'Comedy', SECOND_ROWS_OFFSET_PX);

      expect(scrollTo).toHaveBeenCalledWith({ top: SECOND_ROWS_OFFSET_PX, behavior: 'instant' });
    });

    it('given a round already closed, when the second grid is closed, then the second row is the one to reveal', async () => {
      const { view } = await viewAt('/');
      await openAndCloseGrid(view, 'Drama', FIRST_ROWS_OFFSET_PX);

      await openAndCloseGrid(view, 'Comedy', SECOND_ROWS_OFFSET_PX);

      expect(view.revealedGenre.value).toBe('Comedy');
    });
  });

  describe('when a grid chosen in the header is closed', () => {
    it('given a genre chosen in the header, when the grid is closed, then its row is the one to reveal', async () => {
      const { router, view } = await viewAt('/');
      scrollPageTo(FIRST_ROWS_OFFSET_PX);
      await selectGenreElsewhere(router, 'Drama');

      await view.close();
      await whenRowsAreBack();

      expect(view.revealedGenre.value).toBe('Drama');
    });
  });

  describe('when the dashboard is gone before the frame comes', () => {
    it('given a grid just closed, when the dashboard unmounts before the frame, then the page is not scrolled', async () => {
      const { unmount } = await aCloseWaitingForItsFrame();
      const scrollTo = watchPageScroll();

      unmount();
      frames.runFrame();

      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('given a grid just closed, when the dashboard unmounts before the frame, then no row is revealed', async () => {
      const { view, unmount } = await aCloseWaitingForItsFrame();

      unmount();
      frames.runFrame();

      expect(view.revealedGenre.value).toBeNull();
    });
  });

  describe('when another genre is chosen before the frame comes', () => {
    it('given a grid just closed, when a genre is chosen before the frame, then the page is not scrolled', async () => {
      const { router } = await aCloseWaitingForItsFrame();
      const scrollTo = watchPageScroll();

      await selectGenreElsewhere(router, 'Comedy');
      frames.runFrame();

      expect(scrollTo).not.toHaveBeenCalled();
    });
  });

  describe('when a grid is opened and closed', () => {
    it('given the rows, when a row is expanded and its grid closed, then nothing is warned to the console', async () => {
      const { view } = await viewAt('/');
      const warn = vi.spyOn(console, 'warn');

      await openAndCloseGrid(view, 'Drama', FIRST_ROWS_OFFSET_PX);

      expect(warn).not.toHaveBeenCalled();
    });
  });
});
