import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import type { Router } from 'vue-router';
import { useGenreView } from '@/composables/useGenreView';
import { createBrowserTestRouter, createTestRouter, whenHistoryStepSettles } from './test-router';
import { withSetup } from './with-setup';

type GenreView = ReturnType<typeof useGenreView>;
type Harness = {
  readonly router: Router;
  readonly view: GenreView;
};

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

const queryAt = (router: Router): Record<string, unknown> => ({
  ...router.currentRoute.value.query,
});

/** Two clicks on the close button before the first navigation has landed. */
function closeTwice(view: GenreView): Promise<[void, void]> {
  return Promise.all([view.close(), view.close()]);
}

/** A navigation made elsewhere, such as the header genre select. */
async function selectGenreElsewhere(router: Router, genre: string): Promise<void> {
  await router.replace({ query: { genre } });
  await nextTick();
}

describe('useGenreView', () => {
  describe('when a row is expanded', () => {
    it('given an expanded row, when Back is pressed, then the genre leaves the URL', async () => {
      const { router, view } = await viewAt('/');
      await view.expand('Drama');

      router.back();
      await flushPromises();

      expect(view.genre.value).toBeNull();
    });

    it('given an expanded row, when Back is pressed, then the grid is no longer revealed', async () => {
      const { router, view } = await viewAt('/');
      await view.expand('Drama');

      router.back();
      await flushPromises();

      expect(view.isGridRevealed.value).toBe(false);
    });
  });

  describe('when a grid opened from a row is closed', () => {
    it('given a grid reached from the rows, when closed, then the genre leaves the URL', async () => {
      const { router, view } = await viewInBrowserHistoryAt('/');
      await view.expand('Drama');

      await whenHistoryStepSettles(() => void view.close());

      expect(queryAt(router)).toEqual({});
    });

    it('given a grid reached from the rows, when its close button is clicked twice, then one history step is taken', async () => {
      const { router, view } = await viewInBrowserHistoryAt('/');
      await view.expand('Drama');
      const back = vi.spyOn(router, 'back');

      await whenHistoryStepSettles(() => void closeTwice(view));

      expect(back).toHaveBeenCalledTimes(1);
    });

    it('given a grid reached from the rows, when its close button is clicked twice, then the rows are what is left', async () => {
      const { router, view } = await viewInBrowserHistoryAt('/');
      await view.expand('Drama');

      await whenHistoryStepSettles(() => void closeTwice(view));

      expect(queryAt(router)).toEqual({});
    });

    it('given a grid reached from the rows, when closed, then the grid entry stays ahead', async () => {
      const { router, view } = await viewInBrowserHistoryAt('/');
      await view.expand('Drama');
      await whenHistoryStepSettles(() => void view.close());

      await whenHistoryStepSettles(() => router.forward());

      expect(queryAt(router)).toEqual({ genre: 'Drama' });
    });
  });

  describe('when a grid nobody expanded is closed', () => {
    it('given a direct load of ?genre=Drama, when closed, then the entry is replaced', async () => {
      const { router, view } = await viewAt('/?genre=Drama');
      const replace = vi.spyOn(router, 'replace');

      await view.close();

      expect(replace).toHaveBeenCalledTimes(1);
    });

    it('given a genre chosen in the header, when closed, then no history step is taken', async () => {
      const { router, view } = await viewAt('/');
      await selectGenreElsewhere(router, 'Comedy');
      const back = vi.spyOn(router, 'back');

      await view.close();

      expect(back).not.toHaveBeenCalled();
    });
  });
});
