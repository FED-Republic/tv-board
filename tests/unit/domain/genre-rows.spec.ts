import { describe, expect, it } from 'vitest';
import { OTHER_GENRE, ROW_SHOW_LIMIT, groupByGenre } from '@/domain/genre';
import { aShow } from '../components/builders';
import { genresOf, layoutOf, showNamesIn, showTotalIn, showsRatedDown } from './genre-harness';

const SHOWS_OVER_LIMIT = 30;
const SHORT_ROW_LENGTH = 3;
const FIRST_COMEDY_ID = 500;

describe('groupByGenre', () => {
  describe('when the shows carry genres with a row', () => {
    it('given a Comedy and a Drama show, when grouped, then the rows follow the GENRES order', () => {
      const rows = groupByGenre(
        [aShow({ id: 1, genres: ['Comedy'] }), aShow({ id: 2, genres: ['Drama'] })],
        layoutOf(['Drama', 'Comedy']),
      );

      expect(genresOf(rows)).toEqual(['Drama', 'Comedy']);
    });

    it('given a show with two genres, when grouped, then it appears in both rows', () => {
      const show = aShow({ id: 1, name: 'Both', genres: ['Drama', 'Crime'] });

      const rows = groupByGenre([show], layoutOf(['Drama', 'Crime']));

      expect(showNamesIn(rows, 'Drama')).toEqual(['Both']);
      expect(showNamesIn(rows, 'Crime')).toEqual(['Both']);
    });

    it('given several shows in one genre, when grouped, then the row is sorted by rating', () => {
      const rows = groupByGenre(
        [
          aShow({ id: 1, name: 'Middle', genres: ['Drama'], rating: 8 }),
          aShow({ id: 2, name: 'Unrated', genres: ['Drama'], rating: null }),
          aShow({ id: 3, name: 'Best', genres: ['Drama'], rating: 9.3 }),
        ],
        layoutOf(['Drama']),
      );

      expect(showNamesIn(rows, 'Drama')).toEqual(['Best', 'Middle', 'Unrated']);
    });
  });

  describe('when a genre is unknown or missing', () => {
    it('given a show with the genre "Talk Show", when grouped, then it lands in Other', () => {
      const rows = groupByGenre(
        [aShow({ id: 1, name: 'Chat', genres: ['Talk Show'] })],
        layoutOf(['Drama']),
      );

      expect(showNamesIn(rows, OTHER_GENRE)).toEqual(['Chat']);
    });

    it('given a show with the genre "Talk Show", when grouped, then that genre gets no row', () => {
      const rows = groupByGenre([aShow({ id: 1, genres: ['Talk Show'] })], layoutOf(['Drama']));

      expect(genresOf(rows)).toEqual([OTHER_GENRE]);
    });

    it('given a known genre and an unknown one, when grouped, then the unknown one leaves it out of Other', () => {
      // `Other` holds genres too small for a row; an unknown string is no genre this build can name.
      const show = aShow({ id: 1, name: 'Mixed', genres: ['Drama', 'Talk Show'] });

      const rows = groupByGenre([show], layoutOf(['Drama']));

      expect(showNamesIn(rows, 'Drama')).toEqual(['Mixed']);
      expect(showNamesIn(rows, OTHER_GENRE)).toEqual([]);
    });

    it('given a known genre and an unknown one, when grouped, then the unknown one adds no row', () => {
      // The Drama row represents the show in full, so a second row would show the reader nothing.
      const show = aShow({ id: 1, name: 'Mixed', genres: ['Drama', 'Talk Show'] });

      const rows = groupByGenre([show], layoutOf(['Drama']));

      expect(genresOf(rows)).toEqual(['Drama']);
    });

    it('given a show with no genres, when grouped, then it lands in Other', () => {
      const rows = groupByGenre(
        [aShow({ id: 1, name: 'Ungrouped', genres: [] })],
        layoutOf(['Drama']),
      );

      expect(showNamesIn(rows, OTHER_GENRE)).toEqual(['Ungrouped']);
    });

    it('given an Adult show and an unknown one, when grouped, then Other comes last', () => {
      const rows = groupByGenre(
        [aShow({ id: 1, genres: ['Talk Show'] }), aShow({ id: 2, genres: ['Adult'] })],
        layoutOf(['Adult']),
      );

      expect(genresOf(rows)).toEqual(['Adult', OTHER_GENRE]);
    });
  });

  describe('when the same show arrives twice', () => {
    it('given two shows with the same id, when grouped, then the first one wins', () => {
      const rows = groupByGenre(
        [
          aShow({ id: 1, name: 'First', genres: ['Drama'], rating: 6 }),
          aShow({ id: 1, name: 'Second', genres: ['Drama'], rating: 9 }),
        ],
        layoutOf(['Drama']),
      );

      expect(showNamesIn(rows, 'Drama')).toEqual(['First']);
    });

    it('given a duplicate id under another genre, when grouped, then that genre gets no row', () => {
      const rows = groupByGenre(
        [
          aShow({ id: 1, name: 'First', genres: ['Drama'] }),
          aShow({ id: 1, name: 'Second', genres: ['Comedy'] }),
        ],
        layoutOf(['Drama', 'Comedy']),
      );

      expect(genresOf(rows)).toEqual(['Drama']);
    });
  });

  describe('when there is nothing to group', () => {
    it('given no shows, when grouped, then the result is empty', () => {
      expect(groupByGenre([], layoutOf(['Drama']))).toEqual([]);
    });
  });
});

