import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import type { Router } from 'vue-router';
import { useGenreView } from '@/composables/useGenreView';
import type { Genre } from '@/domain/genre';
import { type AnimationFrameStub, installAnimationFrameStub } from './animation-frame-stub';
import { createBrowserTestRouter, createTestRouter, whenHistoryStepSettles } from './test-router';
import { withSetup } from './with-setup';

type GenreView = ReturnType<typeof useGenreView>;
type Harness = {
  readonly router: Router;
  readonly view: GenreView;
};

/** Where the rows stood when the reader opened a grid over them. */
const ROWS_OFFSET_PX = 640;
/** The grid opens at the top of the page, so the rows' offset is gone while it is up. */
const GRID_OFFSET_PX = 0;

let frames: AnimationFrameStub;

async function viewAt(location: string): Promise<Harness> {
  const router = await createTestRouter(location);
  const { result } = withSetup(() => useGenreView(), [router]);

  return { router, view: result };
}

/** The close button only steps back where the history records its previous entry. */
async function viewInBrowserHistoryAt(location: string): Promise<Harness> {
  const router = await createBrowserTestRouter(location);
  const { result } = withSetup(() => useGenreView(), [router]);

  return { router, view: result };
}

/** jsdom never scrolls, so the page offset the composable reads is set by hand. */
function scrollPageTo(offsetPx: number): void {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: offsetPx });
}

const watchPageScroll = () => vi.spyOn(window, 'scrollTo');

/** What `revealedGenre` held on every page move, so the order of the two is on the record. */
function recordRevealedGenreOnScroll(view: GenreView): readonly (Genre | null)[] {
  const revealedOnScroll: (Genre | null)[] = [];

  vi.spyOn(window, 'scrollTo').mockImplementation(() => {
    revealedOnScroll.push(view.revealedGenre.value);
  });

  return revealedOnScroll;
}

/** The rows come back a frame after the close, once they are in the document again. */
async function whenRowsAreBack(): Promise<void> {
  await flushPromises();
  frames.runFrame();
  await flushPromises();
}

/** A genre chosen somewhere else than a row, such as the header's genre select. */
async function selectGenreElsewhere(router: Router, genre: string): Promise<void> {
  await router.replace({ query: { genre } });
  await nextTick();
  await flushPromises();
}

/** A navigation made elsewhere, such as the header genre select going back to every genre. */
async function clearGenreElsewhere(router: Router): Promise<void> {
  await router.replace({ query: {} });
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
  describe('when a grid opened from the rows is closed', () => {
    it('given the rows at 640 px when the row was expanded, when the grid is closed, then the page goes back to that offset', async () => {
      const { view } = await viewAt('/');
      scrollPageTo(ROWS_OFFSET_PX);
      await view.expand('Drama');
      scrollPageTo(GRID_OFFSET_PX);
      const scrollTo = watchPageScroll();

      await view.close();
      await whenRowsAreBack();

      expect(scrollTo).toHaveBeenCalledWith({ top: ROWS_OFFSET_PX, behavior: 'instant' });
    });

    it('given the rows at 640 px when the row was expanded, when the grid is closed, then the page moves before the row is revealed', async () => {
      const { view } = await viewAt('/');
      scrollPageTo(ROWS_OFFSET_PX);
      await view.expand('Drama');
      const revealedOnScroll = recordRevealedGenreOnScroll(view);

      await view.close();
      await whenRowsAreBack();

      expect(revealedOnScroll).toEqual([null]);
    });

    it('given the rows at 640 px when the row was expanded, when the grid is closed, then the row is revealed once the page is back', async () => {
      const { view } = await viewAt('/');
      scrollPageTo(ROWS_OFFSET_PX);
      await view.expand('Drama');

      await view.close();
      await whenRowsAreBack();

      expect(view.revealedGenre.value).toBe('Drama');
    });

    it('given a grid reached from the rows, when its close button steps back, then the page goes back to that offset', async () => {
      const { view } = await viewInBrowserHistoryAt('/');
      scrollPageTo(ROWS_OFFSET_PX);
      await view.expand('Drama');
      scrollPageTo(GRID_OFFSET_PX);
      const scrollTo = watchPageScroll();

      await whenHistoryStepSettles(() => void view.close());
      await whenRowsAreBack();

      expect(scrollTo).toHaveBeenCalledWith({ top: ROWS_OFFSET_PX, behavior: 'instant' });
    });

    it('given a genre chosen in the header at 640 px, when the grid is closed, then the page goes back to that offset', async () => {
      const { router, view } = await viewAt('/');
      scrollPageTo(ROWS_OFFSET_PX);
      await selectGenreElsewhere(router, 'Drama');
      scrollPageTo(GRID_OFFSET_PX);
      const scrollTo = watchPageScroll();

      await view.close();
      await whenRowsAreBack();

      expect(scrollTo).toHaveBeenCalledWith({ top: ROWS_OFFSET_PX, behavior: 'instant' });
    });
  });

  describe('when the rows are back in the document but the frame has not come', () => {
    it('given a grid just closed, when the rows have not been painted yet, then the page has not moved', async () => {
      const { view } = await viewAt('/');
      scrollPageTo(ROWS_OFFSET_PX);
      await view.expand('Drama');
      const scrollTo = watchPageScroll();

      await view.close();
      await flushPromises();

      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('given a grid just closed, when the rows have not been painted yet, then no row is revealed', async () => {
      const { view } = await viewAt('/');
      scrollPageTo(ROWS_OFFSET_PX);
      await view.expand('Drama');

      await view.close();
      await flushPromises();

      expect(view.revealedGenre.value).toBeNull();
    });
  });

  describe('when the grid was reached by a link of its own', () => {
    it('given a direct load of ?genre=Drama, when the grid is closed, then the page stays where it is', async () => {
      const { view } = await viewAt('/?genre=Drama');
      scrollPageTo(ROWS_OFFSET_PX);
      const scrollTo = watchPageScroll();

      await view.close();
      await whenRowsAreBack();

      expect(scrollTo).not.toHaveBeenCalled();
    });
  });

  describe('when nobody asked for the rows back', () => {
    it('given an expanded row, when the genre is cleared elsewhere, then the page is not scrolled', async () => {
      const { router, view } = await viewAt('/');
      scrollPageTo(ROWS_OFFSET_PX);
      await view.expand('Drama');
      const scrollTo = watchPageScroll();

      await clearGenreElsewhere(router);

      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('given the rows, when a row is expanded, then the page itself is not scrolled', async () => {
      const { view } = await viewAt('/');
      scrollPageTo(ROWS_OFFSET_PX);
      const scrollTo = watchPageScroll();

      await view.expand('Drama');
      await whenRowsAreBack();

      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('given no grid to close, when close is called, then the page is not scrolled', async () => {
      const { view } = await viewAt('/');
      const scrollTo = watchPageScroll();

      await view.close();
      await whenRowsAreBack();

      expect(scrollTo).not.toHaveBeenCalled();
    });
  });
});
