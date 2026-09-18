import { describe, expect, it } from 'vitest';
import {
  GENRES,
  OTHER_GENRE,
  ROW_MIN_SHOWS,
  genreLayoutOf,
  hasGenre,
  isGenre,
  revealTargetOf,
  sortByRating,
} from '@/domain/genre';
import type { Show } from '@/domain/show';
import { aShow } from '../components/builders';
import { aRow, showsListing } from './genre-harness';

const EXPECTED_GENRE_ORDER =
  'Drama,Comedy,Action,Adventure,Science-Fiction,Fantasy,Horror,Thriller,Crime,Mystery,Romance,Family,Children,Anime,Music,Sports,War,Western,History,Legal,Medical,Espionage,Supernatural,Nature,Food,Travel,DIY,Adult';

const namesOf = (shows: readonly Show[]): readonly string[] => shows.map((show) => show.name);

describe('GENRES', () => {
  describe('when the closed set is read', () => {
    it('given the tuple, when joined, then it lists the genres in the agreed order', () => {
      expect(GENRES.join(',')).toBe(EXPECTED_GENRE_ORDER);
    });

    it('given the tuple, when deduplicated, then no genre appears twice', () => {
      expect(new Set(GENRES).size).toBe(GENRES.length);
    });

    it('given the fallback genre, when read, then it is Other', () => {
      expect(OTHER_GENRE).toBe('Other');
    });

    it('given the fallback genre, when looked up in the tuple, then it is not a member', () => {
      expect(GENRES).not.toContain(OTHER_GENRE);
    });
  });
});

describe('isGenre', () => {
  describe('when the value is a known genre', () => {
    it('given "Drama", when checked, then it is a genre', () => {
      expect(isGenre('Drama')).toBe(true);
    });

    it('given "Science-Fiction", when checked, then it is a genre', () => {
      expect(isGenre('Science-Fiction')).toBe(true);
    });

    it('given "Other", when checked, then it is a genre', () => {
      expect(isGenre(OTHER_GENRE)).toBe(true);
    });
  });

  describe('when the value is not a known genre', () => {
    it('given "Talk Show", when checked, then it is not a genre', () => {
      expect(isGenre('Talk Show')).toBe(false);
    });

    it('given the lowercase "drama", when checked, then it is not a genre', () => {
      expect(isGenre('drama')).toBe(false);
    });

    it('given null, when checked, then it is not a genre', () => {
      expect(isGenre(null)).toBe(false);
    });
  });
});

describe('sortByRating', () => {
  describe('when the shows carry different ratings', () => {
    it('given three rated shows, when sorted, then the highest rating comes first', () => {
      const shows = [
        aShow({ id: 1, name: 'Middle', rating: 8 }),
        aShow({ id: 2, name: 'Best', rating: 9.3 }),
        aShow({ id: 3, name: 'Worst', rating: 6.1 }),
      ];

      expect(namesOf(sortByRating(shows))).toEqual(['Best', 'Middle', 'Worst']);
    });

    it('given an unrated show among rated ones, when sorted, then the unrated show is last', () => {
      const shows = [
        aShow({ id: 1, name: 'Unrated', rating: null }),
        aShow({ id: 2, name: 'Rated', rating: 6.1 }),
      ];

      expect(namesOf(sortByRating(shows))).toEqual(['Rated', 'Unrated']);
    });
  });

  describe('when the shows tie', () => {
    it('given an equal rating, when sorted, then the lower id comes first', () => {
      const shows = [
        aShow({ id: 7, name: 'Later', rating: 8 }),
        aShow({ id: 2, name: 'Earlier', rating: 8 }),
      ];

      expect(namesOf(sortByRating(shows))).toEqual(['Earlier', 'Later']);
    });

    it('given three shows at one rating, when sorted, then the ids climb', () => {
      const shows = [
        aShow({ id: 30, name: 'Third', rating: 8 }),
        aShow({ id: 4, name: 'First', rating: 8 }),
        aShow({ id: 11, name: 'Second', rating: 8 }),
      ];

      expect(namesOf(sortByRating(shows))).toEqual(['First', 'Second', 'Third']);
    });

    it('given two unrated shows, when sorted, then the lower id comes first', () => {
      const shows = [
        aShow({ id: 2, name: 'Later', rating: null }),
        aShow({ id: 1, name: 'Earlier', rating: null }),
      ];

      expect(namesOf(sortByRating(shows))).toEqual(['Earlier', 'Later']);
    });
  });

  describe('when the caller keeps the input', () => {
    it('given a list, when sorted, then the input keeps its original order', () => {
      const shows = [
        aShow({ id: 1, name: 'Low', rating: 6 }),
        aShow({ id: 2, name: 'High', rating: 9 }),
      ];

      sortByRating(shows);

      expect(namesOf(shows)).toEqual(['Low', 'High']);
    });

    it('given a list, when sorted, then a new array is returned', () => {
      const shows = [aShow({ id: 1, rating: 6 })];

      expect(sortByRating(shows)).not.toBe(shows);
    });

    it('given no shows, when sorted, then the result is empty', () => {
      expect(sortByRating([])).toEqual([]);
    });
  });
});

