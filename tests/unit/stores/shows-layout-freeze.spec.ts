import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type Genre, type GenreRow, OTHER_GENRE, ROW_MIN_SHOWS } from '@/domain/genre';
import type { Show } from '@/domain/show';
import { useShowsStore } from '@/stores/shows';
import { GENRE_CACHE_KEY } from '@/stores/shows-cache';
import {
  activateBackgroundPinia,
  comedyIds,
  comedyPromotedOnPageOne,
  COMEDY_UNDER_THE_BAR,
  DRAMA_AT_THE_BAR,
  dramaOverThinComedy,
  notFound,
  pageOf,
  type PageResponder,
  PROMOTING_COMEDY_ID,
  releaseTimers,
  serveIndexPages,
  settleFirstBackgroundPage,
  showsListing,
  type ShowsStore,
  storeWithFirstPage,
} from './background-harness';

const PAGE_ZERO = '0';
const PAGE_ONE = '1';
const MORE_DRAMA_ID = 400;
const MORE_DRAMA_COUNT = 2;
const THIN_HORROR_ID = 500;
const WIDENED_DRAMA_COUNT = ROW_MIN_SHOWS + MORE_DRAMA_COUNT;
const THIN_HORROR_COUNT = 1;
/** The thin Comedy shows plus the one Horror show a later page adds to them. */
const GROWN_OTHER_COUNT = COMEDY_UNDER_THE_BAR.length + THIN_HORROR_COUNT;
/** The genres the last visit left for this one's placeholder rows; neither page carries Horror. */
const REMEMBERED_GENRES: readonly Genre[] = ['Drama', 'Horror'];
/** What the rows name once the pin is gone and the promotion has landed. */
const GENRES_AFTER_PROMOTION: readonly Genre[] = ['Drama', 'Comedy'];

const THIN_PAGE_ZERO = [...DRAMA_AT_THE_BAR, ...COMEDY_UNDER_THE_BAR];

/** Page 1 widens a row that already exists rather than promoting anything. */
const moreDramaOnPageOne: PageResponder = (page) => {
  if (page === PAGE_ZERO) {
    return pageOf(THIN_PAGE_ZERO);
  }

  if (page === PAGE_ONE) {
    return pageOf(showsListing(['Drama'], MORE_DRAMA_COUNT, MORE_DRAMA_ID));
  }

  return notFound();
};

/** Page 1 brings one show of a genre far under the bar, so only `Other` can hold it. */
const thinHorrorOnPageOne: PageResponder = (page) => {
  if (page === PAGE_ZERO) {
    return pageOf(THIN_PAGE_ZERO);
  }

  if (page === PAGE_ONE) {
    return pageOf(showsListing(['Horror'], 1, THIN_HORROR_ID));
  }

  return notFound();
};

const rowGenres = (rows: readonly GenreRow[]): readonly Genre[] => rows.map((row) => row.genre);

const idsOf = (shows: readonly Show[]): readonly number[] => shows.map((show) => show.id);

function showCountIn(rows: readonly GenreRow[], genre: Genre): number {
  const row = rows.find((candidate) => candidate.genre === genre);

  return row === undefined ? 0 : row.shows.length;
}

/** The raw stored value, so a write under the pin is visible whatever shape it has. */
const storedGenres = (): unknown => JSON.parse(localStorage.getItem(GENRE_CACHE_KEY) ?? 'null');

const seedGenreCache = (genres: readonly Genre[]): void =>
  localStorage.setItem(GENRE_CACHE_KEY, JSON.stringify(genres));

/** A dashboard on page 0 with the `Other` grid open: the promotion set is held still. */
async function frozenStoreWithFirstPage(respond: PageResponder): Promise<ShowsStore> {
  const { store } = await storeWithFirstPage(respond);

  store.setGenreLayoutFrozen(true);

  return store;
}

/**
 * The `Other` grid opens over the last visit's placeholder rows, before this visit's index has
 * landed: the pin is taken on the first page, and every page after it lands under the pin.
 */
async function frozenStoreOverRememberedGenres(respond: PageResponder): Promise<ShowsStore> {
  seedGenreCache(REMEMBERED_GENRES);
  serveIndexPages(respond);
  const store = useShowsStore();

  store.setGenreLayoutFrozen(true);
  await store.loadIndex();

  return store;
}

beforeEach(activateBackgroundPinia);

afterEach(releaseTimers);

