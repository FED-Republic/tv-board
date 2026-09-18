import { beforeEach, describe, expect, it } from 'vitest';
import type { Router, RouterScrollBehavior } from 'vue-router';
import { createMemoryHistory } from 'vue-router';
import { createAppRouter, routes } from '@/router';
import { pageTitle } from '@/router/page-title';

type ScrollBehaviorArgs = Parameters<RouterScrollBehavior>;
type VisitedLocation = ScrollBehaviorArgs[0];
type SavedPosition = ScrollBehaviorArgs[2];
type ScrollTarget = ReturnType<RouterScrollBehavior> | undefined;

const UNKNOWN_PATH = '/there/is/no/such/page';
/** Where the reader had scrolled the page they are coming back to. */
const SAVED_POSITION = { left: 0, top: 240 };

let router: Router;

const nameOf = (path: string): string => String(router.resolve(path).name);

const propsOf = (path: string): unknown => router.resolve(path).matched[0]?.props['default'];

const titlesOf = (): readonly string[] => routes.map((route) => route.meta.title);

const isBlank = (title: string): boolean => title.trim() === '';

async function titleAfterVisiting(path: string): Promise<string> {
  await router.push(path);

  return document.title;
}

/** A resolved location as a navigation sees it; only an unnamed route has a `null` name. */
function visited(path: string): VisitedLocation {
  const resolved = router.resolve(path);

  return { ...resolved, name: resolved.name ?? undefined };
}

/** Where a navigation from `from` to `to` leaves the page, with no saved position by default. */
function scrollTargetFrom(from: string, to: string, saved: SavedPosition = null): ScrollTarget {
  return router.options.scrollBehavior?.(visited(to), visited(from), saved);
}

beforeEach(() => {
  router = createAppRouter(createMemoryHistory());
});

describe('routes', () => {
  describe('when the route table is declared', () => {
    it('given every record, when read, then each one carries a title', () => {
      expect(titlesOf().filter(isBlank)).toEqual([]);
    });
  });
});

describe('createAppRouter', () => {
  describe('when a known path is resolved', () => {
    it('given /, when resolved, then it is the home route', () => {
      expect(nameOf('/')).toBe('home');
    });

    it('given /shows/169, when resolved, then it is the show route', () => {
      expect(nameOf('/shows/169')).toBe('show');
    });

    it('given /shows/169, when resolved, then the id is passed as a prop', () => {
      expect(router.resolve('/shows/169').params['id']).toBe('169');
    });

    it('given /search, when resolved, then it is the search route', () => {
      expect(nameOf('/search')).toBe('search');
    });

    it('given /bookmarked, when resolved, then it is the bookmarked route', () => {
      expect(nameOf('/bookmarked')).toBe('bookmarked');
    });

    it('given /bookmarked, when resolved, then the page is told which kind to show', () => {
      expect(propsOf('/bookmarked')).toEqual({ kind: 'bookmarks' });
    });

    it('given /liked, when resolved, then the page is told which kind to show', () => {
      expect(propsOf('/liked')).toEqual({ kind: 'likes' });
    });
  });

  describe('when an unknown path is resolved', () => {
    it('given a path no record matches, when resolved, then it is the not-found route', () => {
      expect(nameOf(UNKNOWN_PATH)).toBe('not-found');
    });
  });

  describe('when a navigation decides where to scroll', () => {
    it('given a query change on the same path, when the target is chosen, then the position is kept', () => {
      expect(scrollTargetFrom('/', '/?genre=Drama')).toBe(false);
    });

    it('given two different paths, when the target is chosen, then the page goes to the top', () => {
      expect(scrollTargetFrom('/', '/search')).toEqual({ top: 0 });
    });

    it('given a position the reader left behind, when they come back, then it is restored without a slide', () => {
      expect(scrollTargetFrom('/shows/169', '/', SAVED_POSITION)).toEqual({
        ...SAVED_POSITION,
        behavior: 'instant',
      });
    });
  });

  describe('when a navigation finishes', () => {
    it('given /search, when visited, then the document title names the page', async () => {
      expect(await titleAfterVisiting('/search')).toBe(pageTitle('Search'));
    });

    it('given /bookmarked, when visited, then the document title names the page', async () => {
      expect(await titleAfterVisiting('/bookmarked')).toBe(pageTitle('Bookmarked shows'));
    });

    it('given an unknown path, when visited, then the document title says so', async () => {
      expect(await titleAfterVisiting(UNKNOWN_PATH)).toBe(pageTitle('Page not found'));
    });
  });
});
