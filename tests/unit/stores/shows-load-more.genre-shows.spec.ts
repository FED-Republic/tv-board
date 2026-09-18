import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Genre, GenreRow } from '@/domain/genre';
import { ROW_SHOW_LIMIT } from '@/domain/genre';
import type { Show } from '@/domain/show';
import {
  activateBackgroundPinia,
  genrePage,
  notFound,
  type PageResponder,
  releaseTimers,
  storeWithFirstPage,
} from './background-harness';

const PAGE_ZERO = '0';
const DRAMA_SHOW_COUNT = 40;
const FIRST_DRAMA_ID = 9000;

/** One page of more Drama shows than a row holds, and nothing past it. */
const oneDramaPage: PageResponder = (page) =>
  page === PAGE_ZERO ? genrePage('Drama', DRAMA_SHOW_COUNT, FIRST_DRAMA_ID) : notFound();

const namesOf = (shows: readonly Show[]): readonly string[] => shows.map((show) => show.name);

function rowShowCount(rows: readonly GenreRow[], genre: Genre): number {
  const row = rows.find((candidate) => candidate.genre === genre);

  return row === undefined ? 0 : row.shows.length;
}

beforeEach(activateBackgroundPinia);

afterEach(releaseTimers);

describe('useShowsStore', () => {
  describe('when the genre grid reads the shows it pages through', () => {
    it('given 40 Drama shows loaded, when the genre is read, then it holds every one of them', async () => {
      const { store } = await storeWithFirstPage(oneDramaPage);

      expect(store.genreShows('Drama')).toHaveLength(DRAMA_SHOW_COUNT);
    });

    it('given 40 Drama shows loaded, when the row is read, then it stops at the row limit', async () => {
      const { store } = await storeWithFirstPage(oneDramaPage);

      expect(rowShowCount(store.byGenre, 'Drama')).toBe(ROW_SHOW_LIMIT);
    });

    it('given 40 Drama shows loaded, when the genre is read, then the best rated comes first', async () => {
      const { store } = await storeWithFirstPage(oneDramaPage);

      expect(namesOf(store.genreShows('Drama'))[0]).toBe('Drama 1');
    });

    it('given a genre nothing was loaded for, when it is read, then the result is empty', async () => {
      const { store } = await storeWithFirstPage(oneDramaPage);

      expect(store.genreShows('Western')).toEqual([]);
    });
  });
});
