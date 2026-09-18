import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import type { Router } from 'vue-router';
import { SEARCH_DEBOUNCE_MS, useSearchQuery } from '@/composables/useSearchQuery';
import { createTestRouter } from './test-router';
import { withSetup } from './with-setup';

const KEYSTROKE_GAP_MS = 100;

type SearchQuery = ReturnType<typeof useSearchQuery>;
type Harness = {
  readonly router: Router;
  readonly search: SearchQuery;
  readonly unmount: () => void;
};

async function searchAt(location: string): Promise<Harness> {
  const router = await createTestRouter(location);
  const { result, unmount } = withSetup(() => useSearchQuery(), [router]);

  return { router, search: result, unmount };
}

const queryAt = (router: Router): Record<string, unknown> => ({
  ...router.currentRoute.value.query,
});

const routeNameOf = (router: Router): string => String(router.currentRoute.value.name);

/** The field's text reaches the URL only after the typing pause. */
async function settleWrite(): Promise<void> {
  await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
  await flushPromises();
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSearchQuery', () => {
  describe('when the route carries a query', () => {
    it('given ?q=fleabag, when read, then the query is fleabag', async () => {
      const { search } = await searchAt('/search?q=fleabag');

      expect(search.query.value).toBe('fleabag');
    });

    it('given ?q=fleabag, when read, then the field starts from the URL', async () => {
      const { search } = await searchAt('/search?q=fleabag');

      expect(search.draft.value).toBe('fleabag');
    });

    it('given an empty ?q=, when read, then the query is empty', async () => {
      const { search } = await searchAt('/search?q=');

      expect(search.query.value).toBe('');
    });

    it('given the parameter twice, when read, then the repeated parameter is ignored', async () => {
      const { search } = await searchAt('/search?q=flea&q=bag');

      expect(search.query.value).toBe('');
    });

    it('given no parameter, when read, then the query is empty', async () => {
      const { search } = await searchAt('/');

      expect(search.query.value).toBe('');
    });
  });

  describe('when the reader is still typing', () => {
    it('given a typed letter, when the pause has not elapsed, then the URL is unchanged', async () => {
      const { router, search } = await searchAt('/');

      search.setQuery('fleabag');
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 1);

      expect(router.currentRoute.value.fullPath).toBe('/');
    });

    it('given a second keystroke inside the pause, when it elapses, then only the last text is written', async () => {
      const { router, search } = await searchAt('/');

      search.setQuery('flea');
      await vi.advanceTimersByTimeAsync(KEYSTROKE_GAP_MS);
      search.setQuery('fleabag');
      await settleWrite();

      expect(queryAt(router)).toEqual({ q: 'fleabag' });
    });

    it('given a trailing space, when the text is set, then the field keeps it', async () => {
      const { search } = await searchAt('/search?q=flea');

      search.setQuery('fleabag ');

      expect(search.draft.value).toBe('fleabag ');
    });

    it('given a trailing space, when the write settles, then the field still keeps it', async () => {
      const { search } = await searchAt('/search?q=flea');

      search.setQuery('fleabag ');
      await settleWrite();

      expect(search.draft.value).toBe('fleabag ');
    });
  });

  describe('when a search starts from another page', () => {
    it('given the home page, when a query is written, then the search page opens', async () => {
      const { router, search } = await searchAt('/');

      search.setQuery('fleabag');
      await settleWrite();

      expect(routeNameOf(router)).toBe('search');
    });

    it('given a selected genre, when a query is written, then the genre survives', async () => {
      const { router, search } = await searchAt('/?genre=Drama');

      search.setQuery('fleabag');
      await settleWrite();

      expect(queryAt(router)).toEqual({ q: 'fleabag', genre: 'Drama' });
    });

    it('given the home page, when a query is written, then a history entry is pushed', async () => {
      const { router, search } = await searchAt('/');
      const push = vi.spyOn(router, 'push');

      search.setQuery('fleabag');
      await settleWrite();

      expect(push).toHaveBeenCalledTimes(1);
    });

    it('given padding around the text, when it is written, then the query is trimmed', async () => {
      const { router, search } = await searchAt('/');

      search.setQuery('  fleabag  ');
      await settleWrite();

      expect(queryAt(router)).toEqual({ q: 'fleabag' });
    });
  });

  describe('when the search page refines the query', () => {
    it('given the search page, when the query changes, then the route follows', async () => {
      const { router, search } = await searchAt('/search?q=flea');

      search.setQuery('fleabag');
      await settleWrite();

      expect(queryAt(router)).toEqual({ q: 'fleabag' });
    });

    it('given a query pushed from home, when it is refined, then the entry is replaced', async () => {
      const { router, search } = await searchAt('/');
      search.setQuery('flea');
      await settleWrite();
      const replace = vi.spyOn(router, 'replace');

      search.setQuery('fleabag');
      await settleWrite();

      expect(replace).toHaveBeenCalledTimes(1);
    });

    it('given a query pushed from home, when it is refined, then no second entry is pushed', async () => {
      const { router, search } = await searchAt('/');
      search.setQuery('flea');
      await settleWrite();
      const push = vi.spyOn(router, 'push');

      search.setQuery('fleabag');
      await settleWrite();

      expect(push).not.toHaveBeenCalled();
    });
  });

  describe('when the query is emptied', () => {
    it('given the search page, when the text is blanked, then the home page opens', async () => {
      const { router, search } = await searchAt('/search?q=flea&genre=Drama');

      search.setQuery('   ');
      await settleWrite();

      expect(routeNameOf(router)).toBe('home');
    });

    it('given the search page, when the text is blanked, then the genre survives', async () => {
      const { router, search } = await searchAt('/search?q=flea&genre=Drama');

      search.setQuery('   ');
      await settleWrite();

      expect(queryAt(router)).toEqual({ genre: 'Drama' });
    });

    it('given the home page, when blank text is written, then the location is unchanged', async () => {
      const { router, search } = await searchAt('/?genre=Drama');

      search.setQuery('  ');
      await settleWrite();

      expect(router.currentRoute.value.fullPath).toBe('/?genre=Drama');
    });
  });

  describe('when the reader opens another page while typing', () => {
    it('given a pending write, when the bookmarked page opens, then the reader stays there', async () => {
      const { router, search } = await searchAt('/');
      search.setQuery('fleabag');

      await router.push('/bookmarked');
      await settleWrite();

      expect(routeNameOf(router)).toBe('bookmarked');
    });

    it('given a pending write, when the bookmarked page opens, then no navigation follows', async () => {
      const { router, search } = await searchAt('/');
      search.setQuery('fleabag');
      await router.push('/bookmarked');
      const push = vi.spyOn(router, 'push');

      await settleWrite();

      expect(push).not.toHaveBeenCalled();
    });
  });

  describe('when a navigation the field did not cause lands', () => {
    it('given text in the field, when another query is opened, then the field follows the URL', async () => {
      const { router, search } = await searchAt('/search?q=flea');
      search.setQuery('fleab');

      await router.push('/search?q=other');
      await nextTick();

      expect(search.draft.value).toBe('other');
    });
  });

  describe('when the scope is disposed', () => {
    it('given a pending write, when the host unmounts, then the URL never changes', async () => {
      const { router, search, unmount } = await searchAt('/');
      search.setQuery('fleabag');

      unmount();
      await settleWrite();

      expect(router.currentRoute.value.fullPath).toBe('/');
    });
  });
});
