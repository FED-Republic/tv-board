import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type Genre, type GenreRow, OTHER_GENRE, ROW_MIN_SHOWS } from '@/domain/genre';
import type { Show, ShowId } from '@/domain/show';
import { toShowId } from '@/domain/show';
import { useShowsStore } from '@/stores/shows';
import {
  activateBackgroundPinia,
  dramaAlone,
  releaseTimers,
  showListing,
  storeWithFirstPage,
} from './background-harness';
import { server } from '../../msw/server';

const SHOW_URL = 'https://api.tvmaze.com/shows/:id';
/** An id no index page in this spec carries, so `ensureShows` has to fetch it. */
const MERGED_SHOW_ID = 1000;
/** Enough ids to carry a genre the index never had over the bar in one batch. */
const MERGED_SHOW_IDS: readonly ShowId[] = Array.from({ length: ROW_MIN_SHOWS }, (_unused, index) =>
  toShowId(MERGED_SHOW_ID + index),
);

/** Every requested id answers as a show of that genre, whatever the index holds. */
function serveShowsOf(genre: Genre): void {
  server.use(
    http.get(SHOW_URL, ({ params }) => {
      const id = Number(String(params['id']));

      return HttpResponse.json(showListing([genre], id));
    }),
  );
}

const genresOfShows = (shows: readonly Show[]): readonly string[] =>
  shows.flatMap((show) => show.genres);

function idsIn(rows: readonly GenreRow[], genre: Genre): readonly number[] {
  const row = rows.find((candidate) => candidate.genre === genre);

  return row === undefined ? [] : row.shows.map((show) => show.id);
}

beforeEach(activateBackgroundPinia);

afterEach(releaseTimers);

describe('useShowsStore', () => {
  describe('when a show is merged before the dashboard has loaded', () => {
    it('given a pending index, when a Drama show is fetched, then it carries its genre', async () => {
      serveShowsOf('Drama');
      const store = useShowsStore();

      const merged = await store.ensureShows([toShowId(MERGED_SHOW_ID)]);

      expect(genresOfShows(merged)).toEqual(['Drama']);
    });

    it('given a pending index, when a Drama show is merged, then no genre becomes known', async () => {
      serveShowsOf('Drama');
      const store = useShowsStore();

      await store.ensureShows([toShowId(MERGED_SHOW_ID)]);

      expect(store.knownGenres).toEqual([]);
    });
  });

  describe('when merged shows carry a genre the index never had', () => {
    it('given page 0 loaded, when a genre of Western shows is merged, then Western becomes known', async () => {
      serveShowsOf('Western');
      const { store } = await storeWithFirstPage(dramaAlone);

      await store.ensureShows(MERGED_SHOW_IDS);

      expect(store.knownGenres).toContain('Western');
    });

    it('given page 0 loaded, when one Western show is merged, then Western stays unknown', async () => {
      serveShowsOf('Western');
      const { store } = await storeWithFirstPage(dramaAlone);

      await store.ensureShows([toShowId(MERGED_SHOW_ID)]);

      expect(store.knownGenres).not.toContain('Western');
    });

    it('given page 0 loaded, when one Western show is merged, then it joins the Other row', async () => {
      serveShowsOf('Western');
      const { store } = await storeWithFirstPage(dramaAlone);

      await store.ensureShows([toShowId(MERGED_SHOW_ID)]);

      expect(idsIn(store.byGenre, OTHER_GENRE)).toEqual([MERGED_SHOW_ID]);
    });
  });
});
