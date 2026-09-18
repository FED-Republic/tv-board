import { describe, expect, it } from 'vitest';
import { pageTitle } from '@/router/page-title';

describe('pageTitle', () => {
  describe('when a page names itself', () => {
    it('given a route title, when the title is built, then the app name comes last', () => {
      expect(pageTitle('Search')).toBe('Search · TV Board');
    });

    it('given a show name, when the title is built, then the show comes first', () => {
      expect(pageTitle('Breaking Bad')).toBe('Breaking Bad · TV Board');
    });
  });
});
