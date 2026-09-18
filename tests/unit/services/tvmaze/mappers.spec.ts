import { describe, expect, it } from 'vitest';
import { mapShow, mapShowDetail } from '@/services/tvmaze/mappers';
import { showListItemSchema, showSchema } from '@/services/tvmaze/schema';
import searchFleabagResults from '../../../resources/search-fleabag.2026-09-16.json';
import breakingBadShow from '../../../resources/show-169.2026-09-16.json';

const fleabagShow = searchFleabagResults[0]!.show;
const fleabagMonkeyfaceShow = searchFleabagResults[1]!.show;

const BREAKING_BAD_MEDIUM_URL =
  'https://static.tvmaze.com/uploads/images/medium_portrait/501/1253519.jpg';
const BREAKING_BAD_ORIGINAL_URL =
  'https://static.tvmaze.com/uploads/images/original_untouched/501/1253519.jpg';

/** A card loads the medium image alone; the detail page is the only view with the original. */
const BREAKING_BAD_CARD_POSTER = { medium: BREAKING_BAD_MEDIUM_URL };
const BREAKING_BAD_DETAIL_POSTER = {
  medium: BREAKING_BAD_MEDIUM_URL,
  original: BREAKING_BAD_ORIGINAL_URL,
};

const breakingBadListItem = () => showListItemSchema.parse(breakingBadShow);
const breakingBadDto = () => showSchema.parse(breakingBadShow);
const fleabagDto = () => showSchema.parse(fleabagShow);

describe('mapShow', () => {
  describe('when the list item is fully populated', () => {
    it('given the captured Breaking Bad payload, when mapped, then every list field is filled', () => {
      const show = mapShow(breakingBadListItem());

      expect(show).toEqual({
        id: 169,
        name: 'Breaking Bad',
        genres: ['Drama', 'Crime', 'Thriller'],
        rating: 9.2,
        poster: BREAKING_BAD_CARD_POSTER,
        premiered: '2008-01-20',
      });
    });

    it('given the captured Breaking Bad payload, when mapped, then the poster is the card image', () => {
      expect(mapShow(breakingBadListItem()).poster).not.toHaveProperty('original');
    });

    it('given the captured Breaking Bad payload, when mapped, then no detail field comes along', () => {
      expect(mapShow(breakingBadListItem())).not.toHaveProperty('summaryHtml');
    });
  });

  describe('when the show has no image', () => {
    it('given a null image, when mapped, then the poster is null', () => {
      const listItem = showListItemSchema.parse({ ...breakingBadShow, image: null });

      expect(mapShow(listItem).poster).toBeNull();
    });
  });

  describe('when the show is unrated', () => {
    it('given a null rating average, when mapped, then the rating is null', () => {
      const listItem = showListItemSchema.parse({ ...breakingBadShow, rating: { average: null } });

      expect(mapShow(listItem).rating).toBeNull();
    });
  });

  describe('when the show never premiered', () => {
    it('given a null premiere date, when mapped, then the premiere is null', () => {
      const listItem = showListItemSchema.parse({ ...breakingBadShow, premiered: null });

      expect(mapShow(listItem).premiered).toBeNull();
    });
  });

  describe('when the show has no genres', () => {
    it('given an empty genre list, when mapped, then the list stays empty', () => {
      const listItem = showListItemSchema.parse({ ...breakingBadShow, genres: [] });

      expect(mapShow(listItem).genres).toEqual([]);
    });
  });
});

describe('mapShowDetail', () => {
  describe('when the show is fully populated', () => {
    it('given the captured Breaking Bad payload, when mapped, then every domain field is filled', () => {
      const show = mapShowDetail(breakingBadDto());

      expect(show).toEqual({
        id: 169,
        name: 'Breaking Bad',
        genres: ['Drama', 'Crime', 'Thriller'],
        rating: 9.2,
        poster: BREAKING_BAD_DETAIL_POSTER,
        premiered: '2008-01-20',
        summaryHtml: breakingBadShow.summary,
        ended: '2019-10-11',
        status: 'Ended',
        language: 'English',
        runtimeMinutes: 60,
        network: { name: 'AMC', kind: 'network' },
        schedule: { time: '22:00', days: ['Sunday'] },
        url: 'https://www.tvmaze.com/shows/169/breaking-bad',
      });
    });

    it('given the captured Breaking Bad payload, when mapped, then the poster carries both urls', () => {
      expect(mapShowDetail(breakingBadDto()).poster).toEqual(BREAKING_BAD_DETAIL_POSTER);
    });
  });

  describe('when the show has no image', () => {
    it('given a null image, when mapped, then the poster is null', () => {
      const dto = showSchema.parse({ ...breakingBadShow, image: null });

      expect(mapShowDetail(dto).poster).toBeNull();
    });
  });

  describe('when the show has no summary', () => {
    it('given a null summary, when mapped, then the summary html is null', () => {
      const dto = showSchema.parse({ ...breakingBadShow, summary: null });

      expect(mapShowDetail(dto).summaryHtml).toBeNull();
    });
  });

  describe('when the show is still running', () => {
    it('given a null end date, when mapped, then the end date is null', () => {
      const dto = showSchema.parse({ ...breakingBadShow, ended: null, status: 'Running' });

      expect(mapShowDetail(dto).ended).toBeNull();
    });
  });

  describe('when the show runs on a web channel only', () => {
    it('given Fleabag on BBC Three, when mapped, then the network is the web channel', () => {
      const show = mapShowDetail(fleabagDto());

      expect(show.network).toEqual({ name: 'BBC Three', kind: 'web-channel' });
    });
  });

  describe('when the show has both a network and a web channel', () => {
    it('given both, when mapped, then the broadcast network wins', () => {
      const dto = showSchema.parse({ ...fleabagShow, network: { name: 'BBC One' } });

      expect(mapShowDetail(dto).network).toEqual({ name: 'BBC One', kind: 'network' });
    });
  });

  describe('when the show has neither a network nor a web channel', () => {
    it('given both null, when mapped, then the network is null', () => {
      const dto = showSchema.parse({ ...breakingBadShow, network: null, webChannel: null });

      expect(mapShowDetail(dto).network).toBeNull();
    });
  });

  describe('when the show has no runtime', () => {
    it('given a null runtime and an average of 30, when mapped, then the average runtime is used', () => {
      const show = mapShowDetail(fleabagDto());

      expect(show.runtimeMinutes).toBe(30);
    });

    it('given both runtimes null, when mapped, then the runtime is null', () => {
      const dto = showSchema.parse(fleabagMonkeyfaceShow);

      expect(mapShowDetail(dto).runtimeMinutes).toBeNull();
    });
  });

  describe('when the show is scheduled', () => {
    it('given a weekly slot, when mapped, then the time and days are carried over', () => {
      const show = mapShowDetail(fleabagDto());

      expect(show.schedule).toEqual({ time: '10:00', days: ['Monday'] });
    });
  });
});
