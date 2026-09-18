import { flushPromises } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { Router } from 'vue-router';
import { useGenreFilter } from '@/composables/useGenreFilter';
import { createTestRouter } from './test-router';
import { withSetup } from './with-setup';

type GenreFilter = ReturnType<typeof useGenreFilter>;
type Harness = {
  readonly router: Router;
  readonly filter: GenreFilter;
};

async function filterAt(location: string): Promise<Harness> {
  const router = await createTestRouter(location);
  const { result } = withSetup(() => useGenreFilter(), [router]);

  return { router, filter: result };
}

const queryAt = (router: Router): Record<string, unknown> => ({
  ...router.currentRoute.value.query,
});

describe('useGenreFilter', () => {
  describe('when the route carries a genre', () => {
    it('given ?genre=Drama, when read, then the genre is Drama', async () => {
      const { filter } = await filterAt('/?genre=Drama');

      expect(filter.genre.value).toBe('Drama');
    });

    it('given ?genre=Other, when read, then the fallback genre is selected', async () => {
      const { filter } = await filterAt('/?genre=Other');

      expect(filter.genre.value).toBe('Other');
    });
  });

  describe('when the route carries no usable genre', () => {
    it('given no query, when read, then no genre is selected', async () => {
      const { filter } = await filterAt('/');

      expect(filter.genre.value).toBeNull();
    });

    it('given ?genre=talkshow, when read, then the unknown genre is ignored', async () => {
      const { filter } = await filterAt('/?genre=talkshow');

      expect(filter.genre.value).toBeNull();
    });

    it('given ?genre=drama, when read, then the wrong case is ignored', async () => {
      const { filter } = await filterAt('/?genre=drama');

      expect(filter.genre.value).toBeNull();
    });

    it('given the genre twice, when read, then the repeated parameter is ignored', async () => {
      const { filter } = await filterAt('/?genre=Drama&genre=Comedy');

      expect(filter.genre.value).toBeNull();
    });
  });

  describe('when a genre is selected', () => {
    it('given a search query in the route, when a genre is set, then the query survives', async () => {
      const { router, filter } = await filterAt('/?q=fleabag');

      await filter.setGenre('Comedy');

      expect(queryAt(router)).toEqual({ q: 'fleabag', genre: 'Comedy' });
    });

    it('given a selected genre, when another is set, then the genre is read back', async () => {
      const { filter } = await filterAt('/?genre=Drama');

      await filter.setGenre('Comedy');

      expect(filter.genre.value).toBe('Comedy');
    });

    it('given the search page, when a genre is set, then the path stays', async () => {
      const { router, filter } = await filterAt('/search?q=fleabag');

      await filter.setGenre('Drama');

      expect(router.currentRoute.value.path).toBe('/search');
    });

    it('given any route, when a genre is set, then the entry is replaced', async () => {
      const { router, filter } = await filterAt('/');
      const replace = vi.spyOn(router, 'replace');

      await filter.setGenre('Drama');

      expect(replace).toHaveBeenCalledTimes(1);
    });

    it('given any route, when a genre is set, then no history entry is pushed', async () => {
      const { router, filter } = await filterAt('/');
      const push = vi.spyOn(router, 'push');

      await filter.setGenre('Drama');

      expect(push).not.toHaveBeenCalled();
    });
  });

  describe('when a genre is set as its own history entry', () => {
    it('given push mode, when a genre is set, then a history entry is pushed', async () => {
      const { router, filter } = await filterAt('/');
      const push = vi.spyOn(router, 'push');

      await filter.setGenre('Drama', 'push');

      expect(push).toHaveBeenCalledTimes(1);
    });

    it('given push mode, when a genre is set, then no entry is replaced', async () => {
      const { router, filter } = await filterAt('/');
      const replace = vi.spyOn(router, 'replace');

      await filter.setGenre('Drama', 'push');

      expect(replace).not.toHaveBeenCalled();
    });

    it('given a pushed genre, when Back is pressed, then the genre leaves the URL', async () => {
      const { router, filter } = await filterAt('/');
      await filter.setGenre('Drama', 'push');

      router.back();
      await flushPromises();

      expect(filter.genre.value).toBeNull();
    });
  });

  describe('when the genre is cleared', () => {
    it('given a selected genre, when cleared, then the parameter is dropped', async () => {
      const { router, filter } = await filterAt('/?genre=Drama&q=fleabag');

      await filter.setGenre(null);

      expect(queryAt(router)).toEqual({ q: 'fleabag' });
    });

    it('given a selected genre, when cleared, then no genre is selected', async () => {
      const { filter } = await filterAt('/?genre=Drama');

      await filter.setGenre(null);

      expect(filter.genre.value).toBeNull();
    });

    it('given no selected genre, when cleared, then the location is unchanged', async () => {
      const { router, filter } = await filterAt('/?q=fleabag');

      await filter.setGenre(null);

      expect(router.currentRoute.value.fullPath).toBe('/?q=fleabag');
    });
  });
});
