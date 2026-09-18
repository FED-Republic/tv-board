import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type Genre, type GenreRow, OTHER_GENRE, ROW_MIN_SHOWS } from '@/domain/genre';
import type { Show } from '@/domain/show';
import { GENRE_CACHE_KEY } from '@/stores/shows-cache';
import {
  activateBackgroundPinia,
  comedyIds,
  comedyPromotedOnPageOne,
  COMEDY_UNDER_THE_BAR,
  DRAMA_AT_THE_BAR,
  dramaAlone,
  dramaOverThinComedy,
  FIRST_COMEDY_ID,
  notFound,
  pageOf,
  type PageResponder,
  PROMOTING_COMEDY_ID,
  releaseTimers,
  settleFirstBackgroundPage,
  showsListing,
  storeWithFirstPage,
} from './background-harness';

const PAGE_ZERO = '0';
/** One show short of the bar: enough for the reader to see, too few for a row of its own. */
const UNDER_THE_BAR_COUNT = ROW_MIN_SHOWS - 1;
const CROSSOVER_ID = 300;
const LONE_SHOW_ID = 400;

/** One show listing a genre that earns a row and one that does not, so it belongs in both. */
const CROSSOVER_SHOW = showsListing(['Drama', 'Comedy'], 1, CROSSOVER_ID);

/** Nothing but a genre under the bar, so `Other` is the only row the dashboard can build. */
const thinComedyAlone: PageResponder = (page) =>
  page === PAGE_ZERO ? pageOf(COMEDY_UNDER_THE_BAR) : notFound();

/** A single show of a genre nothing else carries: the smallest `Other` row there is. */
const oneLoneShow: PageResponder = (page) =>
  page === PAGE_ZERO ? pageOf(showsListing(['Horror'], 1, LONE_SHOW_ID)) : notFound();

/** Drama at the bar plus one show that also lists a Comedy nothing else carries. */
const dramaWithACrossover: PageResponder = (page) =>
  page === PAGE_ZERO ? pageOf([...DRAMA_AT_THE_BAR, ...CROSSOVER_SHOW]) : notFound();

const rowGenres = (rows: readonly GenreRow[]): readonly Genre[] => rows.map((row) => row.genre);

const idsOf = (shows: readonly Show[]): readonly number[] => shows.map((show) => show.id);

function idsIn(rows: readonly GenreRow[], genre: Genre): readonly number[] {
  const row = rows.find((candidate) => candidate.genre === genre);

  return row === undefined ? [] : idsOf(row.shows);
}

const rememberedGenres = (): unknown => JSON.parse(localStorage.getItem(GENRE_CACHE_KEY) ?? 'null');

beforeEach(activateBackgroundPinia);

afterEach(releaseTimers);

