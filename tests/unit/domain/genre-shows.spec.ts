import { describe, expect, it } from 'vitest';
import { OTHER_GENRE, showsInGenre } from '@/domain/genre';
import { aShow } from '../components/builders';
import { idsOf, layoutOf, namesOf, showsRatedDown } from './genre-harness';

const SHOWS_OVER_A_ROW = 40;
const TIED_RATING = 8;
const HIGHER_ID = 9;
const LOWER_ID = 4;

/** Every genre these corpora use has earned a row, so only the `Other` rule can differ. */
const PROMOTED_LAYOUT = layoutOf(['Drama', 'Comedy', 'Crime']);

describe('showsInGenre', () => {
  describe('when the shows carry known genres', () => {
    it('given a Drama and a Comedy show, when Drama is read, then only the Drama show is there', () => {
      const shows = [
        aShow({ id: 1, name: 'Sad', genres: ['Drama'] }),
        aShow({ id: 2, name: 'Funny', genres: ['Comedy'] }),
      ];

      expect(namesOf(showsInGenre(shows, 'Drama', PROMOTED_LAYOUT))).toEqual(['Sad']);
    });

    it('given a show with two genres, when the first is read, then the show is there', () => {
      const shows = [aShow({ id: 1, name: 'Both', genres: ['Drama', 'Crime'] })];

      expect(namesOf(showsInGenre(shows, 'Drama', PROMOTED_LAYOUT))).toEqual(['Both']);
    });

    it('given a show with two genres, when the second is read, then the show is there too', () => {
      const shows = [aShow({ id: 1, name: 'Both', genres: ['Drama', 'Crime'] })];

      expect(namesOf(showsInGenre(shows, 'Crime', PROMOTED_LAYOUT))).toEqual(['Both']);
    });
  });

  describe('when nothing matches', () => {
    it('given no shows, when a genre is read, then the result is empty', () => {
      expect(showsInGenre([], 'Drama', PROMOTED_LAYOUT)).toEqual([]);
    });

    it('given only Comedy shows, when Drama is read, then the result is empty', () => {
      const shows = [aShow({ id: 1, genres: ['Comedy'] }), aShow({ id: 2, genres: ['Comedy'] })];

      expect(showsInGenre(shows, 'Drama', PROMOTED_LAYOUT)).toEqual([]);
    });
  });

  describe('when a genre is unknown or missing', () => {
    it('given a show with the genre "Talk Show", when Other is read, then it is there', () => {
      const shows = [aShow({ id: 1, name: 'Chat', genres: ['Talk Show'] })];

      expect(namesOf(showsInGenre(shows, OTHER_GENRE, PROMOTED_LAYOUT))).toEqual(['Chat']);
    });

    it('given a show with no genres, when Other is read, then it is there', () => {
      const shows = [aShow({ id: 1, name: 'Ungrouped', genres: [] })];

      expect(namesOf(showsInGenre(shows, OTHER_GENRE, PROMOTED_LAYOUT))).toEqual(['Ungrouped']);
    });

    it('given a known genre and an unknown one, when Other is read, then the unknown one leaves it out', () => {
      // `Other` holds genres too small for a row; an unknown string is no genre this build can name.
      const shows = [aShow({ id: 1, name: 'Mixed', genres: ['Drama', 'Talk Show'] })];

      expect(showsInGenre(shows, OTHER_GENRE, PROMOTED_LAYOUT)).toEqual([]);
    });
  });

  describe('when the genre holds more shows than a row', () => {
    it('given 40 Drama shows, when the genre is read, then every one of them is returned', () => {
      const shows = showsRatedDown('Drama', SHOWS_OVER_A_ROW, 1);

      expect(showsInGenre(shows, 'Drama', PROMOTED_LAYOUT)).toHaveLength(SHOWS_OVER_A_ROW);
    });

    it('given 40 Drama shows, when the genre is read, then the worst rated comes last', () => {
      const shows = showsRatedDown('Drama', SHOWS_OVER_A_ROW, 1);

      expect(namesOf(showsInGenre(shows, 'Drama', PROMOTED_LAYOUT)).at(-1)).toBe('Drama 40');
    });
  });

  describe('when the shows are ordered', () => {
    it('given a rated, an unrated and a better rated show, when read, then the unrated one is last', () => {
      const shows = [
        aShow({ id: 1, name: 'Middle', genres: ['Drama'], rating: 8 }),
        aShow({ id: 2, name: 'Unrated', genres: ['Drama'], rating: null }),
        aShow({ id: 3, name: 'Best', genres: ['Drama'], rating: 9.3 }),
      ];

      expect(namesOf(showsInGenre(shows, 'Drama', PROMOTED_LAYOUT))).toEqual([
        'Best',
        'Middle',
        'Unrated',
      ]);
    });

    it('given two shows with the same rating, when read, then the lower id comes first', () => {
      const shows = [
        aShow({ id: HIGHER_ID, genres: ['Drama'], rating: TIED_RATING }),
        aShow({ id: LOWER_ID, genres: ['Drama'], rating: TIED_RATING }),
      ];

      expect(idsOf(showsInGenre(shows, 'Drama', PROMOTED_LAYOUT))).toEqual([LOWER_ID, HIGHER_ID]);
    });
  });

  describe('when the same show arrives twice', () => {
    it('given two shows with the same id, when the genre is read, then it appears once', () => {
      const shows = [
        aShow({ id: 1, name: 'First', genres: ['Drama'], rating: 6 }),
        aShow({ id: 1, name: 'Second', genres: ['Drama'], rating: 9 }),
      ];

      expect(namesOf(showsInGenre(shows, 'Drama', PROMOTED_LAYOUT))).toEqual(['First']);
    });

    it('given a duplicate id under another genre, when that genre is read, then it is empty', () => {
      const shows = [
        aShow({ id: 1, name: 'First', genres: ['Drama'] }),
        aShow({ id: 1, name: 'Second', genres: ['Comedy'] }),
      ];

      expect(showsInGenre(shows, 'Comedy', PROMOTED_LAYOUT)).toEqual([]);
    });
  });
});
