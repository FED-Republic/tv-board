import { describe, expect, it } from 'vitest';
import { OTHER_GENRE, ROW_MIN_SHOWS, genreLayoutOf } from '@/domain/genre';
import { aShow } from '../components/builders';
import { showsListing } from './genre-harness';

const BELOW_BAR_COUNT = ROW_MIN_SHOWS - 1;
const OVER_BAR_COUNT = ROW_MIN_SHOWS + 2;
const FIRST_ID = 1;
const SECOND_CORPUS_FIRST_ID = 100;
const REPEATED_ID = FIRST_ID;

describe('genreLayoutOf', () => {
  describe('when a genre sits near the bar', () => {
    it('given one Drama show fewer than the bar, when the layout is read, then Drama is not in it', () => {
      const layout = genreLayoutOf(showsListing(['Drama'], BELOW_BAR_COUNT, FIRST_ID));

      expect(layout.has('Drama')).toBe(false);
    });

    it('given one Drama show fewer than the bar, when the layout is read, then it is empty', () => {
      const layout = genreLayoutOf(showsListing(['Drama'], BELOW_BAR_COUNT, FIRST_ID));

      expect(layout.size).toBe(0);
    });

    it('given exactly as many Drama shows as the bar, when the layout is read, then Drama is in it', () => {
      const layout = genreLayoutOf(showsListing(['Drama'], ROW_MIN_SHOWS, FIRST_ID));

      expect(layout.has('Drama')).toBe(true);
    });

    it('given more Drama shows than the bar, when the layout is read, then Drama is in it', () => {
      const layout = genreLayoutOf(showsListing(['Drama'], OVER_BAR_COUNT, FIRST_ID));

      expect(layout.has('Drama')).toBe(true);
    });
  });

  describe('when a show lists more than one genre', () => {
    it('given shows at the bar listing Drama and Crime, when the layout is read, then Drama is in it', () => {
      const layout = genreLayoutOf(showsListing(['Drama', 'Crime'], ROW_MIN_SHOWS, FIRST_ID));

      expect(layout.has('Drama')).toBe(true);
    });

    it('given shows at the bar listing Drama and Crime, when the layout is read, then Crime is in it', () => {
      const layout = genreLayoutOf(showsListing(['Drama', 'Crime'], ROW_MIN_SHOWS, FIRST_ID));

      expect(layout.has('Crime')).toBe(true);
    });

    it('given only Drama at the bar, when the layout is read, then Crime is left out', () => {
      const corpus = [
        ...showsListing(['Drama'], ROW_MIN_SHOWS, FIRST_ID),
        ...showsListing(['Crime'], BELOW_BAR_COUNT, SECOND_CORPUS_FIRST_ID),
      ];

      const layout = genreLayoutOf(corpus);

      expect([...layout]).toEqual(['Drama']);
    });
  });

  describe('when the same show arrives twice', () => {
    it('given one show short of the bar and a repeat of one id, when read, then Drama is not in it', () => {
      const corpus = [
        ...showsListing(['Drama'], BELOW_BAR_COUNT, FIRST_ID),
        aShow({ id: REPEATED_ID, name: 'Repeat', genres: ['Drama'] }),
      ];

      const layout = genreLayoutOf(corpus);

      expect(layout.has('Drama')).toBe(false);
    });

    it('given the bar reached by distinct shows and one repeat, when read, then Drama is in it', () => {
      const corpus = [
        ...showsListing(['Drama'], ROW_MIN_SHOWS, FIRST_ID),
        aShow({ id: REPEATED_ID, name: 'Repeat', genres: ['Drama'] }),
      ];

      const layout = genreLayoutOf(corpus);

      expect(layout.has('Drama')).toBe(true);
    });
  });

  describe('when one show lists the same genre twice', () => {
    it('given shows short of the bar listing Drama twice, when read, then Drama is not in it', () => {
      const layout = genreLayoutOf(showsListing(['Drama', 'Drama'], BELOW_BAR_COUNT, FIRST_ID));

      expect(layout.has('Drama')).toBe(false);
    });

    it('given shows at the bar listing Drama twice, when read, then Drama is in it', () => {
      const layout = genreLayoutOf(showsListing(['Drama', 'Drama'], ROW_MIN_SHOWS, FIRST_ID));

      expect(layout.has('Drama')).toBe(true);
    });
  });

  describe('when the genres are unknown or missing', () => {
    it('given shows at the bar listing "Talk Show", when the layout is read, then it is empty', () => {
      const layout = genreLayoutOf(showsListing(['Talk Show'], ROW_MIN_SHOWS, FIRST_ID));

      expect(layout.size).toBe(0);
    });

    it('given shows at the bar with no genres, when the layout is read, then Other is not in it', () => {
      const layout = genreLayoutOf(showsListing([], ROW_MIN_SHOWS, FIRST_ID));

      expect(layout.has(OTHER_GENRE)).toBe(false);
    });

    it('given shows at the bar listing "Other", when the layout is read, then Other is not in it', () => {
      const layout = genreLayoutOf(showsListing([OTHER_GENRE], ROW_MIN_SHOWS, FIRST_ID));

      expect(layout.has(OTHER_GENRE)).toBe(false);
    });

    it('given shows at the bar listing Drama and "Talk Show", when read, then only Drama is in it', () => {
      const layout = genreLayoutOf(showsListing(['Drama', 'Talk Show'], ROW_MIN_SHOWS, FIRST_ID));

      expect([...layout]).toEqual(['Drama']);
    });
  });

  describe('when there is no corpus', () => {
    it('given no shows, when the layout is read, then it is empty', () => {
      expect(genreLayoutOf([]).size).toBe(0);
    });
  });
});