describe('useShowsStore', () => {
  describe('when a genre carries fewer loaded shows than the row minimum', () => {
    it('given Comedy one show short of the bar, when page 0 lands, then it earns no row', async () => {
      const { store } = await storeWithFirstPage(dramaOverThinComedy);

      expect(rowGenres(store.byGenre)).toEqual(['Drama', OTHER_GENRE]);
    });

    it('given Comedy one show short of the bar, when page 0 lands, then its shows are in Other', async () => {
      const { store } = await storeWithFirstPage(dramaOverThinComedy);

      expect(idsIn(store.byGenre, OTHER_GENRE)).toEqual(comedyIds());
    });

    it('given Comedy one show short of the bar, when page 0 lands, then Comedy stays unknown', async () => {
      const { store } = await storeWithFirstPage(dramaOverThinComedy);

      expect(store.knownGenres).not.toContain('Comedy');
    });

    it('given Comedy one show short of the bar, when page 0 lands, then it reaches no genre cache', async () => {
      await storeWithFirstPage(dramaOverThinComedy);

      expect(rememberedGenres()).not.toContain('Comedy');
    });

    it('given nothing but a thin Comedy, when page 0 lands, then Other is the only row', async () => {
      const { store } = await storeWithFirstPage(thinComedyAlone);

      expect(rowGenres(store.byGenre)).toEqual([OTHER_GENRE]);
    });

    it('given nothing but a thin Comedy, when page 0 lands, then Other holds every show', async () => {
      const { store } = await storeWithFirstPage(thinComedyAlone);

      expect(idsIn(store.byGenre, OTHER_GENRE)).toHaveLength(UNDER_THE_BAR_COUNT);
    });
  });

  describe('when Other holds a single show', () => {
    it('given one Horror show, when page 0 lands, then the Other row still renders it', async () => {
      const { store } = await storeWithFirstPage(oneLoneShow);

      expect(idsIn(store.byGenre, OTHER_GENRE)).toEqual([LONE_SHOW_ID]);
    });
  });

  describe('when every loaded show carries a genre at the bar', () => {
    it('given Drama alone at the bar, when page 0 lands, then Drama is the only row', async () => {
      const { store } = await storeWithFirstPage(dramaAlone);

      expect(rowGenres(store.byGenre)).toEqual(['Drama']);
    });
  });

  describe('when a show lists a genre at the bar and one under it', () => {
    it('given a Drama and Comedy show, when page 0 lands, then it joins the Drama row', async () => {
      const { store } = await storeWithFirstPage(dramaWithACrossover);

      expect(idsIn(store.byGenre, 'Drama')).toContain(CROSSOVER_ID);
    });

    it('given a Drama and Comedy show, when page 0 lands, then it joins Other as well', async () => {
      const { store } = await storeWithFirstPage(dramaWithACrossover);

      expect(idsIn(store.byGenre, OTHER_GENRE)).toEqual([CROSSOVER_ID]);
    });
  });

  describe('when a background page carries a genre over the bar', () => {
    it('given a thin Comedy, when the page that promotes it lands, then it earns a row', async () => {
      const { store } = await storeWithFirstPage(comedyPromotedOnPageOne);

      await settleFirstBackgroundPage();

      expect(rowGenres(store.byGenre)).toEqual(['Drama', 'Comedy']);
    });

    it('given a thin Comedy, when the page that promotes it lands, then its row holds every show', async () => {
      const { store } = await storeWithFirstPage(comedyPromotedOnPageOne);

      await settleFirstBackgroundPage();

      expect(idsIn(store.byGenre, 'Comedy')).toHaveLength(ROW_MIN_SHOWS);
    });

    it('given a thin Comedy, when the page that promotes it lands, then Other loses its shows', async () => {
      const { store } = await storeWithFirstPage(comedyPromotedOnPageOne);

      await settleFirstBackgroundPage();

      expect(idsIn(store.byGenre, OTHER_GENRE)).toEqual([]);
    });

    it('given a thin Comedy, when the page that promotes it lands, then Comedy becomes known', async () => {
      const { store } = await storeWithFirstPage(comedyPromotedOnPageOne);

      await settleFirstBackgroundPage();

      expect(store.knownGenres).toContain('Comedy');
    });

    it('given a thin Comedy, when the page that promotes it lands, then the genre cache holds it', async () => {
      await storeWithFirstPage(comedyPromotedOnPageOne);

      await settleFirstBackgroundPage();

      expect(rememberedGenres()).toContain('Comedy');
    });
  });

  describe('when the genre grid reads a genre under the bar', () => {
    it('given a thin Comedy, when its shows are read, then every loaded one comes back', async () => {
      const { store } = await storeWithFirstPage(dramaOverThinComedy);

      expect(idsOf(store.genreShows('Comedy'))).toEqual(comedyIds());
    });

    it('given a thin Comedy, when Other is read, then the same shows come back', async () => {
      const { store } = await storeWithFirstPage(dramaOverThinComedy);

      expect(idsOf(store.genreShows(OTHER_GENRE))).toEqual(comedyIds());
    });

    it('given a thin Comedy, when Drama is read, then the Comedy shows are not in it', async () => {
      const { store } = await storeWithFirstPage(dramaOverThinComedy);

      expect(idsOf(store.genreShows('Drama'))).not.toContain(FIRST_COMEDY_ID);
    });

    it('given a promoted Comedy, when Other is read, then its shows have left it', async () => {
      const { store } = await storeWithFirstPage(comedyPromotedOnPageOne);

      await settleFirstBackgroundPage();

      expect(store.genreShows(OTHER_GENRE)).toEqual([]);
    });

    it('given a promoted Comedy, when its shows are read, then the promoting show is there', async () => {
      const { store } = await storeWithFirstPage(comedyPromotedOnPageOne);

      await settleFirstBackgroundPage();

      expect(idsOf(store.genreShows('Comedy'))).toContain(PROMOTING_COMEDY_ID);
    });
  });
});
