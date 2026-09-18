import { describe, expect, it } from 'vitest';
import {
  OTHER_GENRE,
  ROW_MIN_SHOWS,
  ROW_SHOW_LIMIT,
  genreLayoutOf,
  groupByGenre,
  showsInGenre,
} from '@/domain/genre';
import type { Show } from '@/domain/show';
import { aShow } from '../components/builders';
import { layoutOf, namesOf, showNamesIn, showsRatedDown } from './genre-harness';

const EMPTY_LAYOUT = layoutOf([]);
const BELOW_BAR_COUNT = ROW_MIN_SHOWS - 1;
const SHOWS_OVER_A_ROW = 30;
const FIRST_ID = 1;
const FIRST_FOOD_ID = 100;

const handyDrama = (): Show => aShow({ id: 1, name: 'Handy', genres: ['Drama', 'DIY'] });

describe('showsInGenre under a genre layout', () => {
  describe('when the genre has no row', () => {
    it('given four DIY shows, when DIY is read, then the grid still lists every one of them', () => {
      const corpus = showsRatedDown('DIY', BELOW_BAR_COUNT, FIRST_ID);

      const grid = showsInGenre(corpus, 'DIY', genreLayoutOf(corpus));

      expect(grid).toHaveLength(BELOW_BAR_COUNT);
    });

    it('given four DIY shows, when Other is read, then the same shows are there too', () => {
      const corpus = showsRatedDown('DIY', BELOW_BAR_COUNT, FIRST_ID);

      const grid = showsInGenre(corpus, OTHER_GENRE, genreLayoutOf(corpus));

      expect(namesOf(grid)).toEqual(namesOf(showsInGenre(corpus, 'DIY', genreLayoutOf(corpus))));
    });

    it('given a Drama and DIY show under a Drama layout, when Other is read, then it is there', () => {
      const grid = showsInGenre([handyDrama()], OTHER_GENRE, layoutOf(['Drama']));

      expect(namesOf(grid)).toEqual(['Handy']);
    });

    it('given a Drama and DIY show under a Drama layout, when Drama is read, then it is there as well', () => {
      const grid = showsInGenre([handyDrama()], 'Drama', layoutOf(['Drama']));

      expect(namesOf(grid)).toEqual(['Handy']);
    });
  });

  describe('when every genre the show lists has a row', () => {
    it('given a Drama and DIY show under a layout with both, when Other is read, then it is left out', () => {
      const grid = showsInGenre([handyDrama()], OTHER_GENRE, layoutOf(['Drama', 'DIY']));

      expect(grid).toEqual([]);
    });

    it('given a Drama show under a Drama layout, when Other is read, then it is left out', () => {
      const shows = [aShow({ id: 1, genres: ['Drama'] })];

      expect(showsInGenre(shows, OTHER_GENRE, layoutOf(['Drama']))).toEqual([]);
    });
  });

  describe('when the layout is empty', () => {
    it('given a Drama show and an empty layout, when Other is read, then it is there', () => {
      const shows = [aShow({ id: 1, name: 'Alone', genres: ['Drama'] })];

      expect(namesOf(showsInGenre(shows, OTHER_GENRE, EMPTY_LAYOUT))).toEqual(['Alone']);
    });

    it('given a Drama show and an empty layout, when Drama is read, then it is still listed', () => {
      const shows = [aShow({ id: 1, name: 'Alone', genres: ['Drama'] })];

      expect(namesOf(showsInGenre(shows, 'Drama', EMPTY_LAYOUT))).toEqual(['Alone']);
    });
  });

  describe('when the grid has to match the row', () => {
    it('given 30 Drama shows, when the row and the grid are compared, then the row is its first 25', () => {
      const corpus = showsRatedDown('Drama', SHOWS_OVER_A_ROW, FIRST_ID);
      const layout = genreLayoutOf(corpus);

      const rows = groupByGenre(corpus, layout, ROW_SHOW_LIMIT);
      const grid = showsInGenre(corpus, 'Drama', layout);

      expect(showNamesIn(rows, 'Drama')).toEqual(namesOf(grid).slice(0, ROW_SHOW_LIMIT));
    });

    it('given two genres under the bar, when the Other row and grid are compared, then they agree', () => {
      const corpus = [
        ...showsRatedDown('DIY', BELOW_BAR_COUNT, FIRST_ID),
        ...showsRatedDown('Food', BELOW_BAR_COUNT, FIRST_FOOD_ID),
      ];
      const layout = genreLayoutOf(corpus);

      const rows = groupByGenre(corpus, layout, ROW_SHOW_LIMIT);
      const grid = showsInGenre(corpus, OTHER_GENRE, layout);

      expect(showNamesIn(rows, OTHER_GENRE)).toEqual(namesOf(grid).slice(0, ROW_SHOW_LIMIT));
    });
  });
});