describe('hasGenre', () => {
  describe('when the show lists known genres', () => {
    it('given a Drama show, when asked for Drama, then it has the genre', () => {
      expect(hasGenre(aShow({ id: 1, genres: ['Drama'] }), 'Drama')).toBe(true);
    });

    it('given a Drama show, when asked for Comedy, then it does not have the genre', () => {
      expect(hasGenre(aShow({ id: 1, genres: ['Drama'] }), 'Comedy')).toBe(false);
    });

    it('given a show with two genres, when asked for the second, then it has the genre', () => {
      expect(hasGenre(aShow({ id: 1, genres: ['Drama', 'Crime'] }), 'Crime')).toBe(true);
    });

    it('given a Drama show, when asked for Other, then it is not in the fallback', () => {
      expect(hasGenre(aShow({ id: 1, genres: ['Drama'] }), OTHER_GENRE)).toBe(false);
    });

    it('given a known and an unknown genre, when asked for Other, then it is not in the fallback', () => {
      expect(hasGenre(aShow({ id: 1, genres: ['Drama', 'Talk Show'] }), OTHER_GENRE)).toBe(false);
    });
  });

  describe('when the show has no known genre', () => {
    it('given no genres, when asked for Other, then it is in the fallback', () => {
      expect(hasGenre(aShow({ id: 1, genres: [] }), OTHER_GENRE)).toBe(true);
    });

    it('given only an unknown genre, when asked for Other, then it is in the fallback', () => {
      expect(hasGenre(aShow({ id: 1, genres: ['Talk Show'] }), OTHER_GENRE)).toBe(true);
    });

    it('given only an unknown genre, when asked for Drama, then it does not have the genre', () => {
      expect(hasGenre(aShow({ id: 1, genres: ['Talk Show'] }), 'Drama')).toBe(false);
    });

    it('given no genres, when asked for Drama, then it does not have the genre', () => {
      expect(hasGenre(aShow({ id: 1, genres: [] }), 'Drama')).toBe(false);
    });

    it('given the literal genre "Other", when asked for Other, then it is in the fallback', () => {
      expect(hasGenre(aShow({ id: 1, genres: [OTHER_GENRE] }), OTHER_GENRE)).toBe(true);
    });
  });
});

const BELOW_BAR_COUNT = ROW_MIN_SHOWS - 1;
const FIRST_FILLER_ID = 2;
const HANDY_SHOW = aShow({ id: 1, name: 'Handy', genres: ['DIY'] });

/** A corpus where DIY stays one show short of a row of its own. */
const diyUnderTheBar = (): readonly Show[] => [
  HANDY_SHOW,
  ...showsListing(['DIY'], BELOW_BAR_COUNT - 1, FIRST_FILLER_ID),
];

describe('hasGenre in a corpus', () => {
  describe('when the genre is under the row bar', () => {
    it('given four DIY shows, when the layout is read, then DIY earns no row', () => {
      expect(genreLayoutOf(diyUnderTheBar()).has('DIY')).toBe(false);
    });

    it('given a DIY show, when it is asked for DIY, then it has the genre whatever the bar says', () => {
      expect(hasGenre(HANDY_SHOW, 'DIY')).toBe(true);
    });

    it('given a DIY show, when it is asked for Other, then it is not in the fallback', () => {
      expect(hasGenre(HANDY_SHOW, OTHER_GENRE)).toBe(false);
    });
  });
});

describe('revealTargetOf', () => {
  describe('when the rows hold the closing genre', () => {
    it('given a Drama and a Comedy row, when the Comedy grid closes, then Comedy is revealed', () => {
      expect(revealTargetOf([aRow('Drama'), aRow('Comedy')], 'Comedy')).toBe('Comedy');
    });

    it('given rows ending in Other, when the Other grid closes, then Other is revealed', () => {
      expect(revealTargetOf([aRow('Drama'), aRow(OTHER_GENRE)], OTHER_GENRE)).toBe(OTHER_GENRE);
    });
  });

  describe('when the closing genre has no row', () => {
    it('given rows with Other but no DIY row, when the DIY grid closes, then Other is revealed', () => {
      expect(revealTargetOf([aRow('Drama'), aRow(OTHER_GENRE)], 'DIY')).toBe(OTHER_GENRE);
    });

    it('given rows with neither DIY nor Other, when the DIY grid closes, then the first row is revealed', () => {
      expect(revealTargetOf([aRow('Comedy'), aRow('Crime')], 'DIY')).toBe('Comedy');
    });

    it('given rows without Other, when the Other grid closes, then the first row is revealed', () => {
      expect(revealTargetOf([aRow('Drama'), aRow('Comedy')], OTHER_GENRE)).toBe('Drama');
    });
  });

  describe('when there are no rows', () => {
    it('given no rows, when a grid closes, then nothing is revealed', () => {
      expect(revealTargetOf([], 'Drama')).toBeNull();
    });
  });
});
