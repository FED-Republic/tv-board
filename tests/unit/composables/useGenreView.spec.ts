import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import type { Router } from 'vue-router';
import { useGenreView } from '@/composables/useGenreView';
import { type AnimationFrameStub, installAnimationFrameStub } from './animation-frame-stub';
import { createTestRouter } from './test-router';
import { withSetup } from './with-setup';

type GenreView = ReturnType<typeof useGenreView>;
type Harness = {
  readonly router: Router;
  readonly view: GenreView;
};

let frames: AnimationFrameStub;

async function viewAt(location: string): Promise<Harness> {
  const router = await createTestRouter(location);
  const { result } = withSetup(() => useGenreView(), [router]);

  return { router, view: result };
}

const queryAt = (router: Router): Record<string, unknown> => ({
  ...router.currentRoute.value.query,
});

/** The row is named a frame after the close, once the rows are in the document again. */
async function whenRowsAreBack(): Promise<void> {
  await flushPromises();
  frames.runFrame();
  await flushPromises();
}

/** A navigation made elsewhere, such as the header genre select. */
async function selectGenreElsewhere(router: Router, genre: string): Promise<void> {
  await router.replace({ query: { genre } });
  await nextTick();
}

beforeEach(() => {
  frames = installAnimationFrameStub();
});

describe('useGenreView', () => {
  describe('when the route carries a genre', () => {
    it('given ?genre=Drama, when read, then the genre is Drama', async () => {
      const { view } = await viewAt('/?genre=Drama');

      expect(view.genre.value).toBe('Drama');
    });

    it('given no query, when read, then no genre is selected', async () => {
      const { view } = await viewAt('/');

      expect(view.genre.value).toBeNull();
    });

    it('given a direct load of ?genre=Drama, when mounted, then the grid is not revealed', async () => {
      const { view } = await viewAt('/?genre=Drama');

      expect(view.isGridRevealed.value).toBe(false);
    });
  });

  describe('when a row is expanded', () => {
    it('given a row, when expanded, then the genre lands in the URL', async () => {
      const { router, view } = await viewAt('/');

      await view.expand('Drama');

      expect(queryAt(router)).toEqual({ genre: 'Drama' });
    });

    it('given a row, when expanded, then the grid is revealed', async () => {
      const { view } = await viewAt('/');

      await view.expand('Drama');

      expect(view.isGridRevealed.value).toBe(true);
    });

    it('given a row, when expanded, then no row is waiting to be revealed', async () => {
      const { view } = await viewAt('/');

      await view.expand('Drama');

      expect(view.revealedGenre.value).toBeNull();
    });
  });

  describe('when the grid is closed', () => {
    it('given an expanded grid, when closed, then the genre leaves the URL', async () => {
      const { router, view } = await viewAt('/?genre=Drama');

      await view.close();

      expect(queryAt(router)).toEqual({});
    });

    it('given an expanded grid, when closed, then its row is the one to reveal', async () => {
      const { view } = await viewAt('/?genre=Drama');

      await view.close();
      await whenRowsAreBack();

      expect(view.revealedGenre.value).toBe('Drama');
    });

    it('given an expanded grid, when closed, then the grid is no longer revealed', async () => {
      const { view } = await viewAt('/?genre=Drama');

      await view.close();

      expect(view.isGridRevealed.value).toBe(false);
    });
  });

  describe('when there is no grid to close', () => {
    it('given no genre in the URL, when closed, then the URL keeps no genre', async () => {
      const { router, view } = await viewAt('/');

      await view.close();

      expect(queryAt(router)).toEqual({});
    });

    it('given no genre in the URL, when closed, then no row is waiting to be revealed', async () => {
      const { view } = await viewAt('/');

      await view.close();
      await whenRowsAreBack();

      expect(view.revealedGenre.value).toBeNull();
    });

    it('given a grid already closed, when closed again, then the row to reveal stays the same', async () => {
      const { view } = await viewAt('/?genre=Drama');
      await view.close();
      await whenRowsAreBack();

      await view.close();
      await whenRowsAreBack();

      expect(view.revealedGenre.value).toBe('Drama');
    });
  });

  describe('when the genre changes elsewhere', () => {
    it('given the dashboard, when a genre is selected elsewhere, then the grid is revealed', async () => {
      const { router, view } = await viewAt('/');

      await selectGenreElsewhere(router, 'Comedy');

      expect(view.isGridRevealed.value).toBe(true);
    });

    it('given a closed grid, when a genre is selected elsewhere, then no row waits to be revealed', async () => {
      const { router, view } = await viewAt('/?genre=Drama');
      await view.close();
      await whenRowsAreBack();

      await selectGenreElsewhere(router, 'Comedy');

      expect(view.revealedGenre.value).toBeNull();
    });

    it('given the dashboard, when a genre is selected elsewhere, then the genre follows the URL', async () => {
      const { router, view } = await viewAt('/');

      await selectGenreElsewhere(router, 'Comedy');

      expect(view.genre.value).toBe('Comedy');
    });
  });
});