describe('groupByGenre with a limit', () => {
  describe('when a row is longer than the limit', () => {
    it('given 30 Drama shows and a limit of 25, when grouped, then the row holds the 25 best rated', () => {
      const shows = showsRatedDown('Drama', SHOWS_OVER_LIMIT, 1);

      const rows = groupByGenre(shows, layoutOf(['Drama']), ROW_SHOW_LIMIT);
      const names = showNamesIn(rows, 'Drama');

      expect(names).toHaveLength(ROW_SHOW_LIMIT);
      expect(names[0]).toBe('Drama 1');
      expect(names.at(-1)).toBe('Drama 25');
    });

    it('given 30 Drama shows and a limit of 25, when grouped, then the lower rated ones are dropped', () => {
      const shows = showsRatedDown('Drama', SHOWS_OVER_LIMIT, 1);

      const names = showNamesIn(groupByGenre(shows, layoutOf(['Drama']), ROW_SHOW_LIMIT), 'Drama');

      expect(names).not.toContain('Drama 26');
      expect(names).not.toContain('Drama 30');
    });

    it('given two genres over the limit, when grouped, then each row is trimmed on its own', () => {
      const shows = [
        ...showsRatedDown('Drama', SHOWS_OVER_LIMIT, 1),
        ...showsRatedDown('Comedy', SHOWS_OVER_LIMIT, FIRST_COMEDY_ID),
      ];

      const rows = groupByGenre(shows, layoutOf(['Drama', 'Comedy']), ROW_SHOW_LIMIT);

      expect(showNamesIn(rows, 'Drama')).toHaveLength(ROW_SHOW_LIMIT);
      expect(showNamesIn(rows, 'Comedy')).toHaveLength(ROW_SHOW_LIMIT);
    });
  });

  describe('when a row is shorter than the limit', () => {
    it('given three Drama shows and a limit of 25, when grouped, then the row keeps them all', () => {
      const shows = showsRatedDown('Drama', SHORT_ROW_LENGTH, 1);

      const rows = groupByGenre(shows, layoutOf(['Drama']), ROW_SHOW_LIMIT);

      expect(showNamesIn(rows, 'Drama')).toEqual(['Drama 1', 'Drama 2', 'Drama 3']);
    });
  });

  describe('when no limit is given', () => {
    it('given 30 Drama shows and no limit, when grouped, then the row keeps every show', () => {
      const shows = showsRatedDown('Drama', SHOWS_OVER_LIMIT, 1);

      const rows = groupByGenre(shows, layoutOf(['Drama']));

      expect(showNamesIn(rows, 'Drama')).toHaveLength(SHOWS_OVER_LIMIT);
    });
  });
});

describe('groupByGenre row totals', () => {
  describe('when the row fits under the limit', () => {
    it('given three Drama shows, when grouped, then the total counts them all', () => {
      const shows = showsRatedDown('Drama', SHORT_ROW_LENGTH, 1);

      const rows = groupByGenre(shows, layoutOf(['Drama']), ROW_SHOW_LIMIT);

      expect(showTotalIn(rows, 'Drama')).toBe(SHORT_ROW_LENGTH);
    });
  });

  describe('when the limit cut the row short', () => {
    it('given 30 Drama shows and a limit of 25, when grouped, then the total counts every loaded show', () => {
      const shows = showsRatedDown('Drama', SHOWS_OVER_LIMIT, 1);

      const rows = groupByGenre(shows, layoutOf(['Drama']), ROW_SHOW_LIMIT);

      expect(showTotalIn(rows, 'Drama')).toBe(SHOWS_OVER_LIMIT);
    });

    it('given 30 Drama shows and a limit of 25, when grouped, then the total is larger than the row', () => {
      const shows = showsRatedDown('Drama', SHOWS_OVER_LIMIT, 1);

      const rows = groupByGenre(shows, layoutOf(['Drama']), ROW_SHOW_LIMIT);

      expect(showTotalIn(rows, 'Drama')).toBeGreaterThan(showNamesIn(rows, 'Drama').length);
    });
  });

  describe('when a show belongs to more than one row', () => {
    it('given a Drama and Crime show, when grouped, then each row counts it once', () => {
      const rows = groupByGenre(
        [aShow({ id: 1, genres: ['Drama', 'Crime'] })],
        layoutOf(['Drama', 'Crime']),
      );

      expect(showTotalIn(rows, 'Drama')).toBe(1);
      expect(showTotalIn(rows, 'Crime')).toBe(1);
    });

    it('given a show with no known genre, when grouped, then the Other row counts it', () => {
      const rows = groupByGenre([aShow({ id: 1, genres: ['Talk Show'] })], layoutOf(['Drama']));

      expect(showTotalIn(rows, OTHER_GENRE)).toBe(1);
    });
  });

  describe('when the same show arrives twice', () => {
    it('given two shows with the same id, when grouped, then the total counts it once', () => {
      const rows = groupByGenre(
        [
          aShow({ id: 1, name: 'First', genres: ['Drama'] }),
          aShow({ id: 1, name: 'Second', genres: ['Drama'] }),
        ],
        layoutOf(['Drama']),
      );

      expect(showTotalIn(rows, 'Drama')).toBe(1);
    });
  });
});
