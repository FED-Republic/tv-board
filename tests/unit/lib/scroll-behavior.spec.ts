import { describe, expect, it, vi } from 'vitest';
import { preferredScrollBehavior } from '@/lib/scroll-behavior';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** The queries `preferredScrollBehavior` asked for, in order. */
const askedQueries: string[] = [];

/** A `matchMedia` that answers `matches` to every query and records what was asked. */
function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => {
    askedQueries.push(query);

    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    };
  });
}

describe('preferredScrollBehavior', () => {
  describe('when the reader asked for reduced motion', () => {
    it('given a matching reduced-motion query, when asked, then scrolling jumps', () => {
      stubMatchMedia(true);

      expect(preferredScrollBehavior()).toBe('auto');
    });
  });

  describe('when the reader did not ask for reduced motion', () => {
    it('given a query that does not match, when asked, then scrolling is smooth', () => {
      stubMatchMedia(false);

      expect(preferredScrollBehavior()).toBe('smooth');
    });

    it('given the jsdom default, when asked, then scrolling is smooth', () => {
      expect(preferredScrollBehavior()).toBe('smooth');
    });
  });

  describe('when the media query is read', () => {
    it('given a call, when the query is inspected, then it asks for reduced motion', () => {
      stubMatchMedia(false);
      askedQueries.length = 0;

      preferredScrollBehavior();

      expect(askedQueries).toEqual([REDUCED_MOTION_QUERY]);
    });
  });
});
