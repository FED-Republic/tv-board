import { describe, expect, it } from 'vitest';
import type { Genre } from '@/domain/genre';
import {
  GENRES,
  OTHER_GENRE,
  PLACEHOLDER_ROW_MAX,
  orderGenres,
  placeholderGenres,
} from '@/domain/genre';

const ANONYMOUS_PLACEHOLDERS = [null, null, null];
/** Every genre the app knows: the 28 row genres plus `Other`. */
const EVERY_GENRE: readonly Genre[] = [...GENRES, OTHER_GENRE];
const SIX_GENRES: readonly Genre[] = EVERY_GENRE.slice(0, PLACEHOLDER_ROW_MAX);

describe('orderGenres', () => {
  describe('when the values are genres', () => {
    it('given a shuffled list, when ordered, then it follows the row order', () => {
      expect(orderGenres(['Crime', 'Comedy', 'Adult', 'Drama'])).toEqual([
        'Drama',
        'Comedy',
        'Crime',
        'Adult',
      ]);
    });

    it('given the same genre twice, when ordered, then it appears once', () => {
      expect(orderGenres(['Drama', 'Comedy', 'Drama'])).toEqual(['Drama', 'Comedy']);
    });

    it('given Other first, when ordered, then Other comes last', () => {
      expect(orderGenres([OTHER_GENRE, 'Comedy'])).toEqual(['Comedy', OTHER_GENRE]);
    });
  });

  describe('when a value is not a genre', () => {
    it('given an unknown name, when ordered, then it is dropped', () => {
      expect(orderGenres(['Talk Show', 'Drama'])).toEqual(['Drama']);
    });

    it('given values that are not strings, when ordered, then they are dropped', () => {
      expect(orderGenres([42, null, undefined, ['Drama'], 'Drama'])).toEqual(['Drama']);
    });

    it('given the lowercase "drama", when ordered, then it is dropped', () => {
      expect(orderGenres(['drama'])).toEqual([]);
    });
  });

  describe('when the value is not a list', () => {
    it('given a number, when ordered, then the result is empty', () => {
      expect(orderGenres(42)).toEqual([]);
    });

    it('given a single genre name, when ordered, then the result is empty', () => {
      expect(orderGenres('Drama')).toEqual([]);
    });

    it('given null, when ordered, then the result is empty', () => {
      expect(orderGenres(null)).toEqual([]);
    });

    it('given an object, when ordered, then the result is empty', () => {
      expect(orderGenres({})).toEqual([]);
    });
  });

  describe('when there is nothing to order', () => {
    it('given no values, when ordered, then the result is empty', () => {
      expect(orderGenres([])).toEqual([]);
    });
  });
});

describe('placeholderGenres', () => {
  describe('when a genre filter is set', () => {
    it('given remembered genres and a Comedy filter, when asked, then only Comedy stands in', () => {
      expect(placeholderGenres(['Drama', 'Comedy'], 'Comedy')).toEqual(['Comedy']);
    });

    it('given no remembered genre and a Comedy filter, when asked, then only Comedy stands in', () => {
      expect(placeholderGenres([], 'Comedy')).toEqual(['Comedy']);
    });
  });

  describe('when no genre filter is set', () => {
    it('given remembered genres, when asked, then they stand in unchanged', () => {
      expect(placeholderGenres(['Drama', 'Comedy'], null)).toEqual(['Drama', 'Comedy']);
    });

    it('given no remembered genre, when asked, then three anonymous rows stand in', () => {
      expect(placeholderGenres([], null)).toEqual(ANONYMOUS_PLACEHOLDERS);
    });
  });

  describe('when more genres are remembered than the cap', () => {
    it('given every genre, when asked, then only the first six stand in', () => {
      expect(placeholderGenres(EVERY_GENRE, null)).toEqual(SIX_GENRES);
    });

    it('given exactly six genres, when asked, then they all stand in', () => {
      expect(placeholderGenres(SIX_GENRES, null)).toEqual(SIX_GENRES);
    });
  });
});
