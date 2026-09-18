import { describe, expect, it } from 'vitest';
import { OTHER_GENRE, ROW_MIN_SHOWS, groupByGenre } from '@/domain/genre';
import type { Show } from '@/domain/show';
import { aShow } from '../components/builders';
import { genresOf, layoutOf, showNamesIn, showTotalIn, showsRatedDown } from './genre-harness';

const EMPTY_LAYOUT = layoutOf([]);
const BELOW_BAR_COUNT = ROW_MIN_SHOWS - 1;
const OTHER_ROW_LENGTH = 3;
const TIGHT_LIMIT = 2;
const FIRST_ID = 1;
/** Past the ids the hand-written shows take, so a mixed corpus holds distinct shows. */
const FIRST_DIY_ID = 10;

const handyDrama = (): Show => aShow({ id: 1, name: 'Handy', genres: ['Drama', 'DIY'] });

/** TVmaze sends a plain array of strings, so the same genre can arrive twice in one show. */
const doubledDrama = (): Show => aShow({ id: 2, name: 'Doubled', genres: ['Drama', 'Drama'] });

describe('groupByGenre under a genre layout', () => {
  describe('when a listed genre has no row', () => {
    it('given a Drama and DIY show under a Drama layout, when grouped, then DIY gets no row', () => {
      const rows = groupByGenre([handyDrama()], layoutOf(['Drama']));

      expect(genresOf(rows)).toEqual(['Drama', OTHER_GENRE]);
    });

    it('given a Drama and DIY show under a Drama layout, when grouped, then it is in the Drama row', () => {
      const rows = groupByGenre([handyDrama()], layoutOf(['Drama']));

      expect(showNamesIn(rows, 'Drama')).toEqual(['Handy']);
    });

    it('given a Drama and DIY show under a Drama layout, when grouped, then it is in Other as well', () => {
      const rows = groupByGenre([handyDrama()], layoutOf(['Drama']));

      expect(showNamesIn(rows, OTHER_GENRE)).toEqual(['Handy']);
    });
  });

  describe('when every listed genre has a row', () => {
    it('given a Drama and DIY show under a layout with both, when grouped, then it is in the DIY row', () => {
      const rows = groupByGenre([handyDrama()], layoutOf(['Drama', 'DIY']));

      expect(showNamesIn(rows, 'DIY')).toEqual(['Handy']);
    });

    it('given a Drama and DIY show under a layout with both, when grouped, then there is no Other row', () => {
      const rows = groupByGenre([handyDrama()], layoutOf(['Drama', 'DIY']));

      expect(genresOf(rows)).toEqual(['Drama', 'DIY']);
    });

    it('given a Drama show under a Drama layout, when grouped, then Other is left out', () => {
      const rows = groupByGenre([aShow({ id: 1, genres: ['Drama'] })], layoutOf(['Drama']));

      expect(genresOf(rows)).toEqual(['Drama']);
    });
  });

  describe('when the layout is empty', () => {
    it('given three Drama shows and an empty layout, when grouped, then Other is the only row', () => {
      const shows = showsRatedDown('Drama', OTHER_ROW_LENGTH, FIRST_ID);

      const rows = groupByGenre(shows, EMPTY_LAYOUT);

      expect(genresOf(rows)).toEqual([OTHER_GENRE]);
    });

    it('given three Drama shows and an empty layout, when grouped, then Other holds all three', () => {
      const shows = showsRatedDown('Drama', OTHER_ROW_LENGTH, FIRST_ID);

      const rows = groupByGenre(shows, EMPTY_LAYOUT);

      expect(showNamesIn(rows, OTHER_GENRE)).toEqual(['Drama 1', 'Drama 2', 'Drama 3']);
    });

    it('given one show under the bar and an empty layout, when grouped, then Other still renders', () => {
      const rows = groupByGenre([aShow({ id: 1, name: 'Alone', genres: ['Drama'] })], EMPTY_LAYOUT);

      expect(showNamesIn(rows, OTHER_GENRE)).toEqual(['Alone']);
    });

    it('given no shows and an empty layout, when grouped, then there is no Other row', () => {
      expect(groupByGenre([], EMPTY_LAYOUT)).toEqual([]);
    });
  });

  describe('when the layout names a genre no show carries', () => {
    it('given only Comedy shows under a Drama and Comedy layout, when grouped, then Drama gets no row', () => {
      const rows = groupByGenre(
        [aShow({ id: 1, genres: ['Comedy'] })],
        layoutOf(['Drama', 'Comedy']),
      );

      expect(genresOf(rows)).toEqual(['Comedy']);
    });
  });

  describe('when the rows are ordered', () => {
    it('given an Adult, a Drama and a below-bar show, when grouped, then Other comes last', () => {
      const shows = [
        aShow({ id: 1, genres: ['Adult'] }),
        aShow({ id: 2, genres: ['Drama'] }),
        aShow({ id: 3, genres: ['DIY'] }),
      ];

      const rows = groupByGenre(shows, layoutOf(['Drama', 'Adult']));

      expect(genresOf(rows)).toEqual(['Drama', 'Adult', OTHER_GENRE]);
    });
  });

  describe('when the limit cuts the Other row', () => {
    it('given three below-bar shows and a limit of two, when grouped, then Other holds the best rated', () => {
      const shows = showsRatedDown('DIY', OTHER_ROW_LENGTH, FIRST_ID);

      const rows = groupByGenre(shows, EMPTY_LAYOUT, TIGHT_LIMIT);

      expect(showNamesIn(rows, OTHER_GENRE)).toEqual(['DIY 1', 'DIY 2']);
    });

    it('given three below-bar shows and a limit of two, when grouped, then the Other total counts three', () => {
      const shows = showsRatedDown('DIY', OTHER_ROW_LENGTH, FIRST_ID);

      const rows = groupByGenre(shows, EMPTY_LAYOUT, TIGHT_LIMIT);

      expect(showTotalIn(rows, OTHER_GENRE)).toBe(OTHER_ROW_LENGTH);
    });
  });

  describe('when a show lists two genres without a row', () => {
    it('given a DIY and Food show under an empty layout, when grouped, then Other counts it once', () => {
      const rows = groupByGenre([aShow({ id: 1, genres: ['DIY', 'Food'] })], EMPTY_LAYOUT);

      expect(showTotalIn(rows, OTHER_GENRE)).toBe(1);
    });

    it('given a DIY and Food show under an empty layout, when grouped, then Other renders it once', () => {
      const rows = groupByGenre(
        [aShow({ id: 1, name: 'Twice', genres: ['DIY', 'Food'] })],
        EMPTY_LAYOUT,
      );

      expect(showNamesIn(rows, OTHER_GENRE)).toEqual(['Twice']);
    });
  });

  describe('when a show lists the same genre twice', () => {
    it('given a show listing Drama twice, when grouped, then the Drama row renders it once', () => {
      const rows = groupByGenre([doubledDrama()], layoutOf(['Drama']));

      expect(showNamesIn(rows, 'Drama')).toEqual(['Doubled']);
    });

    it('given a show listing Drama twice, when grouped, then the Drama total counts it once', () => {
      const rows = groupByGenre([doubledDrama()], layoutOf(['Drama']));

      expect(showTotalIn(rows, 'Drama')).toBe(1);
    });
  });

  describe('when a promoted genre sits beside one without a row', () => {
    it('given four DIY shows and a Drama one, when grouped under a Drama layout, then the Drama row keeps only Drama', () => {
      const shows = [
        aShow({ id: 1, name: 'Drama one', genres: ['Drama'] }),
        ...showsRatedDown('DIY', BELOW_BAR_COUNT, FIRST_DIY_ID),
      ];

      const rows = groupByGenre(shows, layoutOf(['Drama']));

      expect(showNamesIn(rows, 'Drama')).toEqual(['Drama one']);
    });

    it('given four DIY shows and a Drama one, when grouped under a Drama layout, then the Other total counts four', () => {
      const shows = [
        aShow({ id: 1, name: 'Drama one', genres: ['Drama'] }),
        ...showsRatedDown('DIY', BELOW_BAR_COUNT, FIRST_DIY_ID),
      ];

      const rows = groupByGenre(shows, layoutOf(['Drama']));

      expect(showTotalIn(rows, OTHER_GENRE)).toBe(BELOW_BAR_COUNT);
    });
  });
});