describe('useShowsStore', () => {
  describe('when a page promotes a genre while the layout is frozen', () => {
    it('given a frozen layout, when the promoting page lands, then no Comedy row appears', async () => {
      const store = await frozenStoreWithFirstPage(comedyPromotedOnPageOne);

      await settleFirstBackgroundPage();

      expect(rowGenres(store.byGenre)).toEqual(['Drama', OTHER_GENRE]);
    });

    it('given a frozen layout, when the promoting page lands, then Other keeps the Comedy shows', async () => {
      const store = await frozenStoreWithFirstPage(comedyPromotedOnPageOne);

      await settleFirstBackgroundPage();

      expect(idsOf(store.genreShows(OTHER_GENRE))).toContain(PROMOTING_COMEDY_ID);
    });

    it('given a frozen layout, when the promoting page lands, then the Other row grows by it', async () => {
      const store = await frozenStoreWithFirstPage(comedyPromotedOnPageOne);

      await settleFirstBackgroundPage();

      expect(showCountIn(store.byGenre, OTHER_GENRE)).toBe(ROW_MIN_SHOWS);
    });

    it('given a frozen layout, when the layout is released, then the Comedy row appears', async () => {
      const store = await frozenStoreWithFirstPage(comedyPromotedOnPageOne);
      await settleFirstBackgroundPage();

      store.setGenreLayoutFrozen(false);

      expect(rowGenres(store.byGenre)).toEqual(['Drama', 'Comedy']);
    });

    it('given a frozen layout, when the layout is released, then Other gives up its shows', async () => {
      const store = await frozenStoreWithFirstPage(comedyPromotedOnPageOne);
      await settleFirstBackgroundPage();

      store.setGenreLayoutFrozen(false);

      expect(store.genreShows(OTHER_GENRE)).toEqual([]);
    });

    it('given a layout frozen twice, when the second freeze runs, then the first pin still holds', async () => {
      const store = await frozenStoreWithFirstPage(comedyPromotedOnPageOne);
      await settleFirstBackgroundPage();

      store.setGenreLayoutFrozen(true);

      expect(rowGenres(store.byGenre)).toEqual(['Drama', OTHER_GENRE]);
    });
  });

  describe('when the corpus grows under a frozen layout', () => {
    it('given a frozen layout, when more Drama lands, then the Drama row widens', async () => {
      const store = await frozenStoreWithFirstPage(moreDramaOnPageOne);

      await settleFirstBackgroundPage();

      expect(showCountIn(store.byGenre, 'Drama')).toBe(WIDENED_DRAMA_COUNT);
    });

    it('given a frozen layout, when a thin Horror show lands, then the Other row grows', async () => {
      const store = await frozenStoreWithFirstPage(thinHorrorOnPageOne);

      await settleFirstBackgroundPage();

      expect(showCountIn(store.byGenre, OTHER_GENRE)).toBe(GROWN_OTHER_COUNT);
    });

    it('given a frozen layout, when a thin Horror show lands, then Other lists it', async () => {
      const store = await frozenStoreWithFirstPage(thinHorrorOnPageOne);

      await settleFirstBackgroundPage();

      expect(idsOf(store.genreShows(OTHER_GENRE))).toContain(THIN_HORROR_ID);
    });
  });

  describe('when the layout is frozen before any page has landed', () => {
    it('given a freeze on a cold start, when page 0 lands, then the rows are its own genres', async () => {
      serveIndexPages(dramaOverThinComedy);
      const store = useShowsStore();

      store.setGenreLayoutFrozen(true);
      await store.loadIndex();

      expect(rowGenres(store.byGenre)).toEqual(['Drama', OTHER_GENRE]);
    });

    it('given a freeze on a cold start, when page 0 lands, then the Drama row holds its shows', async () => {
      serveIndexPages(dramaOverThinComedy);
      const store = useShowsStore();

      store.setGenreLayoutFrozen(true);
      await store.loadIndex();

      expect(showCountIn(store.byGenre, 'Drama')).toBe(ROW_MIN_SHOWS);
    });
  });

  describe('when the layout is released without a freeze', () => {
    it('given a store nobody froze, when released, then a later promotion still lands', async () => {
      const { store } = await storeWithFirstPage(comedyPromotedOnPageOne);

      store.setGenreLayoutFrozen(false);
      await settleFirstBackgroundPage();

      expect(rowGenres(store.byGenre)).toEqual(['Drama', 'Comedy']);
    });

    it('given a store nobody froze, when released, then the thin Comedy shows stay in Other', async () => {
      const { store } = await storeWithFirstPage(dramaOverThinComedy);

      store.setGenreLayoutFrozen(false);

      expect(idsOf(store.genreShows(OTHER_GENRE))).toEqual(comedyIds());
    });
  });

  describe('when a page lands under a layout frozen before the index', () => {
    it('given the genres the last visit left, when the promoting page lands, then they still stand', async () => {
      await frozenStoreOverRememberedGenres(comedyPromotedOnPageOne);

      await settleFirstBackgroundPage();

      expect(storedGenres()).toEqual(REMEMBERED_GENRES);
    });

    it('given the genres the last visit left, when the pin is released, then the promotion joins them', async () => {
      const store = await frozenStoreOverRememberedGenres(comedyPromotedOnPageOne);
      await settleFirstBackgroundPage();

      store.setGenreLayoutFrozen(false);

      expect(storedGenres()).toEqual(GENRES_AFTER_PROMOTION);
    });
  });
});
